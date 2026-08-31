import { aiChatCompletion } from '@/config/aiClient';
import { prisma } from '@/config/prisma';
import { logger } from '@/utils/logger';
import type {
  WhatsAppConversationSession,
  AIConversationResponse,
} from '../../schemas/whatsapp.schemas';
import { buildSystemPrompt, buildStateContext } from './prompt.builder';
import { getBusinessEmojis } from './tone.detector';
const TEXT_MODEL = 'openai/gpt-5-mini';
class AIProcessor {
  async getCategoriesForPrompt(): Promise<{ formatted: string; list: { id: string; title: string }[] }> {
    const categories = await prisma.categories.findMany({
      where: { status: 'active' },
      orderBy: { title: 'asc' },
    });
    if (categories.length === 0) {
      return { formatted: 'No hay categorías disponibles', list: [] };
    }
    const formatted = categories.map((c, i) => `${i + 1}. ${c.title} (id: ${c.id})`).join('\n');
    const list = categories.map(c => ({ id: c.id, title: c.title }));
    return { formatted, list };
  }
  formatUserMessage(
    text: string,
    messageType: 'text' | 'image' | 'audio',
    mediaUrl?: string
  ): string {
    if (messageType === 'image') {
      return mediaUrl
        ? `[Usuario envió una imagen${text ? ` con caption: "${text}"` : ''}]`
        : `[Usuario envió una imagen sin URL válida${text ? `, caption: "${text}"` : ''}]`;
    }
    if (messageType === 'audio') {
      return `[Usuario envió un audio. Pedirle que lo reenvíe como texto.]`;
    }
    return text;
  }
  async generateResponse(
    session: WhatsAppConversationSession,
    userMessage: string,
    messageType: 'text' | 'image' | 'audio',
    mediaUrl?: string
  ): Promise<AIConversationResponse> {
    const stateContext = await buildStateContext(session);
    const { formatted: categories, list: categoryList } = await this.getCategoriesForPrompt();
    const business = await prisma.businessData.findFirst();
    const businessName = business?.name || 'la tienda';
    const businessEmojis = getBusinessEmojis(business?.type, business?.description);
    const systemPrompt = buildSystemPrompt(
      stateContext,
      categories,
      businessName,
      businessEmojis,
      session.greetingTone
    );
    const conversationHistory = session.messageHistory.slice(-6).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));
    const formattedUserMessage = this.formatUserMessage(userMessage, messageType, mediaUrl);
    try {
      const response = await aiChatCompletion(
        {
          model: TEXT_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: formattedUserMessage },
          ],
          temperature: 0.7,
        },
        {
          operation: 'whatsapp_conversation_response',
          userId: session.userId,
        },
      );
      const content = response.choices[0]?.message?.content || '';
      logger.debug('whatsapp.ai.response_raw', {
        contentLength: content.length,
        contentPreview: content.length > 500 ? content.slice(0, 500) + '…' : content,
      });
      return this.parseResponse(content, categoryList);
    } catch (error) {
      logger.error('whatsapp.ai.response_failed', {
        err: error instanceof Error ? error.message : String(error),
        userId: session.userId,
      });
      return {
        message: '❌ Ocurrió un error procesando tu mensaje. Por favor intenta de nuevo.',
        action: 'none',
        data: {},
        next_state: session.state,
      };
    }
  }
  parseResponse(
    content: string,
    categoryList: { id: string; title: string }[]
  ): AIConversationResponse {
    try {
      const jsonMatch = /\{[\s\S]*\}/.exec(content);
      if (!jsonMatch) {
        throw new Error('No se encontró JSON en la respuesta');
      }
      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.message || !parsed.action || !parsed.next_state) {
        throw new Error('Respuesta incompleta');
      }
      if (parsed.data?.category_name && !parsed.data?.category_id) {
        const matchedCategory = categoryList.find(
          c => c.title.toLowerCase() === parsed.data.category_name.toLowerCase()
        );
        if (matchedCategory) {
          parsed.data.category_id = matchedCategory.id;
        }
      }
      return {
        message: parsed.message,
        action: parsed.action,
        data: parsed.data || {},
        next_state: parsed.next_state,
      };
    } catch (error) {
      logger.warn('whatsapp.ai.parse_failed', {
        err: error instanceof Error ? error.message : String(error),
        contentLength: content.length,
        contentPreview: content.length > 300 ? content.slice(0, 300) + '…' : content,
      });
      return {
        message: content || 'No pude procesar esa solicitud. ¿Podrías intentar de nuevo?',
        action: 'none',
        data: {},
        next_state: 'idle',
      };
    }
  }
  async findCategoryId(categoryName: string): Promise<string | null> {
    const category = await prisma.categories.findFirst({
      where: {
        title: { contains: categoryName, mode: 'insensitive' },
        status: 'active',
      },
    });
    return category?.id || null;
  }
}
export const aiProcessor = new AIProcessor();
export default aiProcessor;
