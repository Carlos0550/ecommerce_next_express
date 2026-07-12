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
    opts: { status?: number; code?: string; details?: ErrorDetails; expose?: boolean } = {},
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

export class PaymentRequiredError extends AppError {
  constructor(message = "Payment required", code = "payment_required") {
    super(message, { status: 402, code });
  }
}

export class UpstreamError extends AppError {
  constructor(message: string, code = "upstream_error", details?: ErrorDetails) {
    super(message, { status: 502, code, details, expose: false });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string, code = "service_unavailable", details?: ErrorDetails) {
    super(message, { status: 503, code, details, expose: false });
  }
}

export class GatewayTimeoutError extends AppError {
  constructor(message: string, code = "gateway_timeout", details?: ErrorDetails) {
    super(message, { status: 504, code, details, expose: false });
  }
}

export class StorageError extends AppError {
  constructor(message = "Error de almacenamiento", code = "storage_error", details?: ErrorDetails) {
    super(message, { status: 500, code, details, expose: false });
  }
}

export class EmailError extends AppError {
  constructor(message = "Error al enviar el email", details?: ErrorDetails) {
    super(message, { status: 500, code: "email_send_failed", details, expose: false });
  }
}

export class AIError extends AppError {
  constructor(
    message: string,
    code: string,
    status: number,
    details?: ErrorDetails,
  ) {
    super(message, { status, code, details, expose: false });
    this.name = "AIError";
  }
}

export class AIAuthError extends AIError {
  constructor(message = "Proveedor de IA rechazó la autenticación", details?: ErrorDetails) {
    super(message, "ai_auth_error", 502, details);
  }
}

export class AIForbiddenError extends AIError {
  constructor(message = "Acceso denegado por el proveedor de IA", details?: ErrorDetails) {
    super(message, "ai_forbidden_error", 502, details);
  }
}

export class AIRateLimitError extends AIError {
  constructor(message = "Proveedor de IA saturado, reintentá en unos minutos", details?: ErrorDetails) {
    super(message, "ai_rate_limit", 503, details);
  }
}

export class AIUpstreamError extends AIError {
  constructor(message = "El proveedor de IA falló", details?: ErrorDetails) {
    super(message, "ai_upstream_error", 502, details);
  }
}

export class AINetworkError extends AIError {
  constructor(message = "No se pudo contactar al proveedor de IA", details?: ErrorDetails) {
    super(message, "ai_network_error", 503, details);
  }
}

export class AITimeoutError extends AIError {
  constructor(message = "Proveedor de IA no respondió a tiempo", details?: ErrorDetails) {
    super(message, "ai_timeout", 504, details);
  }
}

export class AIInvalidResponseError extends AIError {
  constructor(message = "La IA devolvió una respuesta inválida", details?: ErrorDetails) {
    super(message, "ai_invalid_response", 502, details);
  }
}

/**
 * Semantic factory. Prefer throwing these over `new BadRequestError("msg")`
 * so the error code stays consistent across the codebase.
 */
export const errors = {
  invalidCredentials: () =>
    new UnauthorizedError("Credenciales inválidas", "invalid_credentials"),
  invalidOldPassword: () =>
    new UnauthorizedError("La contraseña actual es incorrecta", "invalid_old_password"),
  invalidToken: () =>
    new UnauthorizedError("Token inválido o expirado", "invalid_token"),
  unauthorized: (msg = "No autorizado") => new UnauthorizedError(msg, "unauthorized"),
  forbidden: (msg = "No tenés permiso para realizar esta acción") =>
    new ForbiddenError(msg, "forbidden"),
  adminRegistrationDisabled: () =>
    new ForbiddenError(
      "El registro de administradores no está habilitado",
      "admin_registration_disabled",
    ),
  emailTaken: () =>
    new ConflictError("El correo ya está registrado", undefined, "email_already_registered"),
  userNotFound: () => new NotFoundError("Usuario no encontrado", "user_not_found"),
  productNotFound: () =>
    new NotFoundError("Producto no encontrado", "product_not_found"),
  categoryNotFound: () =>
    new NotFoundError("Categoría no encontrada", "category_not_found"),
  categoryAlreadyExists: () =>
    new ConflictError("Esta categoría ya existe", undefined, "category_exists"),
  categoryTitleTaken: () =>
    new ConflictError("Ya existe una categoría con este título", undefined, "category_title_taken"),
  orderNotFound: () => new NotFoundError("Pedido no encontrado", "order_not_found"),
  receiptNotFound: () => new NotFoundError("Comprobante no encontrado", "receipt_not_found"),
  invalidPayload: (details?: ErrorDetails) =>
    new BadRequestError("Datos inválidos", details, "invalid_payload"),
  missingFields: (fields?: string[]) =>
    new BadRequestError(
      fields?.length ? `Campos requeridos: ${fields.join(", ")}` : "Faltan campos obligatorios",
      fields ? { fields } : undefined,
      "missing_fields",
    ),
  invalidEmail: () => new BadRequestError("Email inválido", undefined, "invalid_email"),
  invalidStatus: () =>
    new BadRequestError("Estado inválido", undefined, "invalid_status"),
  invalidStateTransition: (from?: string, to?: string) =>
    new BadRequestError(
      from && to ? `No se puede cambiar de "${from}" a "${to}"` : "Transición de estado inválida",
      from && to ? { from, to } : undefined,
      "invalid_state_transition",
    ),
  invalidCustomerData: () =>
    new BadRequestError("Datos del cliente inválidos", undefined, "invalid_customer_data"),
  invalidPaymentMethod: () =>
    new BadRequestError("Método de pago inválido", undefined, "invalid_payment_method"),
  invalidImageFormat: () =>
    new BadRequestError("Formato de imagen inválido", undefined, "invalid_image_format"),
  alreadyDeleted: (what = "recurso") =>
    new BadRequestError(`El ${what} ya fue eliminado`, undefined, "already_deleted"),
  insufficientStock: (available?: number) =>
    new ConflictError(
      available !== undefined
        ? `Stock insuficiente (disponible: ${available})`
        : "Stock insuficiente",
      available !== undefined ? { available } : undefined,
      "insufficient_stock",
    ),
  imageUploadFailed: () =>
    new StorageError("Error al subir la imagen", "image_upload_failed"),
  receiptUploadFailed: () =>
    new StorageError("Error al subir el comprobante", "receipt_upload_failed"),
  receiptFetchFailed: () =>
    new StorageError("Error al obtener el comprobante", "receipt_fetch_failed"),
  signedUrlFailed: () =>
    new StorageError("Error al generar la URL firmada", "signed_url_failed"),
  notImplemented: (what = "operación") =>
    new AppError(`Funcionalidad no implementada: ${what}`, {
      status: 501,
      code: "not_implemented",
    }),
};