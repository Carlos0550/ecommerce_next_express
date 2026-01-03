/**
 * Utilidades para normalización y validación de números de teléfono
 */

/**
 * Normaliza un número de teléfono al formato internacional
 * Soporta números argentinos y otros formatos
 */
export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\s+/g, '').replace(/-/g, '');
  
  // Ya tiene formato internacional completo
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // Número argentino con código de país y móvil (549)
  if (cleaned.startsWith('549')) {
    return '+' + cleaned;
  }
  
  // Número argentino con código de país sin móvil (54)
  if (cleaned.startsWith('54')) {
    return '+' + cleaned;
  }
  
  // Número local argentino de 10 dígitos (agregar +549)
  if (cleaned.length === 10 && /^\d+$/.test(cleaned)) {
    return '+549' + cleaned;
  }
  
  // Número de 13 dígitos que empieza con 549
  if (cleaned.length === 13 && /^\d+$/.test(cleaned) && cleaned.startsWith('549')) {
    return '+' + cleaned;
  }
  
  // Por defecto, agregar + si no lo tiene
  return cleaned.startsWith('+') ? cleaned : '+' + cleaned;
}

/**
 * Normaliza una lista de remitentes separados por coma
 */
export function normalizeRemitentsList(remitents: string): string {
  return remitents
    .split(',')
    .map(r => r.trim())
    .filter(Boolean)
    .map(r => normalizePhoneNumber(r))
    .join(',');
}

/**
 * Normaliza un número de teléfono para comparación
 * Elimina todos los caracteres no numéricos
 */
export function normalizePhoneForComparison(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Verifica si un número está en la lista de permitidos
 */
export function isPhoneAllowed(phone: string, allowedRemitents: string | null): boolean {
  if (!allowedRemitents) {
    return true; // Si no hay lista, todos están permitidos
  }
  
  const allowedList = allowedRemitents
    .split(',')
    .map(r => r.trim())
    .filter(Boolean);
  
  if (allowedList.length === 0) {
    return true;
  }
  
  const normalizedPhone = normalizePhoneForComparison(phone);
  return allowedList.some(r => normalizePhoneForComparison(r) === normalizedPhone);
}

