/**
 * Servicio de manejo de álbumes de imágenes de WhatsApp
 * Agrupa múltiples imágenes enviadas como álbum en un solo mensaje
 */

import { redis } from '@/config/redis';
import {
  getAlbumBufferKey,
  getAlbumLockKey,
  ALBUM_BUFFER_TTL,
} from '../constants/redis-keys';
import {
  ALBUM_PROCESS_DELAY,
  ALBUM_LOCK_MAX_RETRIES,
  ALBUM_LOCK_RETRY_DELAY,
  ALBUM_LOCK_TTL,
} from '../constants/timeouts';
import WasenderClient from './wasender.client';





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





class AlbumService {
  /**
   * Maneja una imagen que es parte de un álbum
   */
  async handleAlbumImage(
    fromPhone: string,
    messageId: string,
    msgContent: any,
    pushName: string | undefined,
    albumParentId: string,
    apiKey: string | null | undefined,
    accessToken: string | null | undefined,
    alternativeCaption?: string
  ): Promise<void> {
    const albumKey = getAlbumBufferKey(fromPhone, albumParentId);
    const lockKey = getAlbumLockKey(fromPhone, albumParentId);
    
    
    const decryptedUrl = await this.decryptAlbumImage(
      apiKey,
      accessToken,
      messageId,
      msgContent.imageMessage
    );

    
    const imageCaption = msgContent.imageMessage?.caption || alternativeCaption;

    
    const acquired = await this.acquireLock(lockKey);
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

      
      if (!buffer.images.some(img => img.messageId === messageId)) {
        buffer.images.push({
          url: decryptedUrl || msgContent.imageMessage?.url || '',
          messageId,
          caption: imageCaption,
        });
      }

      
      if (imageCaption && !buffer.caption) {
        buffer.caption = imageCaption;
      }

      await redis.set(albumKey, JSON.stringify(buffer), 'EX', ALBUM_BUFFER_TTL);
      console.log(`⏳ Álbum buffered: ${buffer.images.length} imágenes, caption="${buffer.caption?.substring(0, 30) || 'sin caption'}..."`);
    } finally {
      await redis.del(lockKey);
    }

    
    this.scheduleAlbumProcessing(fromPhone, albumParentId, albumKey);
  }

  /**
   * Procesa un álbum completo de imágenes
   */
  async processAlbum(albumKey: string, fromPhone: string, albumParentId: string): Promise<void> {
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

    
    const { conversationProcessor } = await import('./conversation/conversation.processor');
    await conversationProcessor.processMessage(0, fromPhone, messageData);
  }

  /**
   * Desencripta una imagen de álbum
   */
  private async decryptAlbumImage(
    apiKey: string | null | undefined,
    accessToken: string | null | undefined,
    messageId: string,
    imageMessage: any
  ): Promise<string | undefined> {
    if (!apiKey || !imageMessage?.url) {
      return undefined;
    }

    try {
      console.log('🔓 Desencriptando imagen de álbum...');
      const client = new WasenderClient(accessToken || '');
      const decrypted = await client.decryptMedia(apiKey, {
        key: { id: messageId },
        message: { imageMessage },
      });
      console.log('✅ Imagen de álbum desencriptada:', decrypted.publicUrl);
      return decrypted.publicUrl;
    } catch (error) {
      console.error('❌ Error desencriptando imagen de álbum:', error);
      return imageMessage?.url;
    }
  }

  /**
   * Intenta adquirir un lock en Redis
   */
  private async acquireLock(lockKey: string): Promise<boolean> {
    for (let i = 0; i < ALBUM_LOCK_MAX_RETRIES; i++) {
      const result = await redis.set(lockKey, '1', 'EX', ALBUM_LOCK_TTL, 'NX');
      if (result === 'OK') {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, ALBUM_LOCK_RETRY_DELAY));
    }
    return false;
  }

  /**
   * Programa el procesamiento del álbum después de un delay
   */
  private scheduleAlbumProcessing(
    fromPhone: string,
    albumParentId: string,
    albumKey: string
  ): void {
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
}

export const albumService = new AlbumService();
export default albumService;

