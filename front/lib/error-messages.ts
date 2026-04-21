const MESSAGES: Record<string, string> = {
  insufficient_stock: "No queda stock suficiente para alguno de tus productos.",
  product_not_available: "Este producto ya no está disponible.",
  invalid_products: "Algunos productos no son válidos.",
  missing_items: "Tu carrito está vacío.",
  missing_payment_method: "Elegí un método de pago.",
  rate_limit_exceeded: "Demasiadas operaciones, intentá en unos segundos.",
  unauthorized: "Necesitás iniciar sesión para continuar.",
  forbidden: "No tenés permiso para esta acción.",
  not_found: "No encontramos lo que buscabas.",
  validation_error: "Revisá los datos del formulario.",
  network_error: "No pudimos conectarnos al servidor. Revisá tu conexión.",
};

const FALLBACK = "Algo salió mal. Intentá de nuevo en unos segundos.";

export function translateError(code: unknown): string {
  if (typeof code !== "string") return FALLBACK;
  const trimmed = code.trim();
  if (!trimmed) return FALLBACK;
  if (MESSAGES[trimmed]) return MESSAGES[trimmed];
  if (/^[a-z][a-z0-9_]*$/.test(trimmed)) return FALLBACK;
  return trimmed;
}
