/**
 * Procesador principal de conversaciones
 * Punto de entrada para el procesamiento de mensajes de WhatsApp
 */

import { prisma } from '@/config/prisma';
import { sessionManager } from './session.manager';
import { aiProcessor } from './ai.processor';
import { actionExecutor } from './action.executor';
import { productActions } from './actions/product.actions';
import { messageService } from '../message.service';
import {
  isGreeting,
  detectGreetingTone,
  detectUserTone,
  isRequestingFormalTone,
} from './tone.detector';
import { isPhoneAllowed } from '../../utils/phone.utils';
import { getBusiness } from '../../utils/business.utils';
import {
  WhatsAppConversationSession,
  WebhookMessageReceived,
} from '../../schemas/whatsapp.schemas';

// ============================================================================
// ACCIONES QUE NO REQUIEREN GUARDAR SESIÓN DESPUÉS
// ============================================================================

const ACTIONS_SKIP_SAVE = ['cancel', 'reset', 'create_product', 'end_conversation'];

// ============================================================================
// PROCESADOR
// ============================================================================

class ConversationProcessor {
  /**
   * Procesa un mensaje entrante - PUNTO DE ENTRADA PRINCIPAL
   */
  async processMessage(
    adminId: number,
    phone: string,
    messageData: WebhookMessageReceived['data'] & { media_urls?: string[]; isAlbum?: boolean }
  ): Promise<void> {
    try {
      // Verificar permisos
      const authorized = await this.checkAuthorization(phone);
      if (!authorized) return;

      // Preparar contenido del mensaje
      let textContent = messageData.body || '';
      let messageType: 'text' | 'image' | 'audio' = 'text';
      const mediaUrl = messageData.media_url;

      // Transcribir audio si es necesario
      if (messageData.type === 'audio' && messageData.media_url) {
        messageType = 'audio';
        const transcription = await this.handleAudioMessage(phone, messageData.media_url);
        if (!transcription) return;
        textContent = transcription;
      }

      // Obtener o crear sesión
      let session = await this.getOrCreateSession(adminId, phone, textContent, messageData.type);
      
      // Detectar tono del saludo
      if (isGreeting(textContent) && messageData.type !== 'image' && !session.greetingTone) {
        session.greetingTone = detectGreetingTone(textContent);
      }

      // Actualizar timestamp
      await sessionManager.updateLastUserMessage(phone);

      // Asegurar campos requeridos
      session = sessionManager.ensureSessionFields(session);
      session.lastActivity = new Date();

      // Manejar imágenes
      if (messageData.type === 'image' && (messageData.media_url || messageData.media_urls)) {
        messageType = 'image';
        this.handleImageMessage(session, messageData);
        textContent = messageData.caption || '';
      }

      // Detectar cambios de tono
      this.detectToneChanges(session, textContent);

      // Agregar mensaje al historial
      session.messageHistory.push({
        role: 'user',
        content: textContent || (messageType === 'image' ? '[imagen]' : ''),
        timestamp: new Date(),
      });

      // Guardar sesión antes de procesar
      await sessionManager.saveSession(session);

      // Generar respuesta con IA
      const aiResponse = await aiProcessor.generateResponse(
        session,
        textContent,
        messageType,
        mediaUrl
      );

      // Ejecutar acción y capturar si envió su propio mensaje
      let actionSentOwnMessage = false;
      try {
        actionSentOwnMessage = await actionExecutor.execute(session, aiResponse);
      } catch (actionError) {
        console.error('Error ejecutando acción:', actionError);
        session.lastError = actionError instanceof Error ? actionError.message : 'Error desconocido';
      }

      // Actualizar estado
      session.state = aiResponse.next_state;

      // Agregar respuesta al historial
      session.messageHistory.push({
        role: 'assistant',
        content: aiResponse.message,
        timestamp: new Date(),
      });

      // Guardar sesión si corresponde
      if (!ACTIONS_SKIP_SAVE.includes(aiResponse.action)) {
        console.log(`💾 Guardando sesión:`, {
          state: session.state,
          selectedProductId: session.selectedProductId,
          searchResultsCount: session.searchResults?.length || 0,
          pendingAction: session.pendingAction ? `${session.pendingAction.action}` : 'none',
        });
        await sessionManager.saveSession(session);
      }

      // Enviar mensajes según la acción
      await this.sendResponseMessages(session, aiResponse, phone, actionSentOwnMessage);

    } catch (error) {
      console.error('Error procesando mensaje:', error);
      await messageService.sendMessage(
        phone,
        '❌ Ocurrió un error inesperado. Por favor intenta de nuevo o escribe "reiniciar" para empezar de cero.'
      );
    }
  }

  // ============================================================================
  // MÉTODOS PRIVADOS
  // ============================================================================

