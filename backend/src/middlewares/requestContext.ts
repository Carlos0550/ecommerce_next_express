import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { loggerStorage } from "@/utils/loggerContext";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const headerId = req.headers["x-request-id"];
  const id = typeof headerId === "string" && headerId.length > 0 ? headerId : randomUUID();
  req.requestId = id;
  res.setHeader("x-request-id", id);
  loggerStorage.run({ requestId: id, method: req.method, route: req.path }, () => next());
}