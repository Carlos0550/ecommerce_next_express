/**
 * Servicio de gestión de sesiones de WhatsApp
 * Maneja la creación, conexión y desconexión de sesiones con WasenderAPI
 */

import {
  getBusinessWithAccessToken,
  getBusinessWithSession,
  getBusiness,
  updateBusinessWhatsApp,
  getWasenderApiKey,
  hasWasenderApiKey,
} from '../utils/business.utils';
import { normalizePhoneNumber } from '../utils/phone.utils';
import WasenderClient from './wasender.client';
import {
  SessionCreateResponse,
  QRCodeResponse,
  SessionStatusResponse,
} from '../schemas/whatsapp.schemas';

class SessionService {
  /**
   * Crea una nueva sesión de WhatsApp
   */
  async createSession(
    name: string,
    phoneNumber: string,
    webhookBaseUrl: string
  ): Promise<SessionCreateResponse> {
    const business = await getBusinessWithAccessToken();
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const apiKey = getWasenderApiKey();

    // Si ya hay una sesión, eliminarla primero
    if (business.whatsapp_session_id) {
      try {
        const client = new WasenderClient(apiKey);
        await client.deleteSession(business.whatsapp_session_id);
      } catch (error) {
        console.warn('Error eliminando sesión anterior:', error);
      }
    }

    const client = new WasenderClient(apiKey);
    
    const result = await client.createSession({
      name,
      phone_number: normalizedPhone,
      webhook_url: `${webhookBaseUrl}/api/whatsapp/webhook`,
      account_protection: false,
      log_messages: true,
      webhook_enabled: true,
      webhook_events: ['messages.upsert'],
      ignore_groups: true,
      ignore_channels: true,
      ignore_broadcasts: true,
    });

    // Guardar datos de la sesión
    await updateBusinessWhatsApp(business.id, {
      whatsapp_session_id: result.data.id,
      whatsapp_api_key: result.data.api_key,
      whatsapp_webhook_secret: result.data.webhook_secret,
      whatsapp_connected: false,
      whatsapp_phone_number: null,
    });

    // Conectar la sesión para inicializarla y poder obtener el QR
    try {
      await client.connectSession(result.data.id);
    } catch (error) {
      console.warn('Error al conectar sesión (puede requerir escaneo QR):', error);
    }

    return {
      success: true,
      session_id: result.data.id,
      message: 'Sesión creada. Escanea el código QR para conectar.',
    };
  }

  /**
   * Obtiene el código QR para escanear
   */
  async getQRCode(): Promise<QRCodeResponse> {
    const business = await getBusinessWithSession();
    const apiKey = getWasenderApiKey();

    const client = new WasenderClient(apiKey);
    const result = await client.getQRCode(business.whatsapp_session_id!);

    return {
      success: true,
      qr_code: result.data.qrCode,
    };
  }

  /**
   * Obtiene el estado de la sesión actual
   */
  async getSessionStatus(): Promise<SessionStatusResponse> {
    const business = await getBusiness();
    
    if (!business) {
      return { success: true, status: 'no_session' };
    }

    if (!business.whatsapp_session_id || !hasWasenderApiKey()) {
      return { success: true, status: 'no_session' };
    }

    if (!business.whatsapp_api_key) {
      return { success: true, status: 'no_session' };
    }

    try {
      const apiKey = getWasenderApiKey();
      const client = new WasenderClient(apiKey);
      const result = await client.getSessionStatusWithApiKey(business.whatsapp_api_key);

      // Mapear estados de WasenderAPI a nuestros estados internos
      let status: SessionStatusResponse['status'] = 'disconnected';
      
      switch (result.status) {
        case 'connected':
          status = 'connected';
          break;
        case 'connecting':
          status = 'connecting';
          break;
        case 'need_scan':
          status = 'qr_ready';
          break;
        case 'disconnected':
        case 'logged_out':
        case 'expired':
        default:
          status = 'disconnected';
      }

      // Actualizar estado en la base de datos
      if (status === 'connected') {
        await updateBusinessWhatsApp(business.id, { whatsapp_connected: true });
      } else if (status === 'disconnected') {
        await updateBusinessWhatsApp(business.id, { whatsapp_connected: false });
      }

      return {
        success: true,
        status,
        phone_number: business.whatsapp_phone_number || undefined,
      };
    } catch (error) {
      console.error('Error obteniendo estado de sesión:', error);
      return { success: true, status: 'disconnected' };
    }
  }

  /**
   * Desconecta la sesión de WhatsApp
   */
  async disconnectSession(): Promise<{ success: boolean; message: string }> {
    const business = await getBusinessWithSession();
    const apiKey = getWasenderApiKey();

    const client = new WasenderClient(apiKey);
    
    try {
      await client.deleteSession(business.whatsapp_session_id!);
    } catch (error) {
      console.warn('Error eliminando sesión en WasenderAPI:', error);
    }

    // Limpiar datos de sesión
    await updateBusinessWhatsApp(business.id, {
      whatsapp_session_id: null,
      whatsapp_api_key: null,
      whatsapp_webhook_secret: null,
      whatsapp_connected: false,
      whatsapp_phone_number: null,
    });

    return {
      success: true,
      message: 'Sesión desconectada correctamente',
    };
  }

  /**
   * Maneja el evento de estado de sesión desde webhook
   */
  async handleSessionStatusEvent(
    sessionId: number,
    status: string,
    phoneNumber?: string
  ): Promise<void> {
    const business = await getBusiness();
    
    if (!business || business.whatsapp_session_id !== sessionId) {
      return;
    }

    const isConnected = status === 'connected';
    
    await updateBusinessWhatsApp(business.id, {
      whatsapp_connected: isConnected,
      whatsapp_phone_number: phoneNumber || business.whatsapp_phone_number,
    });

    console.log(`Sesión ${sessionId} estado: ${status}`);
  }
}

export const sessionService = new SessionService();
export default sessionService;

