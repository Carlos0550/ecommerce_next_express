import { prisma } from "@/config/prisma";
import { logger } from "@/utils/logger";
import {
  getBusiness,
  getWasenderApiKey,
  hasWasenderApiKey,
} from "../utils/business.utils";
import { sessionService } from "./session.service";
import { albumService } from "./album.service";
import type {
  WebhookEvent,
  WebhookMessageUpsert,
  WebhookSessionStatus,
  WebhookMessageReceived,
} from "../schemas/whatsapp.schemas";
class WebhookHandler {
  async handleWebhook(event: WebhookEvent, _signature?: string): Promise<void> {
    const business = await getBusiness();
    if (!business) {
      logger.warn("Webhook recibido pero no hay negocio configurado", {
        feature: "whatsapp",
        eventType: event.event,
      });
      return;
    }
    const eventType = event.event;
    switch (eventType) {
      case "session.status":
        await this.handleSessionStatusEvent(event);
        break;
      case "messages.upsert":
        await this.handleMessageUpsertEvent(event);
        break;
      case "qr.updated":
        logger.debug("QR actualizado", { sessionId: event.session_id });
        break;
      default:
        logger.debug("Evento WhatsApp no manejado", { eventType });
    }
  }
  private async handleSessionStatusEvent(
    event: WebhookSessionStatus,
  ): Promise<void> {
    await sessionService.handleSessionStatusEvent(
      event.session_id,
      event.data.status,
      event.data.phone_number,
    );
  }
  private async handleMessageUpsertEvent(
    event: WebhookMessageUpsert,
  ): Promise<void> {
    const messages = (event.data as any)?.messages;
    if (!messages) {
      logger.error("Estructura de mensaje WhatsApp inválida", {
        eventType: event.event,
      });
      return;
    }
    const key = messages.key;
    if (key?.fromMe || messages.broadcast) {
      return;
    }
    const fromPhone =
      key?.cleanedSenderPn ||
      key?.senderPn?.split("@")[0] ||
      messages.remoteJid?.split("@")[0];
    if (!fromPhone) {
      logger.error("No se pudo obtener el número de teléfono del mensaje", {
        feature: "whatsapp",
      });
      return;
    }
    const messageId = key?.id || messages.id;
    if (messageId) {
      const alreadyProcessed = await prisma.processedMessage.findUnique({
        where: { id: messageId },
      });
      if (alreadyProcessed) {
        logger.debug("Mensaje WhatsApp ya procesado, ignorando duplicado", {
          messageId,
        });
        return;
      }
      await prisma.processedMessage
        .create({ data: { id: messageId } })
        .catch(() => {});
    }
    logger.info("Mensaje WhatsApp recibido", { feature: "whatsapp", fromPhone });
    const msgContent = messages.message;
    if (
      msgContent?.albumMessage &&
      !msgContent?.imageMessage &&
      !msgContent?.videoMessage
    ) {
      logger.debug("Ignorando anuncio de álbum", {
        expectedImageCount: msgContent.albumMessage.expectedImageCount,
      });
      return;
    }
    const msgContextInfo = msgContent?.messageContextInfo;
    const isPartOfAlbum =
      msgContextInfo?.messageAssociation?.associationType === "MEDIA_ALBUM";
    const albumParentId =
      msgContextInfo?.messageAssociation?.parentMessageKey?.id;
    const business = await getBusiness();
    const apiKey = business?.whatsapp_api_key;
    const wasenderToken = hasWasenderApiKey() ? getWasenderApiKey() : undefined;
    if (isPartOfAlbum && albumParentId && msgContent?.imageMessage) {
      logger.debug("Imagen parte de álbum", { albumParentId });
      const alternativeCaption =
        messages.messageBody || msgContent.imageMessage?.caption;
      await albumService.handleAlbumImage(
        fromPhone,
        messageId,
        msgContent,
        messages.pushName,
        albumParentId,
        apiKey,
        wasenderToken,
        alternativeCaption,
      );
      return;
    }
    const messageData = await this.parseMessageContent(
      messages,
      msgContent,
      fromPhone,
      messageId,
      apiKey,
      wasenderToken,
    );
    logger.debug("Mensaje WhatsApp parseado", {
      type: messageData.type,
      bodyPreview: messageData.body?.substring(0, 50),
    });
    const { conversationProcessor } =
      await import("./conversation/conversation.processor");
    await conversationProcessor.processMessage(0, fromPhone, messageData);
  }
  private async parseMessageContent(
    messages: any,
    msgContent: any,
    fromPhone: string,
    messageId: string,
    apiKey: string | null | undefined,
    accessToken: string | null | undefined,
  ): Promise<WebhookMessageReceived["data"]> {
    let messageType: WebhookMessageReceived["data"]["type"] = "text";
    let messageBody = "";
    let mediaUrl: string | undefined;
    let caption: string | undefined;
    if (msgContent?.imageMessage) {
      messageType = "image";
      caption = msgContent.imageMessage.caption;
      mediaUrl =
        (await this.decryptMediaIfNeeded(apiKey, accessToken, messageId, {
          imageMessage: msgContent.imageMessage,
        })) || msgContent.imageMessage.url;
    } else if (msgContent?.videoMessage) {
      messageType = "video";
      caption = msgContent.videoMessage.caption;
      mediaUrl = msgContent.videoMessage.url;
    } else if (msgContent?.documentMessage) {
      messageType = "document";
      caption = msgContent.documentMessage.caption;
      mediaUrl = msgContent.documentMessage.url;
    } else if (msgContent?.audioMessage) {
      messageType = "audio";
      mediaUrl =
        (await this.decryptMediaIfNeeded(apiKey, accessToken, messageId, {
          audioMessage: msgContent.audioMessage,
        })) || msgContent.audioMessage.url;
    } else if (msgContent?.stickerMessage) {
      messageType = "sticker";
      mediaUrl = msgContent.stickerMessage.url;
    } else {
      messageBody =
        messages.messageBody ||
        msgContent?.conversation ||
        msgContent?.extendedTextMessage?.text ||
        "";
    }
    return {
      id: messages.id || messageId || "",
      from: fromPhone,
      to: "",
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
    },
  ): Promise<string | undefined> {
    if (!apiKey) return undefined;
    try {
      const WasenderClient = (await import("./wasender.client")).default;
      const client = new WasenderClient(accessToken || "");
      const decrypted = await client.decryptMedia(apiKey, {
        key: { id: messageId },
        message: messageData,
      });
      logger.debug("Media WhatsApp desencriptada", { url: decrypted.publicUrl });
      return decrypted.publicUrl;
    } catch (error) {
      logger.error("Error desencriptando media WhatsApp", {
        feature: "whatsapp",
        messageId,
        err: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }
}
export const webhookHandler = new WebhookHandler();
export default webhookHandler;
