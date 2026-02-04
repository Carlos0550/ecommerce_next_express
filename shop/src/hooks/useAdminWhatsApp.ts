import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminStore } from "@/stores/useAdminStore";
export const useGetWhatsAppConfig = () => {
  const fetchWhatsAppConfig = useAdminStore(
    (state) => state.fetchWhatsAppConfig,
  );
  return useQuery({
    queryKey: ["admin-whatsapp-config"],
    queryFn: async () => {
      return await fetchWhatsAppConfig();
    },
  });
};
export const useUpdateWhatsAppConfig = () => {
  const updateWhatsAppConfig = useAdminStore(
    (state) => state.updateWhatsAppConfig,
  );
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateWhatsAppConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-whatsapp-config"] });
    },
  });
};
export const useCreateWhatsAppSession = () => {
  const createWhatsAppSession = useAdminStore(
    (state) => state.createWhatsAppSession,
  );
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWhatsAppSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-whatsapp-config"] });
    },
  });
};
export const useGetQRCode = (enabled: boolean) => {
  const fetchWhatsAppQR = useAdminStore((state) => state.fetchWhatsAppQR);
  return useQuery({
    queryKey: ["admin-whatsapp-qr"],
    queryFn: async () => {
      return await fetchWhatsAppQR();
    },
    enabled,
    refetchInterval: 5000,
  });
};
export const useGetSessionStatus = (enabled: boolean) => {
  const fetchWhatsAppStatus = useAdminStore(
    (state) => state.fetchWhatsAppStatus,
  );
  return useQuery({
    queryKey: ["admin-whatsapp-status"],
    queryFn: async () => {
      return await fetchWhatsAppStatus();
    },
    enabled,
    refetchInterval: 5000,
  });
};
export const useDisconnectWhatsAppSession = () => {
  const disconnectWhatsApp = useAdminStore((state) => state.disconnectWhatsApp);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disconnectWhatsApp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-whatsapp-config"] });
    },
  });
};
export const useSendTestMessage = () => {
  const sendWhatsAppTest = useAdminStore((state) => state.sendWhatsAppTest);
  return useMutation({
    mutationFn: sendWhatsAppTest,
  });
};
