/**
 * Servicio principal de WhatsApp - Fachada
 * 
 * Este archivo actúa como fachada para mantener compatibilidad con imports existentes.
 * La funcionalidad real está distribuida en los siguientes módulos:
 * 
 * - config.service.ts: Configuración de WhatsApp
 * - session.service.ts: Gestión de sesiones WasenderAPI
 * - message.service.ts: Envío de mensajes
 * - webhook.handler.ts: Procesamiento de webhooks
 * - album.service.ts: Manejo de álbumes de imágenes
 * - conversation/: Módulo de conversación con IA
 * 
 * @deprecated Usar imports directos de los servicios específicos
 */

import { configService } from './config.service';
import { sessionService } from './session.service';
import { messageService } from './message.service';
import { webhookHandler } from './webhook.handler';
import { sessionManager, timeoutWorker } from './conversation';
import {
  WhatsAppConfig,
  WhatsAppConfigResponse,
  SessionCreateResponse,
  QRCodeResponse,
  SessionStatusResponse,
  WhatsAppConversationSession,
  WebhookEvent,
} from '../schemas/whatsapp.schemas';

/**
 * Clase de fachada para mantener compatibilidad
 * @deprecated Usar los servicios específicos directamente
 */
class WhatsAppServices {
  // ============================================================================
  // CONFIGURACIÓN
  // ============================================================================

  async getConfig(): Promise<WhatsAppConfigResponse> {
    return configService.getConfig();
  }

  async updateConfig(config: WhatsAppConfig): Promise<WhatsAppConfigResponse> {
    return configService.updateConfig(config);
  }

  // ============================================================================
  // SESIONES
  // ============================================================================

  async createSession(
    name: string,
    phoneNumber: string,
    webhookBaseUrl: string
  ): Promise<SessionCreateResponse> {
    return sessionService.createSession(name, phoneNumber, webhookBaseUrl);
  }

  async getQRCode(): Promise<QRCodeResponse> {
    return sessionService.getQRCode();
  }

  async getSessionStatus(): Promise<SessionStatusResponse> {
    return sessionService.getSessionStatus();
  }

  async disconnectSession(): Promise<{ success: boolean; message: string }> {
    return sessionService.disconnectSession();
  }

  // ============================================================================
  // MENSAJES
  // ============================================================================

  async sendMessage(to: string, message: string): Promise<void> {
    return messageService.sendMessage(to, message);
  }

  async sendTestMessage(
    to: string,
    message: string
  ): Promise<{ success: boolean; message: string }> {
    return messageService.sendTestMessage(to, message);
  }

  // ============================================================================
  // WEBHOOKS
  // ============================================================================

  async handleWebhook(event: WebhookEvent, signature?: string): Promise<void> {
    return webhookHandler.handleWebhook(event, signature);
  }

  // ============================================================================
  // SESIONES DE CONVERSACIÓN
  // ============================================================================

  async getConversationSession(phone: string): Promise<WhatsAppConversationSession | null> {
    return sessionManager.getSession(phone);
  }

  async saveConversationSession(session: WhatsAppConversationSession): Promise<void> {
    return sessionManager.saveSession(session);
  }

  async deleteConversationSession(phone: string): Promise<void> {
    return sessionManager.deleteSession(phone);
  }

  createNewConversationSession(adminId: number, phone: string): WhatsAppConversationSession {
    return sessionManager.createNewSession(adminId, phone);
  }

  async updateLastUserMessage(phone: string): Promise<void> {
    return sessionManager.updateLastUserMessage(phone);
  }

  async getLastUserMessageTime(phone: string): Promise<number | null> {
    return sessionManager.getLastUserMessageTime(phone);
  }

  async markReminderSent(phone: string): Promise<void> {
    return sessionManager.markReminderSent(phone, 40); // TIMEOUT_CLOSE_SESSION + 10
  }

  async wasReminderSent(phone: string): Promise<boolean> {
    return sessionManager.wasReminderSent(phone);
  }

  async getActiveSessionPhones(): Promise<string[]> {
    return sessionManager.getActiveSessionPhones();
  }

  // ============================================================================
  // TIMEOUT WORKER
  // ============================================================================

  startTimeoutWorker(): void {
    timeoutWorker.start();
  }
}

export const whatsAppServices = new WhatsAppServices();
export default whatsAppServices;
