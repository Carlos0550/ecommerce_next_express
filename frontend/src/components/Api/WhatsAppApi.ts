import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { fetchWithTimeout } from "@/Utils/fetchWithTimeout";
import { baseUrl } from ".";
import { useAppContext } from "@/Context/AppContext";


export interface WhatsAppConfig {
  whatsapp_enabled: boolean;
  whatsapp_connected: boolean;
  whatsapp_phone_number: string | null;
  whatsapp_session_id: number | null;
  has_access_token: boolean;
  whatsapp_allowed_remitents: string | null;
}

export interface SessionStatus {
  status: 'connected' | 'disconnected' | 'connecting' | 'qr_ready' | 'no_session';
  phone_number?: string;
}

export interface QRCodeData {
  qr_code: string;
}


export function useGetWhatsAppConfig() {
  const { auth: { token } } = useAppContext();
  
  return useQuery<WhatsAppConfig>({
    queryKey: ["whatsapp-config"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetchWithTimeout(`${baseUrl}/whatsapp/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al obtener configuración");
      const data = await res.json();
      return data.data;
    },
    staleTime: 30000,
  });
}

export function useUpdateWhatsAppConfig() {
  const queryClient = useQueryClient();
  const { auth: { token } } = useAppContext();
  
  return useMutation({
    mutationFn: async (payload: { whatsapp_enabled?: boolean; whatsapp_allowed_remitents?: string }) => {
      const res = await fetchWithTimeout(`${baseUrl}/whatsapp/config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al actualizar configuración");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-config"] });
      notifications.show({
        message: "Configuración actualizada",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        message: error.message,
        color: "red",
      });
    },
  });
}


export function useCreateWhatsAppSession() {
  const queryClient = useQueryClient();
  const { auth: { token } } = useAppContext();
  
  return useMutation({
    mutationFn: async (payload: { name: string; phone_number: string }) => {
      const res = await fetchWithTimeout(`${baseUrl}/whatsapp/session/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al crear sesión");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-config"] });
    },
    onError: (error: Error) => {
      notifications.show({
        message: error.message,
        color: "red",
      });
    },
  });
}


export function useGetQRCode(enabled: boolean) {
  const { auth: { token } } = useAppContext();
  
  return useQuery<QRCodeData>({
    queryKey: ["whatsapp-qr"],
    enabled: enabled && !!token,
    queryFn: async () => {
      const res = await fetchWithTimeout(`${baseUrl}/whatsapp/session/qrcode`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al obtener QR");
      }
      const data = await res.json();
      return data.data;
    },
    refetchInterval: enabled ? 5000 : false,
    staleTime: 0,
  });
}


export function useGetSessionStatus(enabled: boolean) {
  const queryClient = useQueryClient();
  const { auth: { token } } = useAppContext();
  
  return useQuery<SessionStatus>({
    queryKey: ["whatsapp-status"],
    enabled: enabled && !!token,
    queryFn: async () => {
      const res = await fetchWithTimeout(`${baseUrl}/whatsapp/session/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al obtener estado");
      const data = await res.json();
      
      if (data.data.status === 'connected') {
        queryClient.invalidateQueries({ queryKey: ["whatsapp-config"] });
      }
      
      return data.data;
    },
    refetchInterval: enabled ? 3000 : false,
    staleTime: 0,
  });
}


export function useDisconnectWhatsAppSession() {
  const queryClient = useQueryClient();
  const { auth: { token } } = useAppContext();
  
  return useMutation({
    mutationFn: async () => {
      const res = await fetchWithTimeout(`${baseUrl}/whatsapp/session/disconnect`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al desconectar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-config"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-status"] });
      notifications.show({
        message: "WhatsApp desconectado",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        message: error.message,
        color: "red",
      });
    },
  });
}


export function useSendTestMessage() {
  const { auth: { token } } = useAppContext();
  
  return useMutation({
    mutationFn: async (payload: { to: string; message: string }) => {
      const res = await fetchWithTimeout(`${baseUrl}/whatsapp/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al enviar mensaje");
      }
      return res.json();
    },
    onSuccess: () => {
      notifications.show({
        message: "Mensaje enviado correctamente",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        message: error.message,
        color: "red",
      });
    },
  });
}
