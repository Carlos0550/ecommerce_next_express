import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminContext } from '@/providers/AdminContext';
import { notifications } from '@mantine/notifications';
import { baseUrl } from './index';

export type FAQ = { id: string; question: string; answer: string; position: number; is_active: boolean };

export function useListFaqsAdmin(page: number = 1, limit: number = 50) {
  const { auth: { token } } = useAdminContext();
  return useQuery<{ ok: boolean; items: FAQ[]; page: number; total: number }, Error>({
    queryKey: ['faqs_admin', page, limit],
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      const res = await fetch(`${baseUrl}/faqs/admin?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'error_list_faqs');
      return json;
    },
    enabled: !!token,
  });
}

export function useCreateFaq() {
  const qc = useQueryClient();
  const { auth: { token } } = useAdminContext();
  return useMutation({
    mutationKey: ['faq_create'],
    mutationFn: async (payload: { question: string; answer: string; position?: number; is_active?: boolean }) => {
      const res = await fetch(`${baseUrl}/faqs`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'error_create_faq');
      return json;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['faqs_admin'] }); notifications.show({ message: 'FAQ creada', color: 'green' }); },
    onError: (e: any) => { notifications.show({ message: e?.message || 'Error creando FAQ', color: 'red' }); },
  });
}

export function useUpdateFaq() {
  const qc = useQueryClient();
  const { auth: { token } } = useAdminContext();
  return useMutation({
    mutationKey: ['faq_update'],
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ question: string; answer: string; position: number; is_active: boolean }> }) => {
      const res = await fetch(`${baseUrl}/faqs/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'error_update_faq');
      return json;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['faqs_admin'] }); notifications.show({ message: 'FAQ actualizada', color: 'green' }); },
    onError: (e: any) => { notifications.show({ message: e?.message || 'Error actualizando FAQ', color: 'red' }); },
  });
}

export function useDeleteFaq() {
  const qc = useQueryClient();
  const { auth: { token } } = useAdminContext();
  return useMutation({
    mutationKey: ['faq_delete'],
    mutationFn: async (id: string) => {
      const res = await fetch(`${baseUrl}/faqs/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'error_delete_faq');
      return json;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['faqs_admin'] }); notifications.show({ message: 'FAQ eliminada', color: 'green' }); },
    onError: (e: any) => { notifications.show({ message: e?.message || 'Error eliminando FAQ', color: 'red' }); },
  });
}

