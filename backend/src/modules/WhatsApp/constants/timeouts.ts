/**
 * Constantes de timeouts para el módulo WhatsApp
 * Centraliza todos los valores de tiempo para fácil configuración
 */

// ============================================================================
// TIMEOUTS DE SESIÓN (EN SEGUNDOS)
// ============================================================================

/** Tiempo sin respuesta antes de enviar recordatorio (60 segundos) */
export const TIMEOUT_FIRST_WARNING = 60;

/** Tiempo después del recordatorio para cerrar sesión (30 segundos) */
export const TIMEOUT_CLOSE_SESSION = 30;

// ============================================================================
// DELAYS DE PROCESAMIENTO (EN MILISEGUNDOS)
// ============================================================================

/** Delay para esperar todas las imágenes de un álbum (2 segundos) */
export const ALBUM_PROCESS_DELAY = 2000;

/** Intervalo del worker de verificación de timeouts (10 segundos) */
export const TIMEOUT_WORKER_INTERVAL = 10000;

// ============================================================================
// REINTENTOS
// ============================================================================

/** Máximo de reintentos para obtener lock de álbum */
export const ALBUM_LOCK_MAX_RETRIES = 10;

/** Delay entre reintentos de lock (100ms) */
export const ALBUM_LOCK_RETRY_DELAY = 100;

/** TTL del lock de álbum (5 segundos) */
export const ALBUM_LOCK_TTL = 5;

