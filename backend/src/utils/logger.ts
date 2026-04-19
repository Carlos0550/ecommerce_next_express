import winston from "winston";
import "winston-daily-rotate-file";
const { combine, timestamp, printf, colorize, align, errors } = winston.format;
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};
winston.addColors(colors);
const logFormat = combine(
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }), 
  align(),
  printf((info) => {
    const { timestamp, level, message, stack, ...args } = info;
    const argsStr = Object.keys(args).length
      ? JSON.stringify(args, null, 2)
      : "";
    const ts = typeof timestamp === "string" ? timestamp : JSON.stringify(timestamp ?? "");
    const msg = typeof message === "string" ? message : JSON.stringify(message);
    const stk = typeof stack === "string" ? stack : stack ? JSON.stringify(stack) : "";
    return `[${ts}] ${level}: ${msg} ${stk} ${argsStr}`;
  }),
);
export const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
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
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: "HH:mm:ss" }),
        printf((info) => {
          const ts =
            typeof info.timestamp === "string"
              ? info.timestamp
              : JSON.stringify(info.timestamp ?? "");
          const msg =
            typeof info.message === "string"
              ? info.message
              : JSON.stringify(info.message);
          const stk =
            typeof info.stack === "string"
              ? info.stack
              : info.stack
                ? JSON.stringify(info.stack)
                : "";
          return `[${ts}] ${info.level}: ${msg} ${stk}`;
        }),
      ),
    }),
  );
}
