import { redis } from '@/config/redis';
import { prisma } from '@/config/prisma';
import { getBusiness, getWasenderApiKey, hasWasenderApiKey } from '../utils/business.utils';
import { sessionService } from './session.service';
import { albumService } from './album.service';
import { 
  getProcessedMessageKey, 
  PROCESSED_MESSAGE_TTL 
} from '../constants/redis-keys';
import {
  WebhookEvent,
  WebhookMessageUpsert,
  WebhookSessionStatus,
  WebhookMessageReceived,
} from '../schemas/whatsapp.schemas';

class WebhookHandler {
  /**
   * Resuelve el tenant desde el número de teléfono del remitente.
   * Busca en BusinessData.whatsapp_phone_number para encontrar a qué negocio pertenece.
   */
  async resolveTenantFromPhone(phoneNumber: string): Promise<{ tenantId: string; business: any } | null> {
    try {
      
      const normalizedPhone = phoneNumber.replace(/[+\s-]/g, '');
      
      
      const business = await prisma.businessData.findFirst({
        where: {
          OR: [
            { whatsapp_phone_number: normalizedPhone },
            { whatsapp_phone_number: `+${normalizedPhone}` },
            { whatsapp_phone_number: phoneNumber },
          ]
        },
        include: { tenant: true }
      });
      
      if (business && business.tenantId) {
        return { tenantId: business.tenantId, business };
      }
      
      return null;
    } catch (error) {
      console.error('Error resolviendo tenant desde teléfono:', error);
      return null;
    }
  }

  /**
   * Punto de entrada principal para procesar webhooks
   */
  async handleWebhook(event: WebhookEvent, _signature?: string): Promise<void> {
    
    
    
    const eventType = event.event;
    
    switch (eventType) {
      case 'session.status':
        await this.handleSessionStatusEvent(event as WebhookSessionStatus);
        break;
      case 'messages.upsert':
        await this.handleMessageUpsertEvent(event as WebhookMessageUpsert);
        break;
      case 'qr.updated':
        console.log('QR actualizado para sesión:', event.session_id);
        break;
      default:
        console.log('Evento no manejado:', eventType);
    }
  }

  /**
   * Maneja eventos de cambio de estado de sesión
   */
  private async handleSessionStatusEvent(event: WebhookSessionStatus): Promise<void> {
    await sessionService.handleSessionStatusEvent(
      event.session_id,
      event.data.status,
      event.data.phone_number
    );
  }


  private async handleMessageUpsertEvent(event: WebhookMessageUpsert): Promise<void> {
    
    const messages = (event.data as any)?.messages;
    if (!messages) {
      console.error('Estructura de mensaje inválida:', event);
      return;
    }

    const key = messages.key;
    
    if (key?.fromMe || messages.broadcast) {
      return;
    }

    const fromPhone = key?.cleanedSenderPn || 
                      key?.senderPn?.split('@')[0] || 
                      messages.remoteJid?.split('@')[0];
    
    if (!fromPhone) {
      console.error('No se pudo obtener el número de teléfono del mensaje:', event);
      return;
    }
    
    const messageId = key?.id || messages.id;
    
    if (messageId) {
      const processedKey = getProcessedMessageKey(messageId);
      const alreadyProcessed = await redis.get(processedKey);
      if (alreadyProcessed) {
        console.log(`⏭️ Mensaje ${messageId} ya procesado, ignorando duplicado`);
        return;
      }
      await redis.set(processedKey, '1', 'EX', PROCESSED_MESSAGE_TTL);
    }
    
    console.log(`📱 Mensaje recibido de: ${fromPhone}`);

    
    const tenantInfo = await this.resolveTenantFromPhone(fromPhone);
    
    if (!tenantInfo) {
      console.warn(`⚠️ No se encontró tenant para el número: ${fromPhone}`);
      
      return;
    }
    
    console.log(`🏪 Tenant resuelto: ${tenantInfo.tenantId} para número: ${fromPhone}`);

    const msgContent = messages.message;
    
    if (msgContent?.albumMessage && !msgContent?.imageMessage && !msgContent?.videoMessage) {
      console.log(`⏭️ Ignorando anuncio de álbum (expectedImageCount: ${msgContent.albumMessage.expectedImageCount})`);
      return;
    }
    
    const msgContextInfo = msgContent?.messageContextInfo;
    const isPartOfAlbum = msgContextInfo?.messageAssociation?.associationType === 'MEDIA_ALBUM';
    const albumParentId = msgContextInfo?.messageAssociation?.parentMessageKey?.id;
    
    const business = tenantInfo.business;
    const apiKey = business?.whatsapp_api_key;
    const wasenderToken = hasWasenderApiKey() ? getWasenderApiKey() : undefined;

    if (isPartOfAlbum && albumParentId && msgContent?.imageMessage) {
      console.log(`📸 Imagen parte de álbum (parent: ${albumParentId})`);
      const alternativeCaption = messages.messageBody || msgContent.imageMessage?.caption;
      await albumService.handleAlbumImage(
        fromPhone,
        messageId,
        msgContent,
        messages.pushName,
        albumParentId,
        apiKey,
        wasenderToken,
        alternativeCaption
      );
      return;
    }

    const messageData = await this.parseMessageContent(
      messages,
      msgContent,
      fromPhone,
      messageId,
      apiKey,
      wasenderToken
    );

    console.log(`📝 Mensaje procesado: tipo=${messageData.type}, body="${messageData.body?.substring(0, 50)}..."`);

    const { conversationProcessor } = await import('./conversation/conversation.processor');
    
    await conversationProcessor.processMessage(0, fromPhone, messageData, tenantInfo.tenantId);
  }


