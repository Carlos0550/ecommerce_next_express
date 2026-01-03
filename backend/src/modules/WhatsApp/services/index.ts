/**
 * Exportación centralizada de servicios del módulo WhatsApp
 */

// Servicios principales
export { configService } from './config.service';
export { sessionService } from './session.service';
export { messageService } from './message.service';
export { webhookHandler } from './webhook.handler';
export { albumService } from './album.service';

// Cliente de WasenderAPI
export { default as WasenderClient } from './wasender.client';

// Formateador de mensajes
export { messageFormatter } from './message.formatter';

// Módulo de conversación
export * from './conversation';

// Fachada de compatibilidad (deprecated)
export { whatsAppServices } from './whatsapp.services';
export { default as whatsAppServicesDefault } from './whatsapp.services';

