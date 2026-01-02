import { prisma } from '@/config/prisma';
import { redis } from '@/config/redis';
import WasenderClient from './wasender.client';
import {
  WhatsAppConfig,
  WhatsAppConversationSession,
  WebhookEvent,
  WebhookMessageReceived,
  WebhookMessageUpsert,
  WebhookSessionStatus,
  WhatsAppConfigResponse,
  SessionCreateResponse,
  QRCodeResponse,
  SessionStatusResponse,
} from '../schemas/whatsapp.schemas';

const CONVERSATION_SESSION_PREFIX = 'whatsapp:conversation:';
const CONVERSATION_TTL = 30 * 60; // 30 minutos
const LAST_USER_MESSAGE_PREFIX = 'whatsapp:last_user_msg:';
const REMINDER_SENT_PREFIX = 'whatsapp:reminder_sent:';
const PROCESSED_MESSAGE_PREFIX = 'whatsapp:processed_msg:';
const PROCESSED_MESSAGE_TTL = 60; // 60 segundos para evitar reprocesar
const TIMEOUT_FIRST_WARNING = 60; // 60 segundos sin respuesta → enviar recordatorio
const TIMEOUT_CLOSE_SESSION = 30; // 30 segundos después del recordatorio → cerrar
const ALBUM_BUFFER_PREFIX = 'whatsapp:album:';
const ALBUM_BUFFER_TTL = 10; // 10 segundos para agrupar imágenes del álbum
const ALBUM_PROCESS_DELAY = 2000; // 2 segundos de espera para recibir todas las imágenes

function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\s+/g, '').replace(/-/g, '');
  
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  if (cleaned.startsWith('549')) {
    return '+' + cleaned;
  }
  
  if (cleaned.startsWith('54')) {
    return '+' + cleaned;
  }
  
  if (cleaned.length === 10 && /^\d+$/.test(cleaned)) {
    return '+549' + cleaned;
  }
  
  if (cleaned.length === 13 && /^\d+$/.test(cleaned) && cleaned.startsWith('549')) {
    return '+' + cleaned;
  }
  
  return cleaned.startsWith('+') ? cleaned : '+' + cleaned;
}

function normalizeRemitentsList(remitents: string): string {
  return remitents
    .split(',')
    .map(r => r.trim())
    .filter(Boolean)
    .map(r => normalizePhoneNumber(r))
    .join(',');
}

interface AlbumImage {
  url: string;
  messageId: string;
  caption?: string;
}

interface AlbumBuffer {
  phone: string;
  images: AlbumImage[];
  caption?: string;
  pushName?: string;
  timestamp: number;
}

const albumProcessingTimeouts = new Map<string, NodeJS.Timeout>();

class WhatsAppServices {
  /**
   * Obtener configuración de WhatsApp del negocio
   */
  async getConfig(): Promise<WhatsAppConfigResponse> {
    const business = await prisma.businessData.findFirst();
    
    if (!business) {
      return {
        whatsapp_enabled: false,
        whatsapp_connected: false,
        whatsapp_phone_number: null,
        whatsapp_session_id: null,
        has_access_token: false,
        whatsapp_allowed_remitents: null,
      };
    }

    return {
      whatsapp_enabled: business.whatsapp_enabled,
      whatsapp_connected: business.whatsapp_connected,
      whatsapp_phone_number: business.whatsapp_phone_number,
      whatsapp_session_id: business.whatsapp_session_id,
      has_access_token: !!business.whatsapp_access_token,
      whatsapp_allowed_remitents: business.whatsapp_allowed_remitents,
    };
  }

  /**
   * Actualizar configuración de WhatsApp
   */
  async updateConfig(config: WhatsAppConfig): Promise<WhatsAppConfigResponse> {
    const business = await prisma.businessData.findFirst();
    
    if (!business) {
      throw new Error('BUSINESS_NOT_FOUND');
    }

    const updateData: any = {};
    
    if (config.whatsapp_enabled !== undefined) {
      updateData.whatsapp_enabled = config.whatsapp_enabled;
    }
    
    if (config.whatsapp_access_token !== undefined) {
      updateData.whatsapp_access_token = config.whatsapp_access_token;
    }
    
    if (config.whatsapp_allowed_remitents !== undefined) {
      updateData.whatsapp_allowed_remitents = config.whatsapp_allowed_remitents 
        ? normalizeRemitentsList(config.whatsapp_allowed_remitents)
        : '';
    }

    await prisma.businessData.update({
      where: { id: business.id },
      data: updateData,
    });

    return this.getConfig();
  }

