import { prisma } from "@/config/prisma";
import type { WhatsAppConversationSession } from "../../schemas/whatsapp.schemas";
class SessionManager {
  async getSession(phone: string): Promise<WhatsAppConversationSession | null> {
    try {
      const session = await prisma.whatsAppSession.findUnique({
        where: { phone },
      });
      if (!session) {
        return null;
      }
      return {
        userId: session.userId,
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
  async saveSession(session: WhatsAppConversationSession): Promise<void> {
    try {
      await prisma.whatsAppSession.upsert({
        where: { phone: session.phone },
        update: {
          userId: session.userId,
          state: session.state,
          productData: session.productData as any,
          messageHistory: session.messageHistory as any,
          lastActivity: new Date(),
        },
        create: {
          phone: session.phone,
          userId: session.userId,
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
  async deleteSession(phone: string): Promise<void> {
    try {
      await prisma.whatsAppSession
        .delete({
          where: { phone },
        })
        .catch(() => {}); 
    } catch (error) {
      console.error("Error al eliminar sesión de WhatsApp de la DB:", error);
    }
  }
  createNewSession(
    userId: number,
    phone: string,
  ): WhatsAppConversationSession {
    return {
      userId,
      phone,
      state: "idle",
      productData: {
        images: [],
      },
      messageHistory: [],
      lastActivity: new Date(),
    };
  }
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
    }
  }
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
    }
  }
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
