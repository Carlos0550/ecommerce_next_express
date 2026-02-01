import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SaleRequest } from "@/Components/Admin/Sales/SalesForm";
import { baseUrl } from ".";
import { useAdminContext } from "@/providers/AdminContext";
import { showNotification } from "@mantine/notifications";

export const useSaveSale = () => {
  const queryClient = useQueryClient();
  const {
    auth: { token },
  } = useAdminContext();
  return useMutation({
    mutationKey: ["save-sale"],
    mutationFn: async (request: SaleRequest) => {
      const api = new URL(baseUrl + "/sales/save");

      const result = await fetch(api, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        method: "POST",
        body: JSON.stringify(request),
      });

      return await result.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["get-sales"] });
      if (data?.success) {
        showNotification({
          message: "Venta guardada con éxito",
          color: "green",
        });
      }
    },
    onError: (error: any) => {
      showNotification({
        message: (error as Error)?.message || "Error al guardar la venta",
        color: "red",
      });
    },
  });
};

export const useGetSales = (
  page: number = 1,
  per_page: number = 5,
  start_date?: string,
  end_date?: string,
  pending?: boolean,
) => {
  const {
    auth: { token },
  } = useAdminContext();
  return useQuery({
    queryKey: ["get-sales", page, per_page, start_date, end_date, pending],
    enabled: !!token,
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        per_page: String(per_page),
      };
      if (start_date) params["start_date"] = start_date;
      if (end_date) params["end_date"] = end_date;
      if (pending) params["pending"] = "true";
      const qs = new URLSearchParams(params).toString();
      const api = new URL(baseUrl + "/sales?" + qs);

      const result = await fetch(api, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        method: "GET",
      });
      const data = await result.json();
      console.log(data);
      return data;
    },
  });
};

export const useProcessSale = () => {
  const qc = useQueryClient();
  const {
    auth: { token },
  } = useAdminContext();
  return useMutation({
    mutationKey: ["process_sale"],
    mutationFn: async (id: string) => {
      const res = await fetch(`${baseUrl}/sales/${id}/process`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (!res.ok || !json?.success)
        throw new Error(json?.message || json?.err || "process_failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["get-sales"] });
      showNotification({
        message: "Orden procesada y cliente notificado",
        color: "green",
      });
    },
    onError: (e: any) => {
      showNotification({
        message: e?.message || "Error al procesar orden",
        color: "red",
      });
    },
  });
};

export type SalesAnalyticsResponse = {
  range: { start_date: string; end_date: string; days: number };
  totals: {
    sales_count: number;
    revenue_total: number;
    avg_order_value: number;
  };
  previous: { sales_count: number; revenue_total: number };
  growth: { revenue_percent: number; count_percent: number };
  timeseries: { by_day: { date: string; count: number; revenue: number }[] };
  breakdowns: {
    payment_methods: { method: string; count: number; revenue: number }[];
    sources: { source: string; count: number; revenue: number }[];
  };
};

export const useGetSalesAnalytics = (
  start_date?: string,
  end_date?: string,
) => {
  const {
    auth: { token },
  } = useAdminContext();
  return useQuery<SalesAnalyticsResponse>({
    queryKey: ["get-sales-analytics", start_date, end_date],
    enabled: !!token,
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (start_date) params["start_date"] = start_date;
      if (end_date) params["end_date"] = end_date;
      const qs = new URLSearchParams(params).toString();
      const api = new URL(baseUrl + "/sales/analytics" + (qs ? `?${qs}` : ""));

      const result = await fetch(api, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        method: "GET",
      });

      const json = await result.json();
      if (!result.ok || !json?.success) {
        throw new Error(
          json?.message || json?.err || "Error al obtener analíticas de ventas",
        );
      }
      return json.analytics as SalesAnalyticsResponse;
    },
  });
};

export const useGetSaleReceipt = () => {
  const {
    auth: { token },
  } = useAdminContext();
  return useMutation({
    mutationKey: ["get-sale-receipt"],
    mutationFn: async (saleId: string) => {
      const res = await fetch(`${baseUrl}/sales/${saleId}/receipt`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json?.success || !json?.url) {
        throw new Error(json?.message || json?.err || "receipt_not_found");
      }
      return json.url as string;
    },
    onError: (data) => {
      showNotification({
        title:
          data.message === "receipt_not_found"
            ? "Comprobante no encontrado"
            : "Error al buscar el comprobante.",
        message:
          data.message === "receipt_not_found"
            ? "No se encontró el comprobante para esta venta."
            : "Por favor, intente de nuevo.",
        autoClose: 4000,
      });
      return;
    },
  });
};

export const useDeclineSale = () => {
  const qc = useQueryClient();
  const {
    auth: { token },
  } = useAdminContext();
  return useMutation({
    mutationKey: ["decline-sale"],
    mutationFn: async ({
      saleId,
      reason,
    }: {
      saleId: string;
      reason: string;
    }) => {
      const res = await fetch(`${baseUrl}/sales/${saleId}/decline`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || json?.err || "decline_failed");
      }
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["get-sales"] });
      showNotification({
        title: "Venta declinada",
        message: "La venta ha sido declinada correctamente",
        color: "green",
      });
    },
    onError: (e: any) => {
      showNotification({
        message: e?.message || "Error al declinar la venta",
        color: "red",
      });
    },
  });
};

export const useUpdateSale = () => {
  const qc = useQueryClient();
  const {
    auth: { token },
  } = useAdminContext();
  return useMutation({
    mutationKey: ["update-sale"],
    mutationFn: async ({
      id,
      request,
    }: {
      id: string;
      request: SaleRequest;
    }) => {
      const res = await fetch(`${baseUrl}/sales/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });
      const json = await res.json();
      if (!res.ok || !json?.success)
        throw new Error(json?.message || json?.err || "update_failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["get-sales"] });
      showNotification({ message: "Venta actualizada", color: "green" });
    },
    onError: (e: any) => {
      showNotification({
        message: e?.message || "Error al actualizar venta",
        color: "red",
      });
    },
  });
};

export const useDeleteSale = () => {
  const qc = useQueryClient();
  const {
    auth: { token },
  } = useAdminContext();
  return useMutation({
    mutationKey: ["delete-sale"],
    mutationFn: async (id: string) => {
      const res = await fetch(`${baseUrl}/sales/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json?.success)
        throw new Error(json?.message || json?.err || "delete_failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["get-sales"] });
      showNotification({ message: "Venta eliminada", color: "green" });
    },
    onError: (e: any) => {
      showNotification({
        message: e?.message || "Error al eliminar venta",
        color: "red",
      });
    },
  });
};
