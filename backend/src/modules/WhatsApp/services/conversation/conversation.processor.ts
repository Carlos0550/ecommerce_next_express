/**
 * Procesador principal de conversaciones
 * Punto de entrada para el procesamiento de mensajes de WhatsApp
 */

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
import {
  WhatsAppConversationSession,
  WebhookMessageReceived,
} from '../../schemas/whatsapp.schemas';


const ACTIONS_SKIP_SAVE = ['cancel', 'reset', 'create_product', 'end_conversation'];


class ConversationProcessor {
  async processMessage(
    adminId: number,
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

      let session = await this.getOrCreateSession(adminId, phone, textContent, messageData.type);
      
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

      // Extraer precio del texto si está en estado collecting y no tiene precio
      // (para mensajes de texto posteriores)
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
    adminId: number,
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
      session = sessionManager.createNewSession(adminId, phone);
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
      session.categoryPromptShown = false; // Resetear flag al iniciar nuevo flujo
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

  /**
   * Envía un saludo si es la primera interacción y el usuario no saludó
   * Especialmente útil cuando el usuario envía una imagen directamente sin saludar
   */
  private async sendGreetingIfNeeded(
    session: WhatsAppConversationSession,
    phone: string,
    textContent: string
  ): Promise<void> {
    // Si ya saludamos, no repetir
    if (session.hasGreeted) return;
    
    // Si el usuario ya saludó en el caption, marcar como saludado pero no enviar saludo
    if (textContent && isGreeting(textContent)) {
      session.hasGreeted = true;
      return;
    }
    
    // Verificar si es la primera interacción (no hay mensajes del asistente)
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
        // Usuario envió imagen CON precio -> saludo + confirmación de que procesaremos
        const priceStr = `$${session.productData.price!.toLocaleString()}`;
        const stockStr = hasStock ? `, stock: ${session.productData.stock}` : '';
        const contextStr = hasContext ? ` (${session.productData.additionalContext})` : '';
        greeting = `¡Hola! Soy Cleria, asistente de *${businessName}* 📸\n\nYa tengo tu imagen${contextStr}, precio ${priceStr}${stockStr}. Procesando...`;
      } else if (hasImages) {
        // Usuario envió imagen SIN precio -> saludo + preguntar precio
        greeting = `¡Hola! Soy Cleria, asistente de *${businessName}* 📸\n\nYa tengo tu imagen. ¿Cuál es el precio?`;
      } else {
        // Saludo genérico
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


  /**
   * Extrae precio, stock y contexto adicional de un texto (caption de imagen o mensaje)
   * Ejemplos:
   * - "5000 24 en stock" → { price: 5000, stock: 24, context: "" }
   * - "Labiales hidratantes 5000 24 en stock" → { price: 5000, stock: 24, context: "Labiales hidratantes" }
   * - "Cartera de cuero 50000" → { price: 50000, stock: undefined, context: "Cartera de cuero" }
   */
  private extractProductDataFromCaption(text: string): { 
    price: number | null; 
    stock: number | null; 
    context: string | null;
  } {
    if (!text) return { price: null, stock: null, context: null };
    
    let price: number | null = null;
    let stock: number | null = null;
    let context: string | null = null;
    
    // Normalizar texto (quitar puntos de miles pero mantener estructura)
    const normalized = text.trim();
    
    // Detectar stock con patrones explícitos
    // "24 en stock", "stock: 24", "stock 24", "x24", "24 unidades", "24 uni", "24u"
    const stockPatterns = [
      /(\d+)\s*(?:en\s*stock|unidades?|uni\.?|u\b)/i,
      /stock[:\s]*(\d+)/i,
      /x(\d+)\b/i,
    ];
    
    for (const pattern of stockPatterns) {
      const match = normalized.match(pattern);
      if (match) {
        stock = parseInt(match[1], 10);
        break;
      }
    }
    
    // Encontrar todos los números en el texto
    const numberMatches = normalized.replace(/\./g, '').match(/\d+(?:[.,]\d+)?/g);
    
    if (numberMatches) {
      // El primer número grande (> 100) suele ser el precio
      // o el primer número si no hay ninguno grande
      for (const numStr of numberMatches) {
        const num = Number(numStr.replace(',', '.'));
        if (Number.isFinite(num) && num > 10) {
          // Si este número ya fue detectado como stock, saltarlo
          if (stock !== null && num === stock) continue;
          price = num;
          break;
        }
      }
      
      // Si hay exactamente 2 números y no detectamos stock explícitamente,
      // el segundo podría ser el stock (ej: "5000 24")
      if (stock === null && numberMatches.length >= 2 && price !== null) {
        for (const numStr of numberMatches) {
          const num = parseInt(numStr, 10);
          if (num !== price && num > 0 && num <= 9999) {
            // Números pequeños (<=9999) que no son el precio podrían ser stock
            stock = num;
            break;
          }
        }
      }
    }
    
    // Extraer contexto adicional (texto que no sea números ni palabras de stock)
    let contextText = normalized
      // Quitar patrones de stock
      .replace(/\d+\s*(?:en\s*stock|unidades?|uni\.?|u\b)/gi, '')
      .replace(/stock[:\s]*\d+/gi, '')
      .replace(/x\d+\b/gi, '')
      // Quitar números sueltos (precio y stock)
      .replace(/\b\d+(?:[.,]\d+)?\b/g, '')
      // Limpiar espacios extra y puntuación suelta
      .replace(/[,.:;]+\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Si queda algo de contexto útil (más de 2 caracteres), guardarlo
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