  /**
   * Crear una nueva sesión de WhatsApp
   */
  async createSession(name: string, phoneNumber: string, webhookBaseUrl: string): Promise<SessionCreateResponse> {
    const business = await prisma.businessData.findFirst();
    
    if (!business) {
      throw new Error('BUSINESS_NOT_FOUND');
    }

    if (!business.whatsapp_access_token) {
      throw new Error('ACCESS_TOKEN_NOT_CONFIGURED');
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Si ya hay una sesión, eliminarla primero
    if (business.whatsapp_session_id) {
      try {
        const client = new WasenderClient(business.whatsapp_access_token);
        await client.deleteSession(business.whatsapp_session_id);
      } catch (error) {
        console.warn('Error eliminando sesión anterior:', error);
      }
    }

    const client = new WasenderClient(business.whatsapp_access_token);
    
    const result = await client.createSession({
      name,
      phone_number: normalizedPhone,
      webhook_url: `${webhookBaseUrl}/api/whatsapp/webhook`,
      account_protection: false, // Desactivar para permitir múltiples mensajes
      log_messages: true,
      webhook_enabled: true,
      webhook_events: ['messages.upsert'], // Evento para recibir todos los mensajes
      ignore_groups: true,
      ignore_channels: true,
      ignore_broadcasts: true,
    });

    // Guardar datos de la sesión
    await prisma.businessData.update({
      where: { id: business.id },
      data: {
        whatsapp_session_id: result.data.id,
        whatsapp_api_key: result.data.api_key,
        whatsapp_webhook_secret: result.data.webhook_secret,
        whatsapp_connected: false,
        whatsapp_phone_number: null,
      },
    });

    // Conectar la sesión para inicializarla y poder obtener el QR
    try {
      await client.connectSession(result.data.id);
    } catch (error) {
      console.warn('Error al conectar sesión (puede requerir escaneo QR):', error);
    }

    return {
      success: true,
      session_id: result.data.id,
      message: 'Sesión creada. Escanea el código QR para conectar.',
    };
  }

  /**
   * Obtener código QR para escanear
   */
  async getQRCode(): Promise<QRCodeResponse> {
    const business = await prisma.businessData.findFirst();
    
    if (!business) {
      throw new Error('BUSINESS_NOT_FOUND');
    }

    if (!business.whatsapp_access_token) {
      throw new Error('ACCESS_TOKEN_NOT_CONFIGURED');
    }

    if (!business.whatsapp_session_id) {
      throw new Error('SESSION_NOT_CREATED');
    }

    const client = new WasenderClient(business.whatsapp_access_token);
    const result = await client.getQRCode(business.whatsapp_session_id);

    return {
      success: true,
      qr_code: result.data.qrCode,
    };
  }

  /**
   * Obtener estado de la sesión
   */
  async getSessionStatus(): Promise<SessionStatusResponse> {
    const business = await prisma.businessData.findFirst();
    
    if (!business) {
      return { success: true, status: 'no_session' };
    }

    if (!business.whatsapp_session_id || !business.whatsapp_access_token) {
      return { success: true, status: 'no_session' };
    }

    // Si no hay API Key, la sesión no está inicializada correctamente
    if (!business.whatsapp_api_key) {
      return { success: true, status: 'no_session' };
    }

    try {
      const client = new WasenderClient(business.whatsapp_access_token);
      // Usar el API Key de la sesión para obtener el estado (endpoint /api/status)
      const result = await client.getSessionStatusWithApiKey(business.whatsapp_api_key);

      // Mapear estados de WasenderAPI a nuestros estados internos
      let status: 'connected' | 'disconnected' | 'connecting' | 'qr_ready' | 'no_session' = 'disconnected';
      
      switch (result.status) {
        case 'connected':
          status = 'connected';
          break;
        case 'connecting':
          status = 'connecting';
          break;
        case 'need_scan':
          status = 'qr_ready';
          break;
        case 'disconnected':
        case 'logged_out':
        case 'expired':
        default:
          status = 'disconnected';
      }

      // Actualizar estado en la base de datos
      if (status === 'connected') {
        await prisma.businessData.update({
          where: { id: business.id },
          data: {
            whatsapp_connected: true,
          },
        });
      } else if (status === 'disconnected') {
        await prisma.businessData.update({
          where: { id: business.id },
          data: {
            whatsapp_connected: false,
          },
        });
      }

      return {
        success: true,
        status,
        phone_number: business.whatsapp_phone_number || undefined,
      };
    } catch (error) {
      console.error('Error obteniendo estado de sesión:', error);
      return { success: true, status: 'disconnected' };
    }
  }

  /**
   * Desconectar sesión de WhatsApp
   */
  async disconnectSession(): Promise<{ success: boolean; message: string }> {
    const business = await prisma.businessData.findFirst();
    
    if (!business) {
      throw new Error('BUSINESS_NOT_FOUND');
    }

    if (!business.whatsapp_session_id || !business.whatsapp_access_token) {
      throw new Error('SESSION_NOT_CREATED');
    }

    const client = new WasenderClient(business.whatsapp_access_token);
    
    try {
      await client.deleteSession(business.whatsapp_session_id);
    } catch (error) {
      console.warn('Error eliminando sesión en WasenderAPI:', error);
    }

    // Limpiar datos de sesión
    await prisma.businessData.update({
      where: { id: business.id },
      data: {
        whatsapp_session_id: null,
        whatsapp_api_key: null,
        whatsapp_webhook_secret: null,
        whatsapp_connected: false,
        whatsapp_phone_number: null,
      },
    });

    return {
      success: true,
      message: 'Sesión desconectada correctamente',
    };
  }

  /**
   * Enviar mensaje de prueba
   */
  async sendTestMessage(to: string, message: string): Promise<{ success: boolean; message: string }> {
    const business = await prisma.businessData.findFirst();
    
    if (!business) {
      throw new Error('BUSINESS_NOT_FOUND');
    }

    if (!business.whatsapp_api_key) {
      throw new Error('SESSION_NOT_CONNECTED');
    }

    if (!business.whatsapp_connected) {
      throw new Error('SESSION_NOT_CONNECTED');
    }

    const client = new WasenderClient(business.whatsapp_access_token || '');
    await client.sendTextMessage(business.whatsapp_api_key, { to, message });

    return {
      success: true,
      message: 'Mensaje enviado correctamente',
    };
  }

  /**
   * Enviar mensaje de WhatsApp (para uso interno)
   */
  async sendMessage(to: string, message: string): Promise<void> {
    const business = await prisma.businessData.findFirst();
    
    if (!business?.whatsapp_api_key || !business.whatsapp_connected) {
      throw new Error('WhatsApp no está conectado');
    }

    const client = new WasenderClient(business.whatsapp_access_token || '');
    await client.sendTextMessage(business.whatsapp_api_key, { to, message });
  }

  /**
   * Procesar webhook de WasenderAPI
   */
  async handleWebhook(event: WebhookEvent, signature?: string): Promise<void> {
    const business = await prisma.businessData.findFirst();
    
    if (!business) {
      console.warn('Webhook recibido pero no hay negocio configurado');
      return;
    }

    // Validar firma si está configurado el secret
    if (business.whatsapp_webhook_secret && signature) {
      // TODO: Implementar validación de firma
    }

    const eventType = event.event;
    
    switch (eventType) {
      case 'session.status':
        await this.handleSessionStatusEvent(event as WebhookSessionStatus);
        break;
      case 'messages.received':
        await this.handleMessageReceivedEvent(event as WebhookMessageReceived);
        break;
      case 'messages.upsert':
        // messages.upsert incluye mensajes entrantes y salientes
        await this.handleMessageUpsertEvent(event as WebhookMessageUpsert);
        break;
      case 'qr.updated':
        // QR actualizado, el frontend lo obtendrá por polling
        console.log('QR actualizado para sesión:', event.session_id);
        break;
      default:
        console.log('Evento no manejado:', eventType);
    }
  }

  /**
   * Manejar evento de cambio de estado de sesión
   */
  private async handleSessionStatusEvent(event: WebhookSessionStatus): Promise<void> {
    const business = await prisma.businessData.findFirst();
    
    if (!business || business.whatsapp_session_id !== event.session_id) {
      return;
    }

    const isConnected = event.data.status === 'connected';
    
    await prisma.businessData.update({
      where: { id: business.id },
      data: {
        whatsapp_connected: isConnected,
        whatsapp_phone_number: event.data.phone_number || business.whatsapp_phone_number,
      },
    });

    console.log(`Sesión ${event.session_id} estado: ${event.data.status}`);
  }

  /**
   * Manejar evento de mensaje recibido (formato legacy)
   */
  private async handleMessageReceivedEvent(event: WebhookMessageReceived): Promise<void> {
    // Ignorar mensajes de grupos
    if (event.data.isGroup) {
      return;
    }

    const fromPhone = event.data.from;
    
    console.log(`📱 Mensaje recibido (legacy) de: ${fromPhone}`);

    // Importar dinámicamente para evitar dependencia circular
    const { conversationAI } = await import('./conversation.ai');
    await conversationAI.processMessage(0, fromPhone, event.data);
  }

  /**
   * Manejar evento messages.upsert (incluye entrantes y salientes)
   */
  private async handleMessageUpsertEvent(event: WebhookMessageUpsert): Promise<void> {
    console.log('📩 Webhook messages.upsert recibido:', JSON.stringify(event, null, 2));
    
    const messages = (event.data as any)?.messages;
    if (!messages) {
      console.error('Estructura de mensaje inválida:', event);
      return;
    }

    const key = messages.key;
    
    if (key?.fromMe) {
      console.log('Ignorando mensaje saliente del bot (fromMe: true)');
      return;
    }

    if (messages.broadcast) {
      console.log('Ignorando broadcast');
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
      const processedKey = `${PROCESSED_MESSAGE_PREFIX}${messageId}`;
      const alreadyProcessed = await redis.get(processedKey);
      if (alreadyProcessed) {
        console.log(`⏭️ Mensaje ${messageId} ya procesado, ignorando duplicado`);
        return;
      }
      await redis.set(processedKey, '1', 'EX', PROCESSED_MESSAGE_TTL);
    }
    
    console.log(`📱 Mensaje recibido de: ${fromPhone}`);

    const msgContent = messages.message;
    
    // Ignorar mensajes "albumMessage" que son solo anuncios de un álbum entrante (sin contenido real)
    if (msgContent?.albumMessage && !msgContent?.imageMessage && !msgContent?.videoMessage) {
      console.log(`⏭️ Ignorando anuncio de álbum (expectedImageCount: ${msgContent.albumMessage.expectedImageCount})`);
      return;
    }
    
    const msgContextInfo = msgContent?.messageContextInfo;
    const isPartOfAlbum = msgContextInfo?.messageAssociation?.associationType === 'MEDIA_ALBUM';
    const albumParentId = msgContextInfo?.messageAssociation?.parentMessageKey?.id;
    
    const business = await prisma.businessData.findFirst();
    const apiKey = business?.whatsapp_api_key;

    if (isPartOfAlbum && albumParentId && msgContent?.imageMessage) {
      console.log(`📸 Imagen parte de álbum (parent: ${albumParentId})`);
      // Pasar messageBody como caption alternativo (a veces el caption viene ahí)
      const alternativeCaption = messages.messageBody || msgContent.imageMessage?.caption;
      await this.handleAlbumImage(fromPhone, messageId, msgContent, messages.pushName, albumParentId, apiKey, business?.whatsapp_access_token, alternativeCaption);
      return;
    }

    let messageType: 'text' | 'image' | 'video' | 'document' | 'audio' | 'sticker' | 'location' | 'contact' = 'text';
    let messageBody = '';
    let mediaUrl: string | undefined;
    let caption: string | undefined;
    
    if (msgContent?.imageMessage) {
      messageType = 'image';
      caption = msgContent.imageMessage.caption;
      
      if (apiKey && msgContent.imageMessage.url) {
        try {
          console.log('🔓 Desencriptando imagen con WasenderAPI...');
          const client = new WasenderClient(business?.whatsapp_access_token || '');
          const decrypted = await client.decryptMedia(apiKey, {
            key: { id: messageId },
            message: { imageMessage: msgContent.imageMessage },
          });
          mediaUrl = decrypted.publicUrl;
          console.log('✅ Imagen desencriptada:', mediaUrl);
        } catch (error) {
          console.error('❌ Error desencriptando imagen:', error);
          mediaUrl = msgContent.imageMessage.url;
        }
      } else {
        mediaUrl = msgContent.imageMessage.url;
      }
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
      
      if (apiKey && msgContent.audioMessage.url) {
        try {
          console.log('🔓 Desencriptando audio con WasenderAPI...');
          const client = new WasenderClient(business?.whatsapp_access_token || '');
          const decrypted = await client.decryptMedia(apiKey, {
            key: { id: messageId },
            message: { audioMessage: msgContent.audioMessage },
          });
          mediaUrl = decrypted.publicUrl;
          console.log('✅ Audio desencriptado:', mediaUrl);
        } catch (error) {
          console.error('❌ Error desencriptando audio:', error);
          mediaUrl = msgContent.audioMessage.url;
        }
      } else {
        mediaUrl = msgContent.audioMessage.url;
      }
    } else if (msgContent?.stickerMessage) {
      messageType = 'sticker';
      mediaUrl = msgContent.stickerMessage.url;
    } else {
      messageBody = messages.messageBody || 
                    msgContent?.conversation || 
                    msgContent?.extendedTextMessage?.text || 
                    '';
    }

    const messageData = {
      id: messages.id || key?.id || '',
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

    console.log(`📝 Mensaje procesado: tipo=${messageType}, body="${messageBody?.substring(0, 50)}..."`);

    const { conversationAI } = await import('./conversation.ai');
    await conversationAI.processMessage(0, fromPhone, messageData);
  }

  /**
   * Manejar imágenes que son parte de un álbum
   */
  private async handleAlbumImage(
    fromPhone: string,
    messageId: string,
    msgContent: any,
    pushName: string | undefined,
    albumParentId: string,
    apiKey: string | null | undefined,
    accessToken: string | null | undefined,
    alternativeCaption?: string
  ): Promise<void> {
    const albumKey = `${ALBUM_BUFFER_PREFIX}${fromPhone}:${albumParentId}`;
    const lockKey = `${albumKey}:lock`;
    
    // Desencriptar primero (fuera del lock)
    let decryptedUrl: string | undefined;
    if (apiKey && msgContent.imageMessage?.url) {
      try {
        console.log('🔓 Desencriptando imagen de álbum...');
        const client = new WasenderClient(accessToken || '');
        const decrypted = await client.decryptMedia(apiKey, {
          key: { id: messageId },
          message: { imageMessage: msgContent.imageMessage },
        });
        decryptedUrl = decrypted.publicUrl;
        console.log('✅ Imagen de álbum desencriptada:', decryptedUrl);
      } catch (error) {
        console.error('❌ Error desencriptando imagen de álbum:', error);
        decryptedUrl = msgContent.imageMessage?.url;
      }
    }

    // El caption puede venir de imageMessage.caption o de messageBody (alternativeCaption)
    const imageCaption = msgContent.imageMessage?.caption || alternativeCaption;

    // Usar lock para evitar condición de carrera
    const maxRetries = 10;
    let acquired = false;
    
    for (let i = 0; i < maxRetries; i++) {
      const result = await redis.set(lockKey, '1', 'EX', 5, 'NX');
      if (result === 'OK') {
        acquired = true;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!acquired) {
      console.error('❌ No se pudo obtener lock para álbum');
      return;
    }

    try {
      const existingBuffer = await redis.get(albumKey);
      let buffer: AlbumBuffer;
      
      if (existingBuffer) {
        buffer = JSON.parse(existingBuffer);
      } else {
        buffer = {
          phone: fromPhone,
          images: [],
          pushName,
          timestamp: Date.now(),
        };
      }

      // Verificar si esta imagen ya está en el buffer (evitar duplicados)
      if (!buffer.images.some(img => img.messageId === messageId)) {
        buffer.images.push({
          url: decryptedUrl || msgContent.imageMessage?.url || '',
          messageId,
          caption: imageCaption,
        });
      }

      // Guardar el caption del álbum si no tenemos uno
      if (imageCaption && !buffer.caption) {
        buffer.caption = imageCaption;
      }

      await redis.set(albumKey, JSON.stringify(buffer), 'EX', ALBUM_BUFFER_TTL);
      console.log(`⏳ Álbum buffered: ${buffer.images.length} imágenes, caption="${buffer.caption?.substring(0, 30) || 'sin caption'}..."`);
    } finally {
      await redis.del(lockKey);
    }

    // Manejar timeout fuera del lock
    const timeoutKey = `${fromPhone}:${albumParentId}`;
    if (albumProcessingTimeouts.has(timeoutKey)) {
      clearTimeout(albumProcessingTimeouts.get(timeoutKey)!);
    }

    const timeout = setTimeout(async () => {
      await this.processAlbum(albumKey, fromPhone, albumParentId);
      albumProcessingTimeouts.delete(timeoutKey);
    }, ALBUM_PROCESS_DELAY);

    albumProcessingTimeouts.set(timeoutKey, timeout);
  }

  /**
   * Procesar un álbum completo de imágenes
   */
  private async processAlbum(albumKey: string, fromPhone: string, albumParentId: string): Promise<void> {
    const bufferData = await redis.get(albumKey);
    if (!bufferData) {
      console.log('⚠️ Buffer de álbum vacío o expirado');
      return;
    }

    const buffer: AlbumBuffer = JSON.parse(bufferData);
    await redis.del(albumKey);

    console.log(`📸 Procesando álbum completo: ${buffer.images.length} imágenes`);

    const imageUrls = buffer.images.map(img => img.url).filter(Boolean);
    
    const messageData = {
      id: albumParentId,
      from: fromPhone,
      to: '',
      type: 'image' as const,
      body: '',
      media_url: imageUrls[0],
      media_urls: imageUrls,
      caption: buffer.caption,
      timestamp: String(buffer.timestamp),
      pushName: buffer.pushName,
      isGroup: false,
      groupId: undefined,
      isAlbum: true,
    };

    console.log(`📝 Álbum procesado: ${imageUrls.length} imágenes, caption="${buffer.caption?.substring(0, 50)}..."`);

    const { conversationAI } = await import('./conversation.ai');
    await conversationAI.processMessage(0, fromPhone, messageData);
  }

  /**
   * Obtener sesión de conversación desde Redis
   */
  async getConversationSession(phone: string): Promise<WhatsAppConversationSession | null> {
    const key = `${CONVERSATION_SESSION_PREFIX}${phone}`;
    const data = await redis.get(key);
    
    if (!data) {
      return null;
    }

    return JSON.parse(data);
  }

  /**
   * Guardar sesión de conversación en Redis
   */
  async saveConversationSession(session: WhatsAppConversationSession): Promise<void> {
    const key = `${CONVERSATION_SESSION_PREFIX}${session.phone}`;
    await redis.setex(key, CONVERSATION_TTL, JSON.stringify(session));
  }

  /**
   * Eliminar sesión de conversación
   */
  async deleteConversationSession(phone: string): Promise<void> {
    const key = `${CONVERSATION_SESSION_PREFIX}${phone}`;
    const lastMsgKey = `${LAST_USER_MESSAGE_PREFIX}${phone}`;
    const reminderKey = `${REMINDER_SENT_PREFIX}${phone}`;
    await redis.del(key);
    await redis.del(lastMsgKey);
    await redis.del(reminderKey);
  }

  /**
   * Crear nueva sesión de conversación
   */
  createNewConversationSession(adminId: number, phone: string): WhatsAppConversationSession {
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
   * Actualizar timestamp del último mensaje del usuario
   */
  async updateLastUserMessage(phone: string): Promise<void> {
    const key = `${LAST_USER_MESSAGE_PREFIX}${phone}`;
    await redis.setex(key, CONVERSATION_TTL, Date.now().toString());
    // Limpiar el flag de recordatorio cuando el usuario responde
    const reminderKey = `${REMINDER_SENT_PREFIX}${phone}`;
    await redis.del(reminderKey);
  }

  /**
   * Obtener timestamp del último mensaje del usuario
   */
  async getLastUserMessageTime(phone: string): Promise<number | null> {
    const key = `${LAST_USER_MESSAGE_PREFIX}${phone}`;
    const timestamp = await redis.get(key);
    return timestamp ? parseInt(timestamp) : null;
  }

  /**
   * Marcar que se envió un recordatorio
   */
  async markReminderSent(phone: string): Promise<void> {
    const key = `${REMINDER_SENT_PREFIX}${phone}`;
    await redis.setex(key, TIMEOUT_CLOSE_SESSION + 10, Date.now().toString());
  }

  /**
   * Verificar si ya se envió un recordatorio
   */
  async wasReminderSent(phone: string): Promise<boolean> {
    const key = `${REMINDER_SENT_PREFIX}${phone}`;
    const value = await redis.get(key);
    return value !== null;
  }

  /**
   * Obtener todas las sesiones activas (para el worker de timeout)
   */
  async getActiveSessionPhones(): Promise<string[]> {
    const keys = await redis.keys(`${CONVERSATION_SESSION_PREFIX}*`);
    return keys.map(key => key.replace(CONVERSATION_SESSION_PREFIX, ''));
  }

  /**
   * Verificar timeouts de todas las sesiones activas
   */
  async checkSessionTimeouts(): Promise<void> {
    try {
      const phones = await this.getActiveSessionPhones();
      
      for (const phone of phones) {
        await this.checkSingleSessionTimeout(phone);
      }
    } catch (error) {
      console.error('Error verificando timeouts de sesiones:', error);
    }
  }

  /**
   * Verificar timeout de una sesión específica
   */
  private async checkSingleSessionTimeout(phone: string): Promise<void> {
    try {
      const session = await this.getConversationSession(phone);
      if (!session) return;

      // Solo verificar si la sesión está en un estado donde espera respuesta del usuario
      if (session.state === 'idle' && session.productData.images.length === 0) {
        // Sesión nueva sin actividad, no hacer nada
        return;
      }

      const lastMsgTime = await this.getLastUserMessageTime(phone);
      if (!lastMsgTime) return;

      const now = Date.now();
      const elapsedSeconds = (now - lastMsgTime) / 1000;
      const reminderSent = await this.wasReminderSent(phone);

      if (!reminderSent && elapsedSeconds >= TIMEOUT_FIRST_WARNING) {
        // Enviar recordatorio
        console.log(`⏰ Enviando recordatorio a ${phone} (${Math.round(elapsedSeconds)}s sin respuesta)`);
        
        await this.sendMessage(
          phone,
          '👋 ¿Sigues ahí? Noté que no has respondido. ¿Necesitas ayuda con algo?\n\n' +
          'Si no respondes en 30 segundos, cerraré esta conversación para liberar recursos. ' +
          'Puedes iniciar una nueva cuando quieras enviándome una imagen. 📷'
        );
        
        await this.markReminderSent(phone);
      } else if (reminderSent) {
        // Verificar si ya pasó el tiempo después del recordatorio
        const reminderKey = `${REMINDER_SENT_PREFIX}${phone}`;
        const reminderTime = await redis.get(reminderKey);
        
        if (reminderTime) {
          const reminderElapsed = (now - parseInt(reminderTime)) / 1000;
          
          if (reminderElapsed >= TIMEOUT_CLOSE_SESSION) {
            // Cerrar sesión
            console.log(`⏰ Cerrando sesión de ${phone} por inactividad`);
            
            await this.sendMessage(
              phone,
              '👋 He cerrado esta conversación por inactividad.\n\n' +
              'Cuando quieras cargar un producto, solo envíame una imagen y empezamos de nuevo. ¡Hasta pronto! 📦'
            );
            
            await this.deleteConversationSession(phone);
          }
        }
      }
    } catch (error) {
      console.error(`Error verificando timeout para ${phone}:`, error);
    }
  }

  /**
   * Iniciar el worker de verificación de timeouts
   */
  startTimeoutWorker(): void {
    const WORKER_INTERVAL = 10000; // Verificar cada 10 segundos
    
    console.log('⏰ Worker de timeout de sesiones iniciado');
    
    setInterval(async () => {
      await this.checkSessionTimeouts();
    }, WORKER_INTERVAL);
  }
}

export const whatsAppServices = new WhatsAppServices();
export default whatsAppServices;

