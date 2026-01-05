/**
 * Cliente para WasenderAPI
 * Documentación: https://wasenderapi.com/api-docs
 */

const WASENDER_BASE_URL = 'https://www.wasenderapi.com';

export interface CreateSessionParams {
  name: string;
  phone_number: string;
  webhook_url: string;
  account_protection?: boolean;
  log_messages?: boolean;
  webhook_enabled?: boolean;
  webhook_events?: string[];
  read_incoming_messages?: boolean;
  auto_reject_calls?: boolean;
  ignore_groups?: boolean;
  ignore_channels?: boolean;
  ignore_broadcasts?: boolean;
}

export interface CreateSessionResponse {
  success: boolean;
  data: {
    id: number;
    name: string;
    phone_number: string;
    status: string;
    account_protection: boolean;
    log_messages: boolean;
    read_incoming_messages: boolean;
    webhook_url: string;
    webhook_enabled: boolean;
    webhook_events: string[];
    api_key: string;
    webhook_secret: string;
    created_at: string;
    updated_at: string;
  };
}

export interface SessionStatus {
  success: boolean;
  data: {
    id: number;
    name: string;
    phone_number: string;
    status: 'connected' | 'disconnected' | 'connecting' | 'qr_ready';
    account_protection: boolean;
    log_messages: boolean;
    webhook_url: string;
    webhook_enabled: boolean;
    webhook_events: string[];
  };
}

export interface QRCodeResponse {
  success: boolean;
  data: {
    qrCode: string; 
  };
}

export interface SendMessageParams {
  to: string;
  message: string;
}

export interface SendImageParams {
  to: string;
  image_url?: string;
  image_base64?: string;
  caption?: string;
}

export interface WebhookEvent {
  event: string;
  session_id: number;
  timestamp: string;
  data: any;
}

export interface MessageReceivedEvent {
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

export interface SessionStatusEvent {
  event: 'session.status';
  session_id: number;
  timestamp: string;
  data: {
    status: 'connected' | 'disconnected' | 'connecting' | 'qr_ready';
    phone_number?: string;
  };
}

class WasenderClient {
  private personalAccessToken: string;

  constructor(personalAccessToken: string) {
    this.personalAccessToken = personalAccessToken;
  }

  private headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.personalAccessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any
  ): Promise<T> {
    const url = `${WASENDER_BASE_URL}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: this.headers(),
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `WasenderAPI Error: ${response.status} - ${errorData.message || response.statusText}`
      );
    }

    
    const text = await response.text();
    if (!text) {
      return { success: true } as T;
    }
    
    try {
      return JSON.parse(text) as T;
    } catch {
      return { success: true } as T;
    }
  }

  /**
   * Crear una nueva sesión de WhatsApp
   */
  async createSession(params: CreateSessionParams): Promise<CreateSessionResponse> {
    const payload = {
      name: params.name,
      phone_number: params.phone_number,
      account_protection: params.account_protection ?? true,
      log_messages: params.log_messages ?? true,
      webhook_url: params.webhook_url,
      webhook_enabled: params.webhook_enabled ?? true,
      webhook_events: params.webhook_events ?? [
        'messages.upsert'
      ],
      read_incoming_messages: params.read_incoming_messages ?? false,
      auto_reject_calls: params.auto_reject_calls ?? false,
      ignore_groups: params.ignore_groups ?? true,
      ignore_channels: params.ignore_channels ?? true,
      ignore_broadcasts: params.ignore_broadcasts ?? true,
    };

    return this.request<CreateSessionResponse>('POST', '/api/whatsapp-sessions', payload);
  }

  /**
   * Obtener detalles de una sesión
   */
  async getSession(sessionId: number): Promise<SessionStatus> {
    return this.request<SessionStatus>('GET', `/api/whatsapp-sessions/${sessionId}`);
  }

  /**
   * Obtener detalles de una sesión (usando Personal Access Token)
   */
  async getSessionDetails(sessionId: number): Promise<SessionStatus> {
    return this.request<SessionStatus>('GET', `/api/whatsapp-sessions/${sessionId}`);
  }

  /**
   * Obtener estado de una sesión usando el API Key de la sesión
   * Endpoint: GET /api/status
   * Requiere el API Key de la sesión, no el Personal Access Token
   */
  async getSessionStatusWithApiKey(apiKey: string): Promise<{ status: string }> {
    const url = `${WASENDER_BASE_URL}/api/status`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `WasenderAPI Error: ${response.status} - ${errorData.message || response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Obtener código QR para escanear
   * Nota: Primero debes llamar a connectSession() para inicializar la sesión
   */
  async getQRCode(sessionId: number): Promise<QRCodeResponse> {
    return this.request<QRCodeResponse>('GET', `/api/whatsapp-sessions/${sessionId}/qrcode`);
  }

  /**
   * Eliminar/desconectar una sesión
   */
  async deleteSession(sessionId: number): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('DELETE', `/api/whatsapp-sessions/${sessionId}`);
  }

  /**
   * Desconectar una sesión sin eliminarla
   */
  async disconnectSession(sessionId: number): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('POST', `/api/whatsapp-sessions/${sessionId}/disconnect`);
  }

  /**
   * Conectar una sesión existente
   */
  async connectSession(sessionId: number): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('POST', `/api/whatsapp-sessions/${sessionId}/connect`);
  }

  /**
   * Enviar mensaje de texto usando el API Key de la sesión
   */
  async sendTextMessage(apiKey: string, params: SendMessageParams): Promise<{ success: boolean; data: any }> {
    const url = `${WASENDER_BASE_URL}/api/send-message`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        to: params.to,
        text: params.message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `WasenderAPI Error: ${response.status} - ${errorData.message || response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Enviar imagen usando el API Key de la sesión
   */
  async sendImageMessage(apiKey: string, params: SendImageParams): Promise<{ success: boolean; data: any }> {
    const url = `${WASENDER_BASE_URL}/api/send-image`;
    
    const payload: any = {
      to: params.to,
    };

    if (params.image_url) {
      payload.url = params.image_url;
    } else if (params.image_base64) {
      payload.base64 = params.image_base64;
    }

    if (params.caption) {
      payload.caption = params.caption;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `WasenderAPI Error: ${response.status} - ${errorData.message || response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Desencriptar archivo multimedia (imagen, video, audio, documento)
   * Endpoint: POST /api/decrypt-media
   * Documentación: https://wasenderapi.com/api-docs/messages/decrypt-media-file
   */
  async decryptMedia(apiKey: string, messageData: {
    key: { id: string };
    message: {
      imageMessage?: { url: string; mimetype?: string; mediaKey?: string };
      videoMessage?: { url: string; mimetype?: string; mediaKey?: string };
      audioMessage?: { url: string; mimetype?: string; mediaKey?: string };
      documentMessage?: { url: string; mimetype?: string; mediaKey?: string };
      stickerMessage?: { url: string; mimetype?: string; mediaKey?: string };
    };
  }): Promise<{ success: boolean; publicUrl: string }> {
    const url = `${WASENDER_BASE_URL}/api/decrypt-media`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        data: {
          messages: messageData,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `WasenderAPI Error: ${response.status} - ${errorData.message || response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Validar webhook signature
   */
  static validateWebhookSignature(
    payload: string,
    signature: string,
    webhookSecret: string
  ): boolean {
    
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

export default WasenderClient;

