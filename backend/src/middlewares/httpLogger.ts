import type { Request, Response, NextFunction } from "express";
import { logger } from "@/utils/logger";
import { loggerStorage } from "@/utils/loggerContext";

const isProduction = process.env.NODE_ENV === "production";
const LOG_BODIES = !isProduction;

const REDACT_KEYS = new Set([
  "password",
  "token",
  "secret",
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "jwt",
  "jwt_secret",
]);

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = REDACT_KEYS.has(k.toLowerCase()) ? "[REDACTED]" : redact(v, depth + 1);
    }
    return out;
  }
  if (typeof value === "string" && value.length > 500) {
    return value.slice(0, 500) + `…(+${value.length - 500} chars)`;
  }
  return value;
}

function safeBody(req: Request): unknown {
  const body = (req as Request & { body?: unknown }).body;
  if (!body || typeof body !== "object") return undefined;
  return redact(body);
}

function captureResponseBody(res: Response): Buffer | undefined {
  if (!LOG_BODIES) return undefined;
  if (res.getHeader("content-type")?.toString().startsWith("image/")) {
    return undefined;
  }
  const chunks: Buffer[] = [];
  const origWrite = res.write.bind(res);
  const origEnd = res.end.bind(res);
  const toBuffer = (chunk: unknown): Buffer | null => {
    if (chunk === undefined || chunk === null) return null;
    if (Buffer.isBuffer(chunk)) return chunk;
    if (typeof chunk === "string") return Buffer.from(chunk);
    if (chunk instanceof Uint8Array) return Buffer.from(chunk);
    return null;
  };
  (res as Response & { write: typeof res.write }).write = function (
    chunk: unknown,
    ...rest: unknown[]
  ) {
    const buf = toBuffer(chunk);
    if (buf) chunks.push(buf);
    return (origWrite as (...a: unknown[]) => boolean)(chunk, ...rest);
  };
  (res as Response & { end: typeof res.end }).end = function (
    chunk?: unknown,
    ...rest: unknown[]
  ) {
    const buf = toBuffer(chunk);
    if (buf) chunks.push(buf);
    return (origEnd as (...a: unknown[]) => Response)(chunk, ...rest);
  };
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

export function httpLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  const requestId = req.requestId;
  const userId = (req as Request & { user?: { sub?: string | number; id?: string | number } }).user?.sub;

  const chunks = captureResponseBody(res);

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const status = res.statusCode;
    const route =
      (req as Request & { route?: { path?: string } }).route?.path ??
      req.path ??
      req.url;
    const level =
      status >= 500 ? "error" : status >= 400 ? "warn" : "info";

    const meta: Record<string, unknown> = {
      requestId,
      userId,
      method: req.method,
      url: req.originalUrl ?? req.url,
      route,
      status,
      durationMs: Math.round(durationMs * 100) / 100,
      ip:
        req.ip ??
        req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim(),
      contentLength: res.getHeader("content-length"),
    };

    if (LOG_BODIES) {
      const reqBody = safeBody(req);
      if (reqBody) meta.reqBody = reqBody;
      if (chunks && chunks.length) {
        const raw = chunks.toString("utf8");
        try {
          meta.resBody = redact(JSON.parse(raw));
        } catch {
          meta.resBody = raw.length > 500 ? raw.slice(0, 500) + "…" : raw;
        }
      }
    }

    loggerStorage.set({ requestId, userId, route, method: req.method });
    logger.log(level, `${req.method} ${req.originalUrl ?? req.url} ${status}`, meta);
  });

  next();
}

export default httpLogger;