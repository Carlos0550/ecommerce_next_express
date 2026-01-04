/**
 * Gestor de sesiones de conversación en Redis
 * Maneja el CRUD de sesiones de conversación de WhatsApp
 */

import { redis } from '@/config/redis';
import {
  getConversationSessionKey,
  getLastUserMessageKey,
  getReminderSentKey,
  CONVERSATION_TTL,
  CONVERSATION_SESSION_PREFIX,
} from '../../constants/redis-keys';
import { WhatsAppConversationSession } from '../../schemas/whatsapp.schemas';

class SessionManager {
  /**
   * Obtiene una sesión de conversación desde Redis
   */
  async getSession(phone: string): Promise<WhatsAppConversationSession | null> {
    const key = getConversationSessionKey(phone);
    const data = await redis.get(key);
    
    if (!data) {
      return null;
    }

    return JSON.parse(data);
  }

  /**
   * Guarda una sesión de conversación en Redis
   */
  async saveSession(session: WhatsAppConversationSession): Promise<void> {
    const key = getConversationSessionKey(session.phone);
    await redis.setex(key, CONVERSATION_TTL, JSON.stringify(session));
  }

  /**
   * Elimina una sesión de conversación y sus datos relacionados
   */
  async deleteSession(phone: string): Promise<void> {
    const sessionKey = getConversationSessionKey(phone);
    const lastMsgKey = getLastUserMessageKey(phone);
    const reminderKey = getReminderSentKey(phone);
    
    await Promise.all([
      redis.del(sessionKey),
      redis.del(lastMsgKey),
      redis.del(reminderKey),
    ]);
  }

  /**
   * Crea una nueva sesión de conversación
   */
  createNewSession(adminId: number, phone: string): WhatsAppConversationSession {
    return {
      adminId,
      phone,
      state: 'idle',
      productData: {
        images: [],
      },
      messageHistory: [],
      lastActivity: new Date(),
    };
  }

  /**
   * Actualiza el timestamp del último mensaje del usuario
   */
  async updateLastUserMessage(phone: string): Promise<void> {
    const key = getLastUserMessageKey(phone);
    await redis.setex(key, CONVERSATION_TTL, Date.now().toString());
    
    // Limpiar el flag de recordatorio cuando el usuario responde
    const reminderKey = getReminderSentKey(phone);
    await redis.del(reminderKey);
  }

  /**
   * Obtiene el timestamp del último mensaje del usuario
   */
  async getLastUserMessageTime(phone: string): Promise<number | null> {
    const key = getLastUserMessageKey(phone);
    const timestamp = await redis.get(key);
    return timestamp ? parseInt(timestamp) : null;
  }

  /**
   * Marca que se envió un recordatorio
   */
  async markReminderSent(phone: string, ttl: number): Promise<void> {
    const key = getReminderSentKey(phone);
    // Usamos un TTL largo (igual al de la conversación) para evitar que caduque antes de cerrar la sesión
    await redis.setex(key, CONVERSATION_TTL, Date.now().toString());
  }

  /**
   * Verifica si ya se envió un recordatorio
   */
  async wasReminderSent(phone: string): Promise<boolean> {
    const key = getReminderSentKey(phone);
    const value = await redis.get(key);
    return value !== null;
  }

  /**
   * Obtiene el timestamp de cuando se envió el recordatorio
   */
  async getReminderSentTime(phone: string): Promise<number | null> {
    const key = getReminderSentKey(phone);
    const timestamp = await redis.get(key);
    return timestamp ? parseInt(timestamp) : null;
  }

  /**
   * Obtiene todos los teléfonos con sesiones activas
   */
  async getActiveSessionPhones(): Promise<string[]> {
    const keys = await redis.keys(`${CONVERSATION_SESSION_PREFIX}*`);
    return keys.map(key => key.replace(CONVERSATION_SESSION_PREFIX, ''));
  }

  /**
   * Asegura que la sesión tenga todos los campos requeridos
   * (para sesiones antiguas que pueden no tenerlos)
   */
  ensureSessionFields(session: WhatsAppConversationSession): WhatsAppConversationSession {
    if (!session.messageHistory) {
      session.messageHistory = [];
    }
    if (!session.productData) {
      session.productData = { images: [] };
    }
    if (!session.productData.images) {
      session.productData.images = [];
    }
    return session;
  }
}

export const sessionManager = new SessionManager();
export default sessionManager;

