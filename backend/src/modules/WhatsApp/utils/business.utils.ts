/**
 * Utilidades para obtener y validar datos del negocio
 * Elimina la repetición de validaciones en cada método
 */

import { prisma } from '@/config/prisma';

// Tipo para los datos del negocio
export interface BusinessData {
  id: string;
  name: string | null;
  type: string | null;
  description: string | null;
  whatsapp_enabled: boolean;
  whatsapp_connected: boolean;
  whatsapp_phone_number: string | null;
  whatsapp_session_id: number | null;
  whatsapp_access_token: string | null;
  whatsapp_api_key: string | null;
  whatsapp_webhook_secret: string | null;
  whatsapp_allowed_remitents: string | null;
}

/**
 * Errores específicos del módulo WhatsApp
 */
export class WhatsAppError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'WhatsAppError';
  }
}

/**
 * Obtiene los datos del negocio o lanza error si no existe
 */
export async function getBusinessOrThrow(): Promise<BusinessData> {
  const business = await prisma.businessData.findFirst();
  
  if (!business) {
    throw new WhatsAppError('BUSINESS_NOT_FOUND', 'Negocio no encontrado');
  }
  
  return business as BusinessData;
}

/**
 * Obtiene los datos del negocio (puede ser null)
 */
export async function getBusiness(): Promise<BusinessData | null> {
  const business = await prisma.businessData.findFirst();
  return business as BusinessData | null;
}

/**
 * Obtiene el negocio y valida que tenga access token configurado
 */
export async function getBusinessWithAccessToken(): Promise<BusinessData> {
  const business = await getBusinessOrThrow();
  
  if (!business.whatsapp_access_token) {
    throw new WhatsAppError('ACCESS_TOKEN_NOT_CONFIGURED', 'Access Token no configurado');
  }
  
  return business;
}

/**
 * Obtiene el negocio y valida que tenga sesión creada
 */
export async function getBusinessWithSession(): Promise<BusinessData> {
  const business = await getBusinessWithAccessToken();
  
  if (!business.whatsapp_session_id) {
    throw new WhatsAppError('SESSION_NOT_CREATED', 'Sesión no creada');
  }
  
  return business;
}

/**
 * Obtiene el negocio y valida que esté conectado
 */
export async function getBusinessConnected(): Promise<BusinessData> {
  const business = await getBusinessOrThrow();
  
  if (!business.whatsapp_api_key || !business.whatsapp_connected) {
    throw new WhatsAppError('SESSION_NOT_CONNECTED', 'WhatsApp no está conectado');
  }
  
  return business;
}

/**
 * Actualiza los datos de WhatsApp del negocio
 */
export async function updateBusinessWhatsApp(
  businessId: string,
  data: Partial<{
    whatsapp_enabled: boolean;
    whatsapp_connected: boolean;
    whatsapp_phone_number: string | null;
    whatsapp_session_id: number | null;
    whatsapp_access_token: string | null;
    whatsapp_api_key: string | null;
    whatsapp_webhook_secret: string | null;
    whatsapp_allowed_remitents: string | null;
  }>
): Promise<void> {
  await prisma.businessData.update({
    where: { id: businessId },
    data,
  });
}

