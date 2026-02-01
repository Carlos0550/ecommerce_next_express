/**
 * Gestor de sesiones de conversación en Base de Datos
 * Maneja el CRUD de sesiones de conversación de WhatsApp usando Prisma
 */

import { prisma } from "@/config/prisma";
import { WhatsAppConversationSession } from "../../schemas/whatsapp.schemas";

class SessionManager {
  /**
   * Obtiene una sesión de conversación desde la DB
   */
  async getSession(phone: string): Promise<WhatsAppConversationSession | null> {
    try {
      const session = await prisma.whatsAppSession.findUnique({
        where: { phone },
      });

      if (!session) {
        return null;
      }

      return {
        adminId: session.adminId,
        phone: session.phone,
        state: session.state as any,
        productData: session.productData as any,
        messageHistory: session.messageHistory as any,
        lastActivity: session.lastActivity,
      };
    } catch (error) {
      console.error("Error al obtener sesión de WhatsApp de la DB:", error);
      return null;
    }
  }

  /**
   * Guarda una sesión de conversación en la DB
   */
  async saveSession(session: WhatsAppConversationSession): Promise<void> {
    try {
      await prisma.whatsAppSession.upsert({
        where: { phone: session.phone },
        update: {
          adminId: session.adminId,
          state: session.state,
          productData: session.productData as any,
          messageHistory: session.messageHistory as any,
          lastActivity: new Date(),
        },
        create: {
          phone: session.phone,
          adminId: session.adminId,
          state: session.state,
          productData: session.productData as any,
          messageHistory: session.messageHistory as any,
          lastActivity: new Date(),
        },
      });
    } catch (error) {
      console.error("Error al guardar sesión de WhatsApp en la DB:", error);
    }
  }

  /**
   * Elimina una sesión de conversación y sus datos relacionados
   */
  async deleteSession(phone: string): Promise<void> {
    try {
      await prisma.whatsAppSession
        .delete({
          where: { phone },
        })
        .catch(() => {}); // Ignorar si no existe
    } catch (error) {
      console.error("Error al eliminar sesión de WhatsApp de la DB:", error);
    }
  }

  /**
   * Crea una nueva sesión de conversación (solo objeto in-memory)
   */
  createNewSession(
    adminId: number,
    phone: string,
  ): WhatsAppConversationSession {
    return {
      adminId,
      phone,
      state: "idle",
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
    try {
      await prisma.whatsAppSession.update({
        where: { phone },
        data: {
          lastUserMessage: new Date(),
          reminderSent: false,
          reminderSentAt: null,
        },
      });
    } catch (error) {
      // Ignorar si la sesión no existe
    }
  }

  /**
   * Obtiene el timestamp del último mensaje del usuario
   */
  async getLastUserMessageTime(phone: string): Promise<number | null> {
    try {
      const session = await prisma.whatsAppSession.findUnique({
        where: { phone },
        select: { lastUserMessage: true },
      });
      return session?.lastUserMessage
        ? session.lastUserMessage.getTime()
        : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Marca que se envió un recordatorio
   */
  async markReminderSent(phone: string, _ttl?: number): Promise<void> {
    try {
      await prisma.whatsAppSession.update({
        where: { phone },
        data: {
          reminderSent: true,
          reminderSentAt: new Date(),
        },
      });
    } catch (error) {
      // Ignorar
    }
  }

  /**
   * Verifica si ya se envió un recordatorio
   */
  async wasReminderSent(phone: string): Promise<boolean> {
    try {
      const session = await prisma.whatsAppSession.findUnique({
        where: { phone },
        select: { reminderSent: true },
      });
      return !!session?.reminderSent;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtiene el timestamp de cuando se envió el recordatorio
   */
  async getReminderSentTime(phone: string): Promise<number | null> {
    try {
      const session = await prisma.whatsAppSession.findUnique({
        where: { phone },
        select: { reminderSentAt: true },
      });
      return session?.reminderSentAt ? session.reminderSentAt.getTime() : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Obtiene todos los teléfonos con sesiones activas
   */
  async getActiveSessionPhones(): Promise<string[]> {
    try {
      const sessions = await prisma.whatsAppSession.findMany({
        select: { phone: true },
      });
      return sessions.map((s) => s.phone);
    } catch (error) {
      return [];
    }
  }

  /**
   * Asegura que la sesión tenga todos los campos requeridos
   */
  ensureSessionFields(
    session: WhatsAppConversationSession,
  ): WhatsAppConversationSession {
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
