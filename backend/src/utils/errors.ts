/**
 * Domain errors. Thrown from services/controllers, caught by the global error
 * middleware and serialized to a uniform JSON response.
 */

export type ErrorDetails = Record<string, unknown> | undefined;

export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: ErrorDetails;
  public readonly expose: boolean;

  constructor(
    message: string,
    opts: { status?: number; code?: string; details?: ErrorDetails; expose?: boolean } = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.status = opts.status ?? 500;
    this.code = opts.code ?? "internal_error";
    this.details = opts.details;
    this.expose = opts.expose ?? this.status < 500;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", details?: ErrorDetails, code = "bad_request") {
    super(message, { status: 400, code, details });
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: ErrorDetails) {
    super(message, { status: 400, code: "validation_error", details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", code = "unauthorized") {
    super(message, { status: 401, code });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", code = "forbidden") {
    super(message, { status: 403, code });
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found", code = "not_found") {
    super(message, { status: 404, code });
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", details?: ErrorDetails, code = "conflict") {
    super(message, { status: 409, code, details });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests") {
    super(message, { status: 429, code: "too_many_requests" });
  }
}
