/**
 * Servicio de configuración de WhatsApp
 * Maneja la obtención y actualización de la configuración
 */

import { prisma } from '@/config/prisma';
import { 
  getBusiness, 
  getBusinessOrThrow, 
  updateBusinessWhatsApp 
} from '../utils/business.utils';
import { normalizeRemitentsList } from '../utils/phone.utils';
import { 
  WhatsAppConfig, 
  WhatsAppConfigResponse 
} from '../schemas/whatsapp.schemas';

class ConfigService {
  /**
   * Obtiene la configuración actual de WhatsApp
   */
  async getConfig(): Promise<WhatsAppConfigResponse> {
    const business = await getBusiness();
    
    if (!business) {
      return {
        whatsapp_enabled: false,
        whatsapp_connected: false,
        whatsapp_phone_number: null,
        whatsapp_session_id: null,
        has_access_token: false,
        whatsapp_allowed_remitents: null,
      };
    }

    return {
      whatsapp_enabled: business.whatsapp_enabled,
      whatsapp_connected: business.whatsapp_connected,
      whatsapp_phone_number: business.whatsapp_phone_number,
      whatsapp_session_id: business.whatsapp_session_id,
      has_access_token: !!business.whatsapp_access_token,
      whatsapp_allowed_remitents: business.whatsapp_allowed_remitents,
    };
  }

  /**
   * Actualiza la configuración de WhatsApp
   */
  async updateConfig(config: WhatsAppConfig): Promise<WhatsAppConfigResponse> {
    const business = await getBusinessOrThrow();

    const updateData: Record<string, unknown> = {};
    
    if (config.whatsapp_enabled !== undefined) {
      updateData.whatsapp_enabled = config.whatsapp_enabled;
    }
    
    if (config.whatsapp_access_token !== undefined) {
      updateData.whatsapp_access_token = config.whatsapp_access_token;
    }
    
    if (config.whatsapp_allowed_remitents !== undefined) {
      updateData.whatsapp_allowed_remitents = config.whatsapp_allowed_remitents 
        ? normalizeRemitentsList(config.whatsapp_allowed_remitents)
        : '';
    }

    await prisma.businessData.update({
      where: { id: business.id },
      data: updateData,
    });

    return this.getConfig();
  }
}

export const configService = new ConfigService();
export default configService;

