import { sessionManager } from './session.manager';
import { aiProcessor } from './ai.processor';
import { actionExecutor } from './action.executor';
import { messageService } from '../message.service';
import {
  isGreeting,
  detectGreetingTone,
  detectUserTone,
  isRequestingFormalTone,
} from './tone.detector';
import { isPhoneAllowed } from '../../utils/phone.utils';
import { getBusiness } from '../../utils/business.utils';
import type {
  WhatsAppConversationSession,
  WebhookMessageReceived,
} from '../../schemas/whatsapp.schemas';
const ACTIONS_SKIP_SAVE = ['cancel', 'reset', 'create_product', 'end_conversation'];
class ConversationProcessor {
  async processMessage(
    userId: number,
    phone: string,
    messageData: WebhookMessageReceived['data'] & { media_urls?: string[]; isAlbum?: boolean }
  ): Promise<void> {
    try {
      const authorized = await this.checkAuthorization(phone);
      if (!authorized) return;
      let textContent = messageData.body || '';
      let messageType: 'text' | 'image' | 'audio' = 'text';
      const mediaUrl = messageData.media_url;
      if (messageData.type === 'audio' && messageData.media_url) {
        messageType = 'audio';
        const transcription = await this.handleAudioMessage(phone, messageData.media_url);
        if (!transcription) return;
        textContent = transcription;
      }
      let session = await this.getOrCreateSession(userId, phone, textContent, messageData.type);
      if (isGreeting(textContent) && messageData.type !== 'image' && !session.greetingTone) {
        session.greetingTone = detectGreetingTone(textContent);
      }
      await sessionManager.updateLastUserMessage(phone);
      session = sessionManager.ensureSessionFields(session);
      session.lastActivity = new Date();
      if (messageData.type === 'image' && (messageData.media_url || messageData.media_urls)) {
        messageType = 'image';
        this.handleImageMessage(session, messageData);
        textContent = messageData.caption || '';
        if (textContent) {
          const extracted = this.extractProductDataFromCaption(textContent);
          if (extracted.price !== null && extracted.price > 10 && !session.productData.price) {
            session.productData.price = extracted.price;
          }
          if (extracted.stock !== null && extracted.stock > 0) {
            session.productData.stock = extracted.stock;
          }
          if (extracted.context) {
            session.productData.additionalContext = extracted.context;
          }
        }
        await this.sendGreetingIfNeeded(session, phone, textContent);
      }
      this.detectToneChanges(session, textContent);
      if (session.state === 'collecting' && !session.productData.price && textContent && messageType === 'text') {
        const price = this.extractPrice(textContent);
        if (price !== null && price > 10) {
          session.productData.price = price;
        }
      }
      if (messageType === 'text' && this.isKeepAlivePing(textContent)) {
        session.messageHistory.push({
          role: 'assistant',
          content: '¡Aquí sigo!',
          timestamp: new Date(),
        });
        await messageService.sendMessage(
          phone,
          '¡Aquí sigo!'
        );
        await sessionManager.saveSession(session);
        return;
      }
      session.messageHistory.push({
        role: 'user',
        content: textContent || (messageType === 'image' ? '[imagen]' : ''),
        timestamp: new Date(),
      });
      await sessionManager.saveSession(session);
      const aiResponse = await aiProcessor.generateResponse(
        session,
        textContent,
        messageType,
        mediaUrl
      );
      let actionSentOwnMessage = false;
      try {
        actionSentOwnMessage = await actionExecutor.execute(session, aiResponse);
      } catch (actionError) {
        console.error('Error ejecutando acción:', actionError);
        session.lastError = actionError instanceof Error ? actionError.message : 'Error desconocido';
      }
      if (aiResponse.action !== 'process_ai') {
        session.state = aiResponse.next_state;
      }
      session.messageHistory.push({
        role: 'assistant',
        content: aiResponse.message,
        timestamp: new Date(),
      });
      if (!ACTIONS_SKIP_SAVE.includes(aiResponse.action)) {
        console.log(`💾 Guardando sesión:`, {
          state: session.state,
          selectedProductId: session.selectedProductId,
          searchResultsCount: session.searchResults?.length || 0,
          pendingAction: session.pendingAction ? `${session.pendingAction.action}` : 'none',
        });
        await sessionManager.saveSession(session);
      }
      await this.sendResponseMessages(session, aiResponse, phone, actionSentOwnMessage);
    } catch (error) {
      console.error('Error procesando mensaje:', error);
      await messageService.sendMessage(
        phone,
        '❌ Ocurrió un error inesperado. Por favor intenta de nuevo o escribe "reiniciar" para empezar de cero.'
      );
    }
  }
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
  private async getOrCreateSession(
    userId: number,
    phone: string,
    textContent: string,
    messageType: string
  ): Promise<WhatsAppConversationSession> {
    let session = await sessionManager.getSession(phone);
    if (session && isGreeting(textContent) && messageType !== 'image') {
      console.log(`🔄 Saludo detectado, reiniciando conversación para ${phone}`);
      await sessionManager.deleteSession(phone);
      session = null;
    }
    if (!session) {
      session = sessionManager.createNewSession(userId, phone);
    }
    return session;
  }
  private handleImageMessage(
    session: WhatsAppConversationSession,
    messageData: WebhookMessageReceived['data'] & { media_urls?: string[]; isAlbum?: boolean }
  ): void {
    if (session.state !== 'collecting' && session.state !== 'reviewing') {
      session.productData = { images: [] };
      session.selectedProductId = undefined;
      session.searchResults = undefined;
      session.pendingAction = undefined;
      session.categoryPromptShown = false; 
      session.state = 'collecting';
    }
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
  }
  private async sendGreetingIfNeeded(
    session: WhatsAppConversationSession,
    phone: string,
    textContent: string
  ): Promise<void> {
    if (session.hasGreeted) return;
    if (textContent && isGreeting(textContent)) {
      session.hasGreeted = true;
      return;
    }
    const hasAssistantMessages = session.messageHistory.some(msg => msg.role === 'assistant');
    if (!hasAssistantMessages) {
      const business = await getBusiness();
      const businessName = business?.name || 'la tienda';
      const hasImages = session.productData.images.length > 0;
      const hasPrice = session.productData.price !== undefined && session.productData.price > 0;
      const hasStock = session.productData.stock !== undefined && session.productData.stock > 0;
      const hasContext = session.productData.additionalContext && session.productData.additionalContext.length > 0;
      let greeting: string;
      if (hasImages && hasPrice) {
        const priceStr = `$${session.productData.price!.toLocaleString()}`;
        const stockStr = hasStock ? `, stock: ${session.productData.stock}` : '';
        const contextStr = hasContext ? ` (${session.productData.additionalContext})` : '';
        greeting = `¡Hola! Soy Cleria, asistente de *${businessName}* 📸\n\nYa tengo tu imagen${contextStr}, precio ${priceStr}${stockStr}. Procesando...`;
      } else if (hasImages) {
        greeting = `¡Hola! Soy Cleria, asistente de *${businessName}* 📸\n\nYa tengo tu imagen. ¿Cuál es el precio?`;
      } else {
        greeting = `¡Hola! Soy Cleria, asistente de *${businessName}*`;
      }
      await messageService.sendMessage(phone, greeting);
      session.messageHistory.push({
        role: 'assistant',
        content: greeting,
        timestamp: new Date(),
      });
      session.hasGreeted = true;
      await sessionManager.saveSession(session);
    }
  }
  private detectToneChanges(
    session: WhatsAppConversationSession,
    textContent: string
  ): void {
    if (!textContent || textContent.trim().length === 0) return;
    if (isRequestingFormalTone(textContent)) {
      session.greetingTone = 'formal';
    }
    const detectedTone = detectUserTone(textContent);
    if (detectedTone !== 'neutral' || !session.userTone) {
      session.userTone = detectedTone;
    }
    const hasAssistantMessages = session.messageHistory.some(msg => msg.role === 'assistant');
    if (!hasAssistantMessages) {
      session.messageHistory.push({
        role: 'system',
        content: 'Primera interacción: SALUDA y preséntate antes de pedir datos.',
        timestamp: new Date(),
      });
    } else {
      session.hasGreeted = true;
    }
  }
  private isKeepAlivePing(text: string): boolean {
    if (!text) return false;
    const normalized = text.trim().toLowerCase();
    if (normalized.length > 24) return false;
    const verbs = ['cambia', 'actualiza', 'edita', 'borra', 'elimina', 'publica', 'pone', 'pon', 'sube'];
    if (verbs.some(v => normalized.includes(v))) return false;
    const patterns = [
      /^s[ií]$/i,
      /^s[ií]\s*todav[ií]a$/i,
      /^sigo$/i,
      /^sigo\s+aqu[ií]$/i,
      /^sigo\s+ac[aá]$/i,
      /^aqu[ií]$/i,
      /^ac[aá]$/i,
      /^todav[ií]a$/i,
      /^a[uú]n\s+aqu[ií]?$/i,
      /^a[uú]n$/i,
    ];
    return patterns.some(p => p.test(normalized));
  }
  private extractProductDataFromCaption(text: string): { 
    price: number | null; 
    stock: number | null; 
    context: string | null;
  } {
    if (!text) return { price: null, stock: null, context: null };
    let price: number | null = null;
    let stock: number | null = null;
    let context: string | null = null;
    const normalized = text.trim();
    const stockPatterns = [
      /(\d+)\s*(?:en\s*stock|unidades?|uni\.?|u\b)/i,
      /stock[:\s]*(\d+)/i,
      /x(\d+)\b/i,
    ];
    for (const pattern of stockPatterns) {
      const match = normalized.match(pattern);
      if (match) {
        stock = parseInt(match[1] ?? "0", 10);
        break;
      }
    }
    const numberMatches = normalized.replace(/\./g, '').match(/\d+(?:[.,]\d+)?/g);
    if (numberMatches) {
      for (const numStr of numberMatches) {
        const num = Number(numStr.replace(',', '.'));
        if (Number.isFinite(num) && num > 10) {
          if (stock !== null && num === stock) continue;
          price = num;
          break;
        }
      }
      if (stock === null && numberMatches.length >= 2 && price !== null) {
        for (const numStr of numberMatches) {
          const num = parseInt(numStr, 10);
          if (num !== price && num > 0 && num <= 9999) {
            stock = num;
            break;
          }
        }
      }
    }
    const contextText = normalized
      .replace(/\d+\s*(?:en\s*stock|unidades?|uni\.?|u\b)/gi, '')
      .replace(/stock[:\s]*\d+/gi, '')
      .replace(/x\d+\b/gi, '')
      .replace(/\b\d+(?:[.,]\d+)?\b/g, '')
      .replace(/[,.:;]+\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (contextText && contextText.length > 2) {
      context = contextText;
    }
    console.log(`📝 Extracción de caption "${text}":`, { price, stock, context });
    return { price, stock, context };
  }
  private extractPrice(text: string): number | null {
    return this.extractProductDataFromCaption(text).price;
  }
  private async sendResponseMessages(
    session: WhatsAppConversationSession,
    aiResponse: ReturnType<typeof aiProcessor.parseResponse>,
    phone: string,
    actionSentOwnMessage: boolean
  ): Promise<void> {
    if (aiResponse.action === 'process_ai') {
      if (session.lastError) {
        await messageService.sendMessage(
          phone,
          `❌ ${session.lastError}\n\n¿Quieres intentar de nuevo o enviar otra imagen?`
        );
      }
      return;
    }
    if (!actionSentOwnMessage && aiResponse.message) {
      await messageService.sendMessage(phone, aiResponse.message);
    }
  }
}
export const conversationProcessor = new ConversationProcessor();
export default conversationProcessor;
