import { useMutation, useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/providers/AppContext';
import { showNotification } from '@mantine/notifications';

type Profile = {
  id: number;
  email: string;
  name: string;
  profile_image?: string;
  phone?: string;
  shipping_street?: string;
  shipping_postal_code?: string;
  shipping_city?: string;
  shipping_province?: string;
};

type UpdatePayload = Partial<{
  name: string;
  phone: string;
  shipping_street: string;
  shipping_postal_code: string;
  shipping_city: string;
  shipping_province: string;
}>;

export function useGetProfile() {
  const { utils: { baseUrl, getTenantHeaders, tenantSlug }, auth: { state } } = useAppContext();
  return useQuery<{ ok: boolean; user: Profile | null }, Error>({
    queryKey: ['profile'],
    queryFn: async () => {
      const headers = getTenantHeaders();
      if (!headers['x-tenant-slug']) throw new Error('No tenant slug available');
      headers['Authorization'] = `Bearer ${state.token}`;
      
      const res = await fetch(`${baseUrl}/profile/me`, { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'profile_fetch_failed');
      return json;
    },
    enabled: !!state.token && !!tenantSlug,
  });
}

export function useUpdateProfile() {
  const { utils: { baseUrl, getTenantHeaders }, auth: { state } } = useAppContext();
  return useMutation<{ ok: boolean; user: Profile }, Error, UpdatePayload>({
    mutationKey: ['profile_update'],
    mutationFn: async (payload) => {
      const headers = getTenantHeaders();
      if (!headers['x-tenant-slug']) throw new Error('No tenant slug available');
      headers['Content-Type'] = 'application/json';
      headers['Authorization'] = `Bearer ${state.token}`;

      const res = await fetch(`${baseUrl}/profile/me`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'profile_update_failed');
      return json;
    },
    onSuccess() {
      return showNotification({ message: 'Perfil actualizado con éxito', color: 'teal' });
    },
    onError() {
      return showNotification({ message: 'Error al actualizar perfil', color: 'red' });
    },
  });
}

export function useUploadAvatar() {
  const { utils: { baseUrl, getTenantHeaders }, auth: { state } } = useAppContext();
  return useMutation<{ ok: boolean; user: Pick<Profile, 'id'|'email'|'name'|'profile_image'>; url: string }, Error, File>({
    mutationKey: ['profile_avatar'],
    mutationFn: async (file) => {
      const fd = new FormData();
      fd.append('image', file);
      
      const headers = getTenantHeaders();
      if (!headers['x-tenant-slug']) throw new Error('No tenant slug available');
      // Content-Type is set automatically by fetch when using FormData
      delete headers['Content-Type']; 
      headers['Authorization'] = `Bearer ${state.token}`;

      const res = await fetch(`${baseUrl}/profile/avatar`, { method: 'POST', headers, body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'avatar_upload_failed');
      return json;
    },
  });
}

export function useChangePassword() {
  const { utils: { baseUrl, getTenantHeaders }, auth: { state } } = useAppContext();
  return useMutation<{ ok: boolean }, Error, { old_password: string; new_password: string }>({
    mutationKey: ['profile_change_password'],
    mutationFn: async (payload) => {
      const headers = getTenantHeaders();
      if (!headers['x-tenant-slug']) throw new Error('No tenant slug available');
      headers['Content-Type'] = 'application/json';
      headers['Authorization'] = `Bearer ${state.token}`;

      const res = await fetch(`${baseUrl}/shop/password/change`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      type ChangePasswordResponse = { ok: boolean; error?: string };
      const json = await res.json().catch(() => null) as ChangePasswordResponse | null;
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'change_failed');
      return { ok: true };
    },
  });
}

