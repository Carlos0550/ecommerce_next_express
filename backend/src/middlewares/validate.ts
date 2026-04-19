import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";
import { ValidationError } from "@/utils/errors";

type Source = "body" | "query" | "params";

export function validate<T>(schema: ZodType<T>, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse((req as any)[source]);
    if (!result.success) {
      return next(
        new ValidationError("validation_error", {
          issues: result.error.issues.map((i) => ({
            path: i.path.join("."),
            code: i.code,
            message: i.message,
          })),
        }),
      );
    }
    (req as any)[source] = result.data;
    next();
  };
}
