/**
 * Constantes de claves Redis para el módulo WhatsApp
 * Centraliza todos los prefijos y TTLs para mantener consistencia
 */

// ============================================================================
// PREFIJOS DE CLAVES REDIS
// ============================================================================

/** Prefijo para sesiones de conversación */
export const CONVERSATION_SESSION_PREFIX = 'whatsapp:conversation:';

/** Prefijo para timestamp del último mensaje del usuario */
export const LAST_USER_MESSAGE_PREFIX = 'whatsapp:last_user_msg:';

/** Prefijo para flag de recordatorio enviado */
export const REMINDER_SENT_PREFIX = 'whatsapp:reminder_sent:';

/** Prefijo para mensajes ya procesados (evitar duplicados) */
export const PROCESSED_MESSAGE_PREFIX = 'whatsapp:processed_msg:';

/** Prefijo para buffer de álbumes de imágenes */
export const ALBUM_BUFFER_PREFIX = 'whatsapp:album:';

// ============================================================================
// TTLs (Time To Live) EN SEGUNDOS
// ============================================================================

/** TTL para sesiones de conversación (30 minutos) */
export const CONVERSATION_TTL = 30 * 60;

/** TTL para mensajes procesados (60 segundos para evitar reprocesar) */
export const PROCESSED_MESSAGE_TTL = 60;

/** TTL para buffer de álbumes (10 segundos para agrupar imágenes) */
export const ALBUM_BUFFER_TTL = 10;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Genera la clave Redis para una sesión de conversación
 */
export function getConversationSessionKey(phone: string): string {
  return `${CONVERSATION_SESSION_PREFIX}${phone}`;
}

/**
 * Genera la clave Redis para el último mensaje de usuario
 */
export function getLastUserMessageKey(phone: string): string {
  return `${LAST_USER_MESSAGE_PREFIX}${phone}`;
}

/**
 * Genera la clave Redis para el flag de recordatorio
 */
export function getReminderSentKey(phone: string): string {
  return `${REMINDER_SENT_PREFIX}${phone}`;
}

/**
 * Genera la clave Redis para un mensaje procesado
 */
export function getProcessedMessageKey(messageId: string): string {
  return `${PROCESSED_MESSAGE_PREFIX}${messageId}`;
}

/**
 * Genera la clave Redis para un buffer de álbum
 */
export function getAlbumBufferKey(phone: string, albumParentId: string): string {
  return `${ALBUM_BUFFER_PREFIX}${phone}:${albumParentId}`;
}

/**
 * Genera la clave de lock para un álbum
 */
export function getAlbumLockKey(phone: string, albumParentId: string): string {
  return `${ALBUM_BUFFER_PREFIX}${phone}:${albumParentId}:lock`;
}

