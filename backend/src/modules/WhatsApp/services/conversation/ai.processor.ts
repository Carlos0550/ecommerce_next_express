/**
 * Procesador de IA para conversaciones
 * Maneja la comunicación con Groq y el parseo de respuestas
 */

import OpenAI from 'openai';
import { prisma } from '@/config/prisma';
import {
  WhatsAppConversationSession,
  AIConversationResponse,
} from '../../schemas/whatsapp.schemas';
import { buildSystemPrompt, buildStateContext } from './prompt.builder';
import { getBusinessEmojis } from './tone.detector';





const GROQ_API_KEY = process.env.GROQ_API_KEY;
const TEXT_MODEL = 'openai/gpt-oss-120b';
const WHISPER_MODEL = 'whisper-large-v3';

const groq = new OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});





class AIProcessor {
  /**
   * Transcribe un audio a texto usando Whisper
   */
  async transcribeAudio(audioUrl: string): Promise<string> {
    try {
      console.log('🎤 Descargando audio desde:', audioUrl);
      
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Error descargando audio: ${audioResponse.status}`);
      }
      
      const audioBuffer = await audioResponse.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: 'audio/ogg' });
      const audioFile = new File([audioBlob], 'audio.ogg', { type: 'audio/ogg' });
      
      console.log('🎤 Enviando audio a Groq Whisper...');
      
      const transcription = await groq.audio.transcriptions.create({
        file: audioFile,
        model: WHISPER_MODEL,
        language: 'es',
      });
      
      console.log('🎤 Transcripción completada:', transcription.text);
      
      return transcription.text;
    } catch (error) {
      console.error('Error transcribiendo audio:', error);
      throw new Error('No se pudo transcribir el audio');
    }
  }

  /**
   * Obtiene las categorías formateadas para el prompt
   */
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

  /**
   * Formatea el mensaje del usuario para el modelo
   */
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
      return `[Usuario envió un audio, transcripción: "${text}"]`;
    }
    
    return text;
  }

  /**
   * Genera una respuesta usando IA
   */
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
      const response = await groq.chat.completions.create({
        model: TEXT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: formattedUserMessage },
        ],
        temperature: 0.7
      });
      
      const content = response.choices[0]?.message?.content || '';
      console.log('🤖 Respuesta IA:', content);
      
      return this.parseResponse(content, categoryList);
    } catch (error) {
      console.error('Error generando respuesta IA:', error);
      
      return {
        message: '❌ Ocurrió un error procesando tu mensaje. Por favor intenta de nuevo.',
        action: 'none',
        data: {},
        next_state: session.state,
      };
    }
  }

  /**
   * Parsea la respuesta JSON de la IA
   */
  parseResponse(
    content: string,
    categoryList: { id: string; title: string }[]
  ): AIConversationResponse {
    try {
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
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
      console.error('Error parseando respuesta IA:', error, 'Contenido:', content);
      
      return {
        message: content || 'No pude procesar esa solicitud. ¿Podrías intentar de nuevo?',
        action: 'none',
        data: {},
        next_state: 'idle',
      };
    }
  }

  /**
   * Busca el ID de una categoría por nombre
   */
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

