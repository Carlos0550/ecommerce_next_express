import { prisma } from '@/config/prisma';
const WASENDER_API_KEY = process.env.WASENDER_API_KEY || '';
export function getWasenderApiKey(): string {
  if (!WASENDER_API_KEY) {
    throw new WhatsAppError('ACCESS_TOKEN_NOT_CONFIGURED', 'WASENDER_API_KEY no configurado en variables de entorno');
  }
  return WASENDER_API_KEY;
}
export function hasWasenderApiKey(): boolean {
  return !!WASENDER_API_KEY;
}
export interface BusinessData {
  id: string;
  name: string | null;
  type: string | null;
  description: string | null;
  whatsapp_enabled: boolean;
  whatsapp_connected: boolean;
  whatsapp_phone_number: string | null;
  whatsapp_session_id: number | null;
  whatsapp_api_key: string | null;
  whatsapp_webhook_secret: string | null;
  whatsapp_allowed_remitents: string | null;
}
export class WhatsAppError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'WhatsAppError';
  }
}
export async function getBusinessOrThrow(): Promise<BusinessData> {
  const business = await prisma.businessData.findFirst();
  if (!business) {
    throw new WhatsAppError('BUSINESS_NOT_FOUND', 'Negocio no encontrado');
  }
  return business as BusinessData;
}
export async function getBusiness(): Promise<BusinessData | null> {
  const business = await prisma.businessData.findFirst();
  return business as BusinessData | null;
}
export async function getBusinessWithAccessToken(): Promise<BusinessData> {
  const business = await getBusinessOrThrow();
  if (!hasWasenderApiKey()) {
    throw new WhatsAppError('ACCESS_TOKEN_NOT_CONFIGURED', 'WASENDER_API_KEY no configurado en variables de entorno');
  }
  return business;
}
export async function getBusinessWithSession(): Promise<BusinessData> {
  const business = await getBusinessWithAccessToken();
  if (!business.whatsapp_session_id) {
    throw new WhatsAppError('SESSION_NOT_CREATED', 'Sesión no creada');
  }
  return business;
}
export async function getBusinessConnected(): Promise<BusinessData> {
  const business = await getBusinessOrThrow();
  if (!business.whatsapp_api_key || !business.whatsapp_connected) {
    throw new WhatsAppError('SESSION_NOT_CONNECTED', 'WhatsApp no está conectado');
  }
  return business;
}
export async function updateBusinessWhatsApp(
  businessId: string,
  data: Partial<{
    whatsapp_enabled: boolean;
    whatsapp_connected: boolean;
    whatsapp_phone_number: string | null;
    whatsapp_session_id: number | null;
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
