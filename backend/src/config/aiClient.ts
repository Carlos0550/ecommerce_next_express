import OpenAI, { APIError } from "openai";
import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import type { ChatCompletion } from "openai/resources/chat/completions";
import { logger } from "@/utils/logger";
import {
  AIError,
  AIAuthError,
  AIForbiddenError,
  AIRateLimitError,
  AIUpstreamError,
  AINetworkError,
  AITimeoutError,
  AIInvalidResponseError,
} from "@/utils/errors";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const ADMIN_PANEL_URL = process.env.ADMINISTRATIVE_PANEL_URL;

if (!OPENROUTER_API_KEY) {
  logger.error("OPENROUTER_API_KEY no está configurada. Las funciones de IA estarán deshabilitadas.", {
    feature: "ai",
  });
} else {
  logger.info("OpenRouter AI configurado", {
    feature: "ai",
    baseURL: "https://openrouter.ai/api/v1",
    referer: ADMIN_PANEL_URL ?? "http://localhost",
  });
}

export const openrouter = new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": ADMIN_PANEL_URL ?? "http://localhost",
    "X-Title": "Cinnamon Admin",
  },
});

export type ChatParams = ChatCompletionCreateParamsNonStreaming;

export interface AIRequestMeta {
  operation: string;
  userId?: string | number;
  businessId?: string | number;
  [k: string]: unknown;
}

function classifyError(err: unknown): {
  class: string;
  status?: number;
  code?: string;
  message: string;
} {
  if (err instanceof APIError) {
    const name = err.constructor.name;
    const status = typeof err.status === "number" ? err.status : undefined;
    let cls = name.replace(/Error$/, "").toLowerCase() || "api";
    if (status === 429) cls = "rate_limit";
    else if (status === 401) cls = "auth";
    else if (status === 403) cls = "forbidden";
    else if (status === 408) cls = "timeout";
    else if (status && status >= 500) cls = "upstream";
    return {
      class: cls,
      status,
      code: (err as unknown as { code?: string }).code,
      message: err.message ?? "OpenAI API error",
    };
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    let cls = "unknown";
    if (msg.includes("timeout") || msg.includes("etimedout")) cls = "timeout";
    else if (
      msg.includes("econnrefused") ||
      msg.includes("enotfound") ||
      msg.includes("network") ||
      msg.includes("fetch failed")
    )
      cls = "network";
    return { class: cls, message: err.message };
  }
  return { class: "unknown", message: String(err) };
}

function asTypedAIError(err: unknown, fallbackMessage = "Error del proveedor de IA"): AIError {
  if (err instanceof AIError) return err;
  const c = classifyError(err);
  const details = { aiErrClass: c.class, aiErrStatus: c.status, aiErrCode: c.code };
  switch (c.class) {
    case "auth":
      return new AIAuthError(fallbackMessage, details);
    case "forbidden":
      return new AIForbiddenError(fallbackMessage, details);
    case "rate_limit":
      return new AIRateLimitError(fallbackMessage, details);
    case "timeout":
      return new AITimeoutError(fallbackMessage, details);
    case "network":
      return new AINetworkError(fallbackMessage, details);
    case "upstream":
      return new AIUpstreamError(fallbackMessage, details);
    default:
      return new AIUpstreamError(fallbackMessage, details);
  }
}

function approxTokensFromMessages(messages: ChatParams["messages"]): number {
  if (!Array.isArray(messages)) return 0;
  let chars = 0;
  for (const m of messages) {
    if (typeof m.content === "string") chars += m.content.length;
    else if (Array.isArray(m.content)) {
      for (const part of m.content) {
        if ("text" in part && typeof part.text === "string") chars += part.text.length;
        else if ("image_url" in part) chars += 4000;
      }
    }
  }
  return Math.ceil(chars / 4);
}

function summarizeMessages(messages: ChatParams["messages"]): Record<string, unknown> {
  if (!Array.isArray(messages)) return { count: 0 };
  const roles: Record<string, number> = {};
  let textChars = 0;
  let imageCount = 0;
  for (const m of messages) {
    roles[m.role] = (roles[m.role] ?? 0) + 1;
    if (typeof m.content === "string") textChars += m.content.length;
    else if (Array.isArray(m.content)) {
      for (const part of m.content) {
        if ("text" in part && typeof part.text === "string") textChars += part.text.length;
        else if ("image_url" in part) imageCount += 1;
      }
    }
  }
  return {
    count: messages.length,
    roles,
    textChars,
    imageCount,
    approxInputTokens: approxTokensFromMessages(messages),
  };
}

export async function aiChatCompletion(
  params: ChatParams,
  meta: AIRequestMeta,
): Promise<ChatCompletion> {
  const start = process.hrtime.bigint();
  const op = meta.operation;
  const baseLog = {
    feature: "ai",
    provider: "openrouter",
    operation: op,
    model: params.model,
    userId: meta.userId,
    businessId: meta.businessId,
    request: {
      temperature: params.temperature,
      max_tokens: params.max_tokens,
      top_p: params.top_p,
      response_format:
        typeof (params as { response_format?: unknown }).response_format === "object"
          ? "json_object"
          : undefined,
      messages: summarizeMessages(params.messages),
    },
  };
  logger.debug("ai.request", baseLog);

  try {
    const response = await openrouter.chat.completions.create(params);
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const choice = response.choices?.[0];
    const usage = response.usage;
    const content = choice?.message?.content ?? "";
    logger.info("ai.response", {
      ...baseLog,
      durationMs: Math.round(durationMs * 100) / 100,
      status: 200,
      finishReason: choice?.finish_reason,
      contentLength: typeof content === "string" ? content.length : 0,
      usage: usage
        ? {
            prompt_tokens: usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            total_tokens: usage.total_tokens,
          }
        : undefined,
      responseId: response.id,
    });
    logger.debug("ai.response.body", {
      ...baseLog,
      contentPreview:
        typeof content === "string"
          ? content.length > 1000
            ? content.slice(0, 1000) + "…"
            : content
          : content,
    });
    return response;
  } catch (err) {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const cls = classifyError(err);
    logger.warn("ai.response.error", {
      ...baseLog,
      durationMs: Math.round(durationMs * 100) / 100,
      status: cls.status,
      errClass: cls.class,
      errCode: cls.code,
      errMessage: cls.message,
    });
    throw asTypedAIError(err);
  }
}

export function aiInvalidResponse(details?: Record<string, unknown>): AIError {
  return new AIInvalidResponseError(undefined, details);
}