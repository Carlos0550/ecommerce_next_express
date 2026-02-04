import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminStore } from "@/stores/useAdminStore";
export const useGetSales = (
  page?: number,
  limit?: number,
  start_date?: string,
  end_date?: string,
  pendingOnly?: boolean,
) => {
  const fetchSales = useAdminStore((state) => state.fetchSales);
  return useQuery({
    queryKey: ["admin-sales", page, limit, start_date, end_date, pendingOnly],
    queryFn: async () => {
      return await fetchSales({
        page,
        limit,
        start_date,
        end_date,
        pendingOnly,
      });
    },
  });
};
export const useGetSalesAnalytics = (
  start_date?: string,
  end_date?: string,
) => {
  const fetchSalesAnalytics = useAdminStore(
    (state) => state.fetchSalesAnalytics,
  );
  const isAuthenticated = useAdminStore((state) => !!state.business); 
  return useQuery({
    queryKey: ["admin-sales-analytics", start_date, end_date],
    queryFn: async () => {
      return await fetchSalesAnalytics({ start_date, end_date });
    },
    enabled: !!start_date && !!end_date && isAuthenticated,
  });
};
export const useProcessSale = () => {
  const processSale = useAdminStore((state) => state.processSale);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: processSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sales"] });
    },
  });
};
export const useDeclineSale = () => {
  const declineSale = useAdminStore((state) => state.declineSale);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ saleId, reason }: { saleId: string; reason: string }) =>
      declineSale(saleId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sales"] });
    },
  });
};
export const useDeleteSale = () => {
  const deleteSale = useAdminStore((state) => state.deleteSale);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sales"] });
    },
  });
};
export const useGetSaleReceipt = () => {
  const fetchSaleReceipt = useAdminStore((state) => state.fetchSaleReceipt);
  return useMutation({
    mutationFn: fetchSaleReceipt,
  });
};
export const useSaveSale = () => {
  const saveSale = useAdminStore((state) => state.saveSale);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sales"] });
    },
  });
};
export const useUpdateSale = () => {
  const updateSale = useAdminStore((state) => state.updateSale);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      updateSale(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sales"] });
    },
  });
};