  /**
   * Verifica si el remitente está autorizado
   */
  private async checkAuthorization(phone: string): Promise<boolean> {
    const business = await getBusiness();
    
    if (!isPhoneAllowed(phone, business?.whatsapp_allowed_remitents || null)) {
      const businessName = business?.name || 'la tienda';
      await messageService.sendMessage(
        phone,
        `Hola, soy Cleria el asistente de *${businessName}* 🤖\n\n` +
        `Lamentablemente no puedo atender tu solicitud porque no estás en la lista de remitentes permitidos.\n\n` +
        `Si formas parte de *${businessName}*, contacta a un administrador para que te agregue a la lista.`
      );
      console.log(`⚠️ Remitente no autorizado: ${phone}`);
      return false;
    }
    
    return true;
  }

  /**
   * Maneja la transcripción de audio
   */
  private async handleAudioMessage(phone: string, audioUrl: string): Promise<string | null> {
    try {
      setImmediate(async () => {
        await messageService.sendMessage(phone, '🎤 Escuchando tu audio...');
      });
      return await aiProcessor.transcribeAudio(audioUrl);
    } catch {
      await messageService.sendMessage(
        phone,
        '❌ No pude entender el audio. Por favor escribe el mensaje o intenta de nuevo.'
      );
      return null;
    }
  }

  /**
   * Obtiene o crea una sesión de conversación
   */
  private async getOrCreateSession(
    adminId: number,
    phone: string,
    textContent: string,
    messageType: string
  ): Promise<WhatsAppConversationSession> {
    let session = await sessionManager.getSession(phone);

    // Si es un saludo, reiniciar la sesión
    if (session && isGreeting(textContent) && messageType !== 'image') {
      console.log(`🔄 Saludo detectado, reiniciando conversación para ${phone}`);
      await sessionManager.deleteSession(phone);
      session = null;
    }

    // Crear nueva sesión si no existe
    if (!session) {
      session = sessionManager.createNewSession(adminId, phone);
    }

    return session;
  }

  /**
   * Maneja imágenes recibidas (incluyendo álbumes)
   */
  private handleImageMessage(
    session: WhatsAppConversationSession,
    messageData: WebhookMessageReceived['data'] & { media_urls?: string[]; isAlbum?: boolean }
  ): void {
    const mediaUrls = messageData.media_urls || [messageData.media_url];
    const isAlbum = messageData.isAlbum || false;

    for (const url of mediaUrls) {
      if (url && !session.productData.images.includes(url)) {
        session.productData.images.push(url);
      }
    }

    if (isAlbum) {
      console.log(`📸 Álbum procesado: ${mediaUrls.length} imágenes agregadas`);
    }

    // Cambiar a collecting si estaba en idle
    if (session.state === 'idle') {
      session.state = 'collecting';
    }
  }

  /**
   * Detecta cambios de tono en el mensaje
   */
  private detectToneChanges(
    session: WhatsAppConversationSession,
    textContent: string
  ): void {
    if (!textContent || textContent.trim().length === 0) return;

    // Detectar solicitud explícita de tono formal
    if (isRequestingFormalTone(textContent)) {
      session.greetingTone = 'formal';
    }

    // Detectar y actualizar tono del usuario
    const detectedTone = detectUserTone(textContent);
    if (detectedTone !== 'neutral' || !session.userTone) {
      session.userTone = detectedTone;
    }
  }

  /**
   * Envía los mensajes de respuesta apropiados
   * @param actionSentOwnMessage - indica si la acción ya envió su propio mensaje
   */
  private async sendResponseMessages(
    session: WhatsAppConversationSession,
    aiResponse: ReturnType<typeof aiProcessor.parseResponse>,
    phone: string,
    actionSentOwnMessage: boolean
  ): Promise<void> {
    // Si la acción fue process_ai y fue exitosa, enviar el preview
    if (aiResponse.action === 'process_ai' && session.productData.aiResult && !session.lastError) {
      const preview = productActions.formatProductPreview(session);
      await messageService.sendMessage(phone, preview);
      session.state = 'reviewing';
      await sessionManager.saveSession(session);
    } else if (!actionSentOwnMessage && aiResponse.message) {
      // Si la acción no envió su propio mensaje, enviar el mensaje de la IA
      await messageService.sendMessage(phone, aiResponse.message);
    }

    // Enviar mensaje de error si hubo uno
    if (aiResponse.action === 'process_ai' && session.lastError) {
      await messageService.sendMessage(
        phone,
        `❌ ${session.lastError}\n\n¿Quieres intentar de nuevo o enviar otra imagen?`
      );
    }
  }
}

export const conversationProcessor = new ConversationProcessor();
export default conversationProcessor;

