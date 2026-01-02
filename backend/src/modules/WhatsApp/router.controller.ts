import { Request, Response } from 'express';
import whatsAppServices from './services/whatsapp.services';
import {
  WhatsAppConfigSchema,
  CreateSessionSchema,
  TestMessageSchema,
  WebhookEvent,
} from './schemas/whatsapp.schemas';

class WhatsAppController {

  async getConfig(req: Request, res: Response) {
    try {
      const config = await whatsAppServices.getConfig();
      return res.status(200).json({ ok: true, data: config });
    } catch (error) {
      console.error('Error obteniendo config de WhatsApp:', error);
      return res.status(500).json({ ok: false, error: 'Error al obtener configuración' });
    }
  }


  async updateConfig(req: Request, res: Response) {
    try {
      const validation = WhatsAppConfigSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          ok: false,
          error: validation.error.issues[0]?.message || 'Datos inválidos',
        });
      }

      const config = await whatsAppServices.updateConfig(validation.data);
      return res.status(200).json({ ok: true, data: config });
    } catch (error: any) {
      console.error('Error actualizando config de WhatsApp:', error);
      
      if (error.message === 'BUSINESS_NOT_FOUND') {
        return res.status(404).json({ ok: false, error: 'Negocio no encontrado' });
      }
      
      return res.status(500).json({ ok: false, error: 'Error al actualizar configuración' });
    }
  }

  async createSession(req: Request, res: Response) {
    try {
      const validation = CreateSessionSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          ok: false,
          error: validation.error.issues[0]?.message || 'Datos inválidos',
        });
      }

      const webhookBaseUrl = process.env.WEBHOOK_BASE_URL!

      const result = await whatsAppServices.createSession(
        validation.data.name,
        validation.data.phone_number,
        webhookBaseUrl
      );

      return res.status(201).json({ ok: true, data: result });
    } catch (error: any) {
      console.error('Error creando sesión de WhatsApp:', error);
      
      if (error.message === 'BUSINESS_NOT_FOUND') {
        return res.status(404).json({ ok: false, error: 'Negocio no encontrado' });
      }
      if (error.message === 'ACCESS_TOKEN_NOT_CONFIGURED') {
        return res.status(400).json({ ok: false, error: 'Access Token no configurado' });
      }
      
      const msg = error.message || '';
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
      
      return res.status(500).json({ 
        ok: false, 
        error: error.message || 'Error al crear sesión' 
      });
    }
  }

  async getQRCode(req: Request, res: Response) {
    try {
      const result = await whatsAppServices.getQRCode();
      return res.status(200).json({ ok: true, data: result });
    } catch (error: any) {
      console.error('Error obteniendo QR code:', error);
      
      if (error.message === 'BUSINESS_NOT_FOUND') {
        return res.status(404).json({ ok: false, error: 'Negocio no encontrado' });
      }
      if (error.message === 'ACCESS_TOKEN_NOT_CONFIGURED') {
        return res.status(400).json({ ok: false, error: 'Access Token no configurado' });
      }
      if (error.message === 'SESSION_NOT_CREATED') {
        return res.status(400).json({ ok: false, error: 'Sesión no creada' });
      }
      
      return res.status(500).json({ 
        ok: false, 
        error: error.message || 'Error al obtener código QR' 
      });
    }
  }

  async getSessionStatus(req: Request, res: Response) {
    try {
      const result = await whatsAppServices.getSessionStatus();
      return res.status(200).json({ ok: true, data: result });
    } catch (error) {
      console.error('Error obteniendo estado de sesión:', error);
      return res.status(500).json({ ok: false, error: 'Error al obtener estado' });
    }
  }

  async disconnectSession(req: Request, res: Response) {
    try {
      const result = await whatsAppServices.disconnectSession();
      return res.status(200).json({ ok: true, data: result });
    } catch (error: any) {
      console.error('Error desconectando sesión:', error);
      
      if (error.message === 'BUSINESS_NOT_FOUND') {
        return res.status(404).json({ ok: false, error: 'Negocio no encontrado' });
      }
      if (error.message === 'SESSION_NOT_CREATED') {
        return res.status(400).json({ ok: false, error: 'No hay sesión activa' });
      }
      
      return res.status(500).json({ ok: false, error: 'Error al desconectar' });
    }
  }

  async sendTestMessage(req: Request, res: Response) {
    try {
      const validation = TestMessageSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          ok: false,
          error: validation.error.issues[0]?.message || 'Datos inválidos',
        });
      }

      const result = await whatsAppServices.sendTestMessage(
        validation.data.to,
        validation.data.message
      );

      return res.status(200).json({ ok: true, data: result });
    } catch (error: any) {
      console.error('Error enviando mensaje de prueba:', error);
      
      if (error.message === 'BUSINESS_NOT_FOUND') {
        return res.status(404).json({ ok: false, error: 'Negocio no encontrado' });
      }
      if (error.message === 'SESSION_NOT_CONNECTED') {
        return res.status(400).json({ ok: false, error: 'WhatsApp no está conectado' });
      }
      
      return res.status(500).json({ 
        ok: false, 
        error: error.message || 'Error al enviar mensaje' 
      });
    }
  }

  async handleWebhook(req: Request, res: Response) {
    try {
      console.log('🔔 Webhook recibido:', JSON.stringify(req.body, null, 2));
      
      const event = req.body as WebhookEvent;
      const signature = req.headers['x-webhook-signature'] as string | undefined;
      
      res.status(200).json({ received: true });
      
      setImmediate(async () => {
        try {
          await whatsAppServices.handleWebhook(event, signature);
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

