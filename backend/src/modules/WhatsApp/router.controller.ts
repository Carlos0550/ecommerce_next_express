/**
 * Controlador de rutas de WhatsApp
 * Simplificado con manejo de errores centralizado
 */

import { Request, Response } from 'express';
import { configService } from './services/config.service';
import { sessionService } from './services/session.service';
import { messageService } from './services/message.service';
import { webhookHandler } from './services/webhook.handler';
import { WhatsAppError } from './utils/business.utils';
import {
  WhatsAppConfigSchema,
  CreateSessionSchema,
  TestMessageSchema,
  WebhookEvent,
} from './schemas/whatsapp.schemas';

// ============================================================================
// HELPERS DE ERROR
// ============================================================================

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

  // Manejar errores conocidos de WhatsApp
  if (error instanceof WhatsAppError) {
    const mapping = ERROR_MAPPINGS.find(e => e.code === error.code);
    if (mapping) {
      return res.status(mapping.status).json({ ok: false, error: mapping.message });
    }
  }

  // Manejar errores con mensaje específico
  if (error instanceof Error) {
    const msg = error.message;
    
    // Errores de validación de teléfono
    if (msg.includes('phone number') && msg.includes('valid')) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Número de teléfono inválido. Usa formato internacional: +5491123456789' 
      });
    }
    
    // Número ya en uso
    if (msg.includes('phone number') && msg.includes('taken')) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Este número ya tiene una sesión activa en WasenderAPI. Elimínala primero desde el panel de WasenderAPI.' 
      });
    }
    
    // Error de webhook URL
    if (msg.includes('webhook') && (msg.includes('localhost') || msg.includes('publicly accessible'))) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Se requiere una URL pública para el webhook. Configura WEBHOOK_BASE_URL en las variables de entorno con tu dominio público (ej: https://tu-dominio.com)' 
      });
    }

    // Si tiene mensaje específico, usarlo
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

  /**
   * Crea una nueva sesión de WhatsApp
   */
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

  /**
   * Obtiene el código QR para escanear
   */
  async getQRCode(_req: Request, res: Response) {
    try {
      const result = await sessionService.getQRCode();
      return res.status(200).json({ ok: true, data: result });
    } catch (error) {
      return handleError(error, res, 'Error al obtener código QR');
    }
  }

  /**
   * Obtiene el estado de la sesión
   */
  async getSessionStatus(_req: Request, res: Response) {
    try {
      const result = await sessionService.getSessionStatus();
      return res.status(200).json({ ok: true, data: result });
    } catch (error) {
      return handleError(error, res, 'Error al obtener estado');
    }
  }

  /**
   * Desconecta la sesión de WhatsApp
   */
  async disconnectSession(_req: Request, res: Response) {
    try {
      const result = await sessionService.disconnectSession();
      return res.status(200).json({ ok: true, data: result });
    } catch (error) {
      return handleError(error, res, 'Error al desconectar');
    }
  }

  /**
   * Envía un mensaje de prueba
   */
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

  /**
   * Maneja los webhooks de WasenderAPI
   */
  async handleWebhook(req: Request, res: Response) {
    try {
      console.log('🔔 Webhook recibido:', JSON.stringify(req.body, null, 2));
      
      const event = req.body as WebhookEvent;
      const signature = req.headers['x-webhook-signature'] as string | undefined;
      
      // Responder inmediatamente para evitar timeouts
      res.status(200).json({ received: true });
      
      // Procesar en background
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
