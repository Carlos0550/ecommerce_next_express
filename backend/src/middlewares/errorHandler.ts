import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError, AIError } from "@/utils/errors";
import { logger } from "@/utils/logger";
import { loggerStorage } from "@/utils/loggerContext";

interface ErrorResponse {
  ok: false;
  error: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

const isProd = process.env.NODE_ENV === "production";

function mapPrismaError(err: Prisma.PrismaClientKnownRequestError): {
  status: number;
  code: string;
  message: string;
} {
  switch (err.code) {
    case "P2002":
      return { status: 409, code: "unique_violation", message: "Recurso duplicado" };
    case "P2025":
      return { status: 404, code: "not_found", message: "Recurso no encontrado" };
    case "P2003":
      return { status: 409, code: "foreign_key_violation", message: "Violación de referencia" };
    default:
      return { status: 400, code: "database_error", message: "Error de base de datos" };
  }
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.requestId;
  const userId = (req as Request & { user?: { sub?: string | number; id?: string | number } }).user?.sub;
  const route = (req as Request & { route?: { path?: string } }).route?.path;
  loggerStorage.set({ requestId, userId, route, method: req.method });

  if (err instanceof Error && err.message.includes("CORS")) {
    logger.warn("CORS rejected", { message: err.message });
    res.status(403).json({
      ok: false,
      error: "cors_not_allowed",
      message: isProd ? "Origen no permitido" : err.message,
      requestId,
    } satisfies ErrorResponse);
    return;
  }

  if (err instanceof ZodError) {
    logger.warn("Validation failed", { issues: err.issues });
    res.status(400).json({
      ok: false,
      error: "validation_error",
      message: "Datos de entrada inválidos",
      details: err.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
        code: i.code,
      })),
      requestId,
    } satisfies ErrorResponse);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const { status, code, message } = mapPrismaError(err);
    logger.warn("Prisma known error", { code: err.code, meta: err.meta });
    res.status(status).json({
      ok: false,
      error: code,
      message,
      requestId,
    } satisfies ErrorResponse);
    return;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.warn("Prisma validation error", { message: err.message });
    res.status(400).json({
      ok: false,
      error: "database_validation_error",
      message: isProd ? "Datos inválidos para la base de datos" : err.message,
      requestId,
    } satisfies ErrorResponse);
    return;
  }

  if (err instanceof AIError) {
    const logFn = err.status >= 500 ? logger.error.bind(logger) : logger.warn.bind(logger);
    logFn(`AI error: ${err.code}`, {
      code: err.code,
      status: err.status,
      message: err.message,
      details: err.details,
    });
    res.status(err.status).json({
      ok: false,
      error: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
      requestId,
    } satisfies ErrorResponse);
    return;
  }

  if (err instanceof AppError) {
    const logFn = err.status >= 500 ? logger.error.bind(logger) : logger.warn.bind(logger);
    logFn(`AppError: ${err.code}`, {
      code: err.code,
      status: err.status,
      message: err.message,
      details: err.details,
    });
    res.status(err.status).json({
      ok: false,
      error: err.code,
      message: err.expose || !isProd ? err.message : "Error en el procesamiento",
      ...(err.details ? { details: err.details } : {}),
      requestId,
    } satisfies ErrorResponse);
    return;
  }

  const e = err instanceof Error ? err : new Error(typeof err === "string" ? err : "Unknown error");
  logger.error("Unhandled error", {
    name: e.name,
    message: e.message,
    stack: e.stack,
  });
  res.status(500).json({
    ok: false,
    error: "internal_error",
    message: isProd ? "Error interno del servidor" : e.message,
    requestId,
  } satisfies ErrorResponse);
}