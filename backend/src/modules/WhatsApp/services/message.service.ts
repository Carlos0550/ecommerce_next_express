import { getBusinessConnected, getBusiness, getWasenderApiKey } from '../utils/business.utils';
import WasenderClient from './wasender.client';
class MessageService {
  async sendMessage(to: string, message: string): Promise<void> {
    const business = await getBusinessConnected();
    const apiKey = getWasenderApiKey();
    const client = new WasenderClient(apiKey);
    await client.sendTextMessage(business.whatsapp_api_key!, { to, message });
  }
  async sendTestMessage(
    to: string,
    message: string
  ): Promise<{ success: boolean; message: string }> {
    await this.sendMessage(to, message);
    return {
      success: true,
      message: 'Mensaje enviado correctamente',
    };
  }
  async sendImage(
    to: string,
    imageUrl: string,
    caption?: string
  ): Promise<void> {
    const business = await getBusinessConnected();
    const apiKey = getWasenderApiKey();
    const client = new WasenderClient(apiKey);
    await client.sendImageMessage(business.whatsapp_api_key!, {
      to,
      image_url: imageUrl,
      caption,
    });
  }
  async decryptMedia(
    messageId: string,
    messageData: {
      imageMessage?: { url: string; mimetype?: string; mediaKey?: string };
      videoMessage?: { url: string; mimetype?: string; mediaKey?: string };
      audioMessage?: { url: string; mimetype?: string; mediaKey?: string };
      documentMessage?: { url: string; mimetype?: string; mediaKey?: string };
      stickerMessage?: { url: string; mimetype?: string; mediaKey?: string };
    }
  ): Promise<string | undefined> {
    const business = await getBusiness();
    if (!business?.whatsapp_api_key) {
      return undefined;
    }
    try {
      const apiKey = getWasenderApiKey();
      const client = new WasenderClient(apiKey);
      const decrypted = await client.decryptMedia(business.whatsapp_api_key, {
        key: { id: messageId },
        message: messageData,
      });
      return decrypted.publicUrl;
    } catch (error) {
      console.error('Error desencriptando media:', error);
      return undefined;
    }
  }
}
export const messageService = new MessageService();
export default messageService;
