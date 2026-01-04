import { z } from 'zod';

// Schema para configuración de WhatsApp
export const WhatsAppConfigSchema = z.object({
  whatsapp_enabled: z.boolean().optional(),
  whatsapp_access_token: z.string().min(1, 'Access Token es requerido').optional(),
  whatsapp_allowed_remitents: z.string().optional(),
});

export type WhatsAppConfig = z.infer<typeof WhatsAppConfigSchema>;

// Schema para crear sesión
export const CreateSessionSchema = z.object({
  name: z.string().min(1, 'Nombre de sesión es requerido'),
  phone_number: z.string().min(1, 'Número de teléfono es requerido'),
});

export type CreateSessionRequest = z.infer<typeof CreateSessionSchema>;

// Schema para mensaje de prueba
export const TestMessageSchema = z.object({
  to: z.string().min(1, 'Número destino es requerido'),
  message: z.string().min(1, 'Mensaje es requerido'),
});

export type TestMessageRequest = z.infer<typeof TestMessageSchema>;

// Estados de sesión de conversación en Redis
export type ConversationState = 'idle' | 'collecting' | 'reviewing' | 'confirming' | 'searching' | 'selecting' | 'editing';

// Mensaje en el historial de conversación
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

// Datos del producto en construcción
export interface ProductData {
  images: string[];
  price?: number;
  categoryId?: string;
  categoryName?: string;
  stock?: number;
  additionalContext?: string;
  draft?: boolean;
  aiResult?: {
    title: string;
    description: string;
    options: { name: string; values: string[] }[];
    suggestedCategory?: {
      name: string;
      confidence: 'high' | 'medium' | 'low';
    };
  };
}

// Sesión de conversación de WhatsApp
export interface WhatsAppConversationSession {
  adminId: number;
  phone: string;
  state: ConversationState;
  productData: ProductData;
  messageHistory: ConversationMessage[];
  lastActivity: Date;
  lastError?: string;
  selectedProductId?: string;
  searchResults?: Array<{ id: string; title: string; price: number; stock: number; state: string }>;
  userTone?: 'argentino' | 'formal' | 'neutral';
  greetingTone?: 'casual' | 'formal';
  hasGreeted?: boolean; // Indica si el agente ya envió un saludo inicial
  categoryPromptShown?: boolean; // Indica si ya se mostró el prompt de categorías
  // Acción pendiente que se ejecutará después de seleccionar un producto
  pendingAction?: {
    action: 'update_product' | 'delete_product';
    data?: {
      update_field?: string;
      update_value?: string | number;
      regenerate_with_ai?: boolean;
    };
  };
}

// Respuesta de la IA para el flujo conversacional
export interface AIConversationResponse {
  message: string;
  action: 
    | 'none' 
    | 'save_data' 
    | 'process_ai' 
    | 'create_product' 
    | 'cancel' 
    | 'reset' 
    | 'show_help' 
    | 'get_product'
    | 'search_products'
    | 'list_all_products'
    | 'list_low_stock'
    | 'select_product'
    | 'update_product'
    | 'delete_product'
    | 'end_conversation';
  data: {
    price?: number;
    stock?: number;
    category_id?: string;
    category_name?: string;
    category?: string; // Alias para category_name (la IA puede usar cualquiera)
    additional_context?: string;
    product_id?: string;
    draft?: boolean;
    search_query?: string;
    search_by?: 'name' | 'category';
    selected_index?: number;
    update_field?: 'title' | 'description' | 'price' | 'stock' | 'images' | 'state';
    update_value?: string | number;
    regenerate_with_ai?: boolean;
    new_images?: string[];
    product_name?: string; // Nombre del producto mencionado por el usuario
    user_context?: string; // Correcciones del usuario (ej: "no tiene estrellas de colores")
    updates?: Array<{
      field: 'title' | 'description' | 'price' | 'stock' | 'images' | 'state';
      value?: string | number;
      regenerate_with_ai?: boolean;
    }>;
    // Acción pendiente que se ejecutará después de seleccionar el producto
    pending_action?: {
      action: 'update_product' | 'delete_product';
      update_field?: 'title' | 'description' | 'price' | 'stock' | 'images' | 'state';
      update_value?: string | number;
      regenerate_with_ai?: boolean;
    };
  };
  next_state: ConversationState;
}

// Intención detectada en fase de revisión (mantenido para compatibilidad)
export type ReviewIntent =
  | { action: 'approve' }
  | { action: 'cancel' }
  | { action: 'edit_field'; field: string; newValue: string }
  | { action: 'replace_description'; description: string }
  | { action: 'unclear' };

// Datos extraídos por la IA del mensaje
export interface ExtractedProductData {
  price?: number;
  stock?: number;
  categoryId?: string;
  additionalContext?: string;
  missingFields: string[];
}

// Webhook event types
export interface WebhookMessageReceived {
  event: 'messages.received';
  session_id: number;
  timestamp: string;
  data: {
    id: string;
    from: string;
    to: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contact';
    body?: string;
    media_url?: string;
    caption?: string;
    timestamp: string;
    pushName?: string;
    isGroup: boolean;
    groupId?: string;
  };
}

export interface WebhookSessionStatus {
  event: 'session.status';
  session_id: number;
  timestamp: string;
  data: {
    status: 'connected' | 'disconnected' | 'connecting' | 'qr_ready';
    phone_number?: string;
  };
}

export interface WebhookQRUpdated {
  event: 'qr.updated';
  session_id: number;
  timestamp: string;
  data: {
    qr_code: string;
  };
}

export interface WebhookMessageUpsert {
  event: 'messages.upsert';
  session_id: number;
  timestamp: string;
  data: {
    from: string;
    to?: string;
    message_id: string;
    type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'sticker';
    body?: string;
    media_url?: string;
    caption?: string;
    timestamp: string;
    pushName?: string;
    isGroup: boolean;
    groupId?: string;
    fromMe?: boolean;
  };
}

export type WebhookEvent = WebhookMessageReceived | WebhookSessionStatus | WebhookQRUpdated | WebhookMessageUpsert;

// Response types
export interface WhatsAppConfigResponse {
  whatsapp_enabled: boolean;
  whatsapp_connected: boolean;
  whatsapp_phone_number: string | null;
  whatsapp_session_id: number | null;
  has_access_token: boolean;
  whatsapp_allowed_remitents: string | null;
}

export interface SessionCreateResponse {
  success: boolean;
  session_id: number;
  message: string;
}

export interface QRCodeResponse {
  success: boolean;
  qr_code: string;
}

export interface SessionStatusResponse {
  success: boolean;
  status: 'connected' | 'disconnected' | 'connecting' | 'qr_ready' | 'no_session';
  phone_number?: string;
}
