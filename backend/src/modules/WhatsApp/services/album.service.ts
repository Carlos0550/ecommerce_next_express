import { prisma } from "@/config/prisma";
import WasenderClient from "./wasender.client";
import { ALBUM_PROCESS_DELAY } from "../constants/timeouts";
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
  async handleAlbumImage(
    fromPhone: string,
    messageId: string,
    msgContent: any,
    pushName: string | undefined,
    albumParentId: string,
    apiKey: string | null | undefined,
    accessToken: string | null | undefined,
    alternativeCaption?: string,
  ): Promise<void> {
    const decryptedUrl = await this.decryptAlbumImage(
      apiKey,
      accessToken,
      messageId,
      msgContent.imageMessage,
    );
    const imageCaption = msgContent.imageMessage?.caption || alternativeCaption;
    try {
      const existing = await prisma.whatsAppAlbumBuffer.findUnique({
        where: { phone_albumId: { phone: fromPhone, albumId: albumParentId } },
      });
      let buffer: AlbumBuffer;
      if (existing) {
        buffer = existing.data as any;
      } else {
        buffer = {
          phone: fromPhone,
          images: [],
          pushName,
          timestamp: Date.now(),
        };
      }
      if (!buffer.images.some((img) => img.messageId === messageId)) {
        buffer.images.push({
          url: decryptedUrl || msgContent.imageMessage?.url || "",
          messageId,
          caption: imageCaption,
        });
      }
      if (imageCaption && !buffer.caption) {
        buffer.caption = imageCaption;
      }
      await prisma.whatsAppAlbumBuffer.upsert({
        where: { phone_albumId: { phone: fromPhone, albumId: albumParentId } },
        update: { data: buffer as any },
        create: {
          phone: fromPhone,
          albumId: albumParentId,
          data: buffer as any,
        },
      });
      console.log(`⏳ Álbum buffered (DB): ${buffer.images.length} imágenes`);
      this.scheduleAlbumProcessing(fromPhone, albumParentId);
    } catch (error) {
      console.error("Error al manejar imagen de álbum en DB:", error);
    }
  }
  async processAlbum(fromPhone: string, albumParentId: string): Promise<void> {
    try {
      const existing = await prisma.whatsAppAlbumBuffer.findUnique({
        where: { phone_albumId: { phone: fromPhone, albumId: albumParentId } },
      });
      if (!existing) {
        return;
      }
      const buffer: AlbumBuffer = existing.data as any;
      await prisma.whatsAppAlbumBuffer
        .delete({
          where: { id: existing.id },
        })
        .catch(() => {});
      console.log(
        `📸 Procesando álbum completo: ${buffer.images.length} imágenes`,
      );
      const imageUrls = buffer.images.map((img) => img.url).filter(Boolean);
      const messageData = {
        id: albumParentId,
        from: fromPhone,
        to: "",
        type: "image" as const,
        body: "",
        media_url: imageUrls[0],
        media_urls: imageUrls,
        caption: buffer.caption,
        timestamp: String(buffer.timestamp),
        pushName: buffer.pushName,
        isGroup: false,
        groupId: undefined,
        isAlbum: true,
      };
      const { conversationProcessor } =
        await import("./conversation/conversation.processor");
      await conversationProcessor.processMessage(0, fromPhone, messageData);
    } catch (error) {
      console.error("Error al procesar álbum desde DB:", error);
    }
  }
  private async decryptAlbumImage(
    apiKey: string | null | undefined,
    accessToken: string | null | undefined,
    messageId: string,
    imageMessage: any,
  ): Promise<string | undefined> {
    if (!apiKey || !imageMessage?.url) {
      return undefined;
    }
    try {
      const client = new WasenderClient(accessToken || "");
      const decrypted = await client.decryptMedia(apiKey, {
        key: { id: messageId },
        message: { imageMessage },
      });
      return decrypted.publicUrl;
    } catch (error) {
      return imageMessage?.url;
    }
  }
  private scheduleAlbumProcessing(
    fromPhone: string,
    albumParentId: string,
  ): void {
    const timeoutKey = `${fromPhone}:${albumParentId}`;
    if (albumProcessingTimeouts.has(timeoutKey)) {
      clearTimeout(albumProcessingTimeouts.get(timeoutKey));
    }
    const timeout = setTimeout(async () => {
      await this.processAlbum(fromPhone, albumParentId);
      albumProcessingTimeouts.delete(timeoutKey);
    }, ALBUM_PROCESS_DELAY);
    albumProcessingTimeouts.set(timeoutKey, timeout);
  }
}
export const albumService = new AlbumService();
export default albumService;
