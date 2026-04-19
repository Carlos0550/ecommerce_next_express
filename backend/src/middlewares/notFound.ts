import type { Request, Response } from "express";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    ok: false,
    error: "not_found",
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
}
