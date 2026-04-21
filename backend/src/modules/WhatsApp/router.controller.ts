import type { Request, Response } from 'express';
import { configService } from './services/config.service';
import { sessionService } from './services/session.service';
import { messageService } from './services/message.service';
import { webhookHandler } from './services/webhook.handler';
import WasenderClient from './services/wasender.client';
import { WhatsAppError } from './utils/business.utils';
import type {
  WebhookEvent} from './schemas/whatsapp.schemas';
import {
  WhatsAppConfigSchema,
  CreateSessionSchema,
  TestMessageSchema
} from './schemas/whatsapp.schemas';
interface ErrorMapping {
  code: string;
  status: number;
  message: string;
}
const ERROR_MAPPINGS: ErrorMapping[] = [
  { code: 'BUSINESS_NOT_FOUND', status: 404, message: 'Negocio no encontrado' },
  { code: 'ACCESS_TOKEN_NOT_CONFIGURED', status: 400, message: 'Access Token no configurado' },
  { code: 'SESSION_NOT_CREATED', status: 400, message: 'Sesión no creada' },
  { code: 'SESSION_NOT_CONNECTED', status: 400, message: 'WhatsApp no está conectado' },
];
function handleError(error: unknown, res: Response, defaultMessage: string): Response {
  console.error(defaultMessage + ':', error);
  if (error instanceof WhatsAppError) {
    const mapping = ERROR_MAPPINGS.find(e => e.code === error.code);
    if (mapping) {
      return res.status(mapping.status).json({ ok: false, error: mapping.message });
    }
  }
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes('phone number') && msg.includes('valid')) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Número de teléfono inválido. Usa formato internacional: +5491123456789' 
      });
    }
    if (msg.includes('phone number') && msg.includes('taken')) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Este número ya tiene una sesión activa en WasenderAPI. Elimínala primero desde el panel de WasenderAPI.' 
      });
    }
    if (msg.includes('webhook') && (msg.includes('localhost') || msg.includes('publicly accessible'))) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Se requiere una URL pública para el webhook. Configura WEBHOOK_BASE_URL en las variables de entorno con tu dominio público (ej: https://tu-dominio.com)' 
      });
    }
    if (msg && msg !== 'Error') {
      return res.status(500).json({ ok: false, error: msg });
    }
  }
  return res.status(500).json({ ok: false, error: defaultMessage });
}
function validateRequest<T>(
  schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: { issues: { message?: string }[] } } },
  data: unknown,
  res: Response
): T | null {
  const validation = schema.safeParse(data);
  if (!validation.success) {
    res.status(400).json({
      ok: false,
      error: validation.error?.issues[0]?.message || 'Datos inválidos',
    });
    return null;
  }
  return validation.data as T;
}
class WhatsAppController {
  async getConfig(_req: Request, res: Response) {
    try {
      const config = await configService.getConfig();
      return res.status(200).json({ ok: true, data: config });
    } catch (error) {
      return handleError(error, res, 'Error al obtener configuración');
    }
  }
  async updateConfig(req: Request, res: Response) {
    try {
      const data = validateRequest(WhatsAppConfigSchema, req.body, res);
      if (!data) return;
      const config = await configService.updateConfig(data);
      return res.status(200).json({ ok: true, data: config });
    } catch (error) {
      return handleError(error, res, 'Error al actualizar configuración');
    }
  }
  async createSession(req: Request, res: Response) {
    try {
      const data = validateRequest(CreateSessionSchema, req.body, res);
      if (!data) return;
      const webhookBaseUrl = process.env.WEBHOOK_BASE_URL!;
      const result = await sessionService.createSession(
        data.name,
        data.phone_number,
        webhookBaseUrl
      );
      return res.status(201).json({ ok: true, data: result });
    } catch (error) {
      return handleError(error, res, 'Error al crear sesión');
    }
  }
  async getQRCode(_req: Request, res: Response) {
    try {
      const result = await sessionService.getQRCode();
      return res.status(200).json({ ok: true, data: result });
    } catch (error) {
      return handleError(error, res, 'Error al obtener código QR');
    }
  }
  async getSessionStatus(_req: Request, res: Response) {
    try {
      const result = await sessionService.getSessionStatus();
      return res.status(200).json({ ok: true, data: result });
    } catch (error) {
      return handleError(error, res, 'Error al obtener estado');
    }
  }
  async disconnectSession(_req: Request, res: Response) {
    try {
      const result = await sessionService.disconnectSession();
      return res.status(200).json({ ok: true, data: result });
    } catch (error) {
      return handleError(error, res, 'Error al desconectar');
    }
  }
  async sendTestMessage(req: Request, res: Response) {
    try {
      const data = validateRequest(TestMessageSchema, req.body, res);
      if (!data) return;
      const result = await messageService.sendTestMessage(data.to, data.message);
      return res.status(200).json({ ok: true, data: result });
    } catch (error) {
      return handleError(error, res, 'Error al enviar mensaje');
    }
  }
  async handleWebhook(req: Request, res: Response) {
    try {
      const event = req.body as WebhookEvent;
      const signature = req.headers['x-webhook-signature'] as string | undefined;
      const webhookSecret = process.env.WEBHOOK_SECRET;
      if (!webhookSecret) {
        return res.status(503).json({ ok: false, error: 'webhook_not_configured' });
      }
      if (!signature) {
        return res.status(401).json({ ok: false, error: 'missing_signature' });
      }
      const rawBody = (req as any).rawBody as string | undefined;
      const payload = rawBody ?? JSON.stringify(req.body ?? {});
      const isValid = WasenderClient.validateWebhookSignature(
        payload,
        signature,
        webhookSecret,
      );
      if (!isValid) {
        return res.status(401).json({ ok: false, error: 'invalid_signature' });
      }
      console.log('🔔 Webhook recibido:', event?.event, event?.session_id);
      res.status(200).json({ received: true });
      setImmediate(async () => {
        try {
          await webhookHandler.handleWebhook(event, signature);
        } catch (error) {
          console.error('Error procesando webhook:', error);
        }
      });
    } catch (error) {
      console.error('Error en webhook:', error);
      return res.status(200).json({ received: true, error: true });
    }
  }
}
export default new WhatsAppController();
