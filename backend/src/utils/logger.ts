import winston from "winston";
import "winston-daily-rotate-file";
import { loggerStorage } from "@/utils/loggerContext";

const { combine, timestamp, printf, colorize, align, errors } = winston.format;

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
} as const;

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};
winston.addColors(colors);

const isProduction = process.env.NODE_ENV === "production";

function defaultLevel(): keyof typeof logLevels {
  const env = (process.env.LOG_LEVEL || "").toLowerCase();
  if (env in logLevels) return env as keyof typeof logLevels;
  return isProduction ? "info" : "debug";
}

const contextFormat = printf((info) => {
  const ctx = loggerStorage.get();
  const meta: Record<string, unknown> = { ...(info.metadata ?? {}) };
  if (ctx) {
    if (ctx.requestId) meta.requestId = ctx.requestId;
    if (ctx.userId !== undefined) meta.userId = ctx.userId;
    if (ctx.route) meta.route = ctx.route;
    if (ctx.method) meta.method = ctx.method;
  }
  const metaKeys = Object.keys(meta);
  const metaStr = metaKeys.length ? ` ${JSON.stringify(meta)}` : "";
  const stack =
    typeof info.stack === "string"
      ? info.stack
      : info.stack
        ? JSON.stringify(info.stack)
        : "";
  const ts =
    typeof info.timestamp === "string"
      ? info.timestamp
      : JSON.stringify(info.timestamp ?? "");
  const msg =
    typeof info.message === "string"
      ? info.message
      : JSON.stringify(info.message);
  const level = String(info.level).padEnd(5);
  return `[${ts}] ${level} ${msg}${stack ? `\n${stack}` : ""}${metaStr}`;
});

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const ctx = loggerStorage.get();
    const payload: Record<string, unknown> = {
      ts: info.timestamp,
      level: info.level,
      msg: info.message,
      ...(info.metadata && Object.keys(info.metadata).length
        ? (info.metadata as Record<string, unknown>)
        : {}),
    };
    if (info.stack && typeof info.stack === "string") payload.stack = info.stack;
    if (ctx) {
      if (ctx.requestId) payload.requestId = ctx.requestId;
      if (ctx.userId !== undefined) payload.userId = ctx.userId;
      if (ctx.route) payload.route = ctx.route;
      if (ctx.method) payload.method = ctx.method;
    }
    return JSON.stringify(payload);
  }),
);

const fileFormat = combine(
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }),
  align(),
  contextFormat,
);

const devConsoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  contextFormat,
);

export const logger = winston.createLogger({
  levels: logLevels,
  level: defaultLevel(),
  format: fileFormat,
  transports: [
    new winston.transports.DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxSize: "20m",
      maxFiles: "14d",
    }),
    new winston.transports.DailyRotateFile({
      filename: "logs/combined-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
});

logger.add(
  new winston.transports.Console({
    format: isProduction ? jsonFormat : devConsoleFormat,
  }),
);

export type Logger = typeof logger;
export default logger;