  private async parseMessageContent(
    messages: any,
    msgContent: any,
    fromPhone: string,
    messageId: string,
    apiKey: string | null | undefined,
    accessToken: string | null | undefined
  ): Promise<WebhookMessageReceived['data']> {
    let messageType: WebhookMessageReceived['data']['type'] = 'text';
    let messageBody = '';
    let mediaUrl: string | undefined;
    let caption: string | undefined;

    if (msgContent?.imageMessage) {
      messageType = 'image';
      caption = msgContent.imageMessage.caption;
      mediaUrl = await this.decryptMediaIfNeeded(
        apiKey,
        accessToken,
        messageId,
        { imageMessage: msgContent.imageMessage }
      ) || msgContent.imageMessage.url;
    } else if (msgContent?.videoMessage) {
      messageType = 'video';
      caption = msgContent.videoMessage.caption;
      mediaUrl = msgContent.videoMessage.url;
    } else if (msgContent?.documentMessage) {
      messageType = 'document';
      caption = msgContent.documentMessage.caption;
      mediaUrl = msgContent.documentMessage.url;
    } else if (msgContent?.audioMessage) {
      messageType = 'audio';
      mediaUrl = await this.decryptMediaIfNeeded(
        apiKey,
        accessToken,
        messageId,
        { audioMessage: msgContent.audioMessage }
      ) || msgContent.audioMessage.url;
    } else if (msgContent?.stickerMessage) {
      messageType = 'sticker';
      mediaUrl = msgContent.stickerMessage.url;
    } else {
      messageBody = messages.messageBody || 
                    msgContent?.conversation || 
                    msgContent?.extendedTextMessage?.text || 
                    '';
    }

    return {
      id: messages.id || messageId || '',
      from: fromPhone,
      to: '',
      type: messageType,
      body: messageBody,
      media_url: mediaUrl,
      caption: caption,
      timestamp: String(messages.messageTimestamp || Date.now()),
      pushName: messages.pushName,
      isGroup: false,
      groupId: undefined,
    };
  }


  private async decryptMediaIfNeeded(
    apiKey: string | null | undefined,
    accessToken: string | null | undefined,
    messageId: string,
    messageData: {
      imageMessage?: any;
      audioMessage?: any;
    }
  ): Promise<string | undefined> {
    if (!apiKey) return undefined;

    try {
      const WasenderClient = (await import('./wasender.client')).default;
      const client = new WasenderClient(accessToken || '');
      const decrypted = await client.decryptMedia(apiKey, {
        key: { id: messageId },
        message: messageData,
      });
      console.log('✅ Media desencriptada:', decrypted.publicUrl);
      return decrypted.publicUrl;
    } catch (error) {
      console.error('❌ Error desencriptando media:', error);
      return undefined;
    }
  }
}

export const webhookHandler = new WebhookHandler();
export default webhookHandler;

