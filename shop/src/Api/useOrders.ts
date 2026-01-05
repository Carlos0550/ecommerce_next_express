import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/providers/AppContext';

type OrderItem = { title: string; price: number; quantity: number };
type Order = {
  id: string;
  items: OrderItem[];
  total: number;
  payment_method: string;
  created_at: string;
};

export default function useOrders(page: number = 1, limit: number = 10) {
  const { utils: { baseUrl, getTenantHeaders, tenantSlug }, auth: { state } } = useAppContext();
  return useQuery<{ ok: boolean; items: Order[]; page: number; total: number }, Error>({
    queryKey: ['my_orders', page, limit],
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      const headers = getTenantHeaders();
      if (!headers['x-tenant-slug']) {
          throw new Error('No tenant slug available');
      }
      headers['Authorization'] = `Bearer ${state.token}`;
      const res = await fetch(`${baseUrl}/orders/me?${qs}`, { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'orders_fetch_failed');
      return json;
    },
    enabled: !!state.token && !!tenantSlug,
  });
}
