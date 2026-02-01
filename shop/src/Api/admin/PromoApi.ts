import { showNotification } from "@mantine/notifications";
import { baseUrl } from ".";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminContext } from "@/providers/AdminContext";

export const PromoTypes = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
} as const;

export type PromoType = typeof PromoTypes[keyof typeof PromoTypes];

export type PromoRequest = {
    code?: string
    title?: string
    description?: string
    image?: string
    type?: PromoType
    value?: number
    max_discount?: number
    min_order_amount?: number
    start_date?: string
    end_date?: string
    is_active?: boolean
    usage_limit?: number
    usage_count?: number
    show_in_home?: boolean
    per_user_limit?: number
    categories?: string[]
    products?: string[]
}

export const useSubmitPromo = () => {
  const {
    auth: { token },
  } = useAdminContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["submitPromo"],
    retryDelay: 1000,
    retry: (failureCount) => failureCount < 1,
    mutationFn: async ({ values, image }: { values: PromoRequest; image?: File }) => {
      const formData = new FormData();

      formData.append("code", values.code || "");
      formData.append("title", values.title || "");
      formData.append("description", values.description || "");
      formData.append("image", image ?? new File([], ""));
      formData.append("type", values.type || PromoTypes.PERCENTAGE);
      formData.append("value", String(values.value || 0));
      formData.append("max_discount", String(values.max_discount || 0));
      formData.append("min_order_amount", String(values.min_order_amount || 0));
      formData.append("start_date", values.start_date || "");
      formData.append("end_date", values.end_date || "");
      formData.append("is_active", String(values.is_active || false));
      formData.append("usage_limit", String(values.usage_limit || 0));
      formData.append("usage_count", String(values.usage_count || 0));
      formData.append("show_in_home", String(values.show_in_home || false));
      formData.append("per_user_limit", String(values.per_user_limit || 0));
      formData.append("categories", JSON.stringify(values.categories || []));
      formData.append("products", JSON.stringify(values.products || []));

      const url = new URL(baseUrl + "/promos");
      const response = await fetch(url, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      const rd = await response.json();
      if (response.status === 500) throw new Error(rd.error || rd.message || "Error interno del servidor");
      if (!response.ok) {
        const message = rd.error || rd.message || "Ocurrió un error, por favor intente de nuevo.";
        throw new Error(message);
      }
      return rd;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promos"] });
      showNotification({
        title: "Promo guardada",
        message: "La promo se ha guardado correctamente.",
        color: "green",
        autoClose: 3000,
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Error interno del servidor, por favor intente de nuevo.";
      showNotification({
        title: "Error al guardar la promo",
        message,
        color: "red",
        autoClose: 3000,
      });
    },
  });
};

export type Promo = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  image?: string | null;
  type: "percentage" | "fixed" | string;
  value: number;
  max_discount?: number | null;
  min_order_amount?: number | null;
  start_date?: string | Date | null;
  end_date?: string | Date | null;
  is_active: boolean;
  usage_limit?: number | null;
  usage_count?: number | null;
  show_in_home?: boolean;
  per_user_limit?: number | null;
  all_products?: boolean;
  all_categories?: boolean;
  categories?: Array<{ id: string; title: string }>;
  products?: Array<{ id: string; title: string }>;
};

export const useGetPromos = () => {
  const {
    auth: { token },
  } = useAdminContext();
  return useQuery<{ ok: boolean; promos: Promo[] }>({
    queryKey: ["promos"],
    queryFn: async () => {
      const url = new URL(baseUrl + "/promos");
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const rd = await response.json();
      if (!response.ok) {
        const message = rd.error || rd.message || "Error al obtener promociones.";
        throw new Error(message);
      }
      return rd;
    },
  });
};

export const useDeletePromo = () => {
  const queryClient = useQueryClient();
  const {
    auth: { token },
  } = useAdminContext();
  return useMutation({
    mutationKey: ["deletePromo"],
    mutationFn: async (id: string) => {
      const url = new URL(baseUrl + `/promos/${id}`);
      const response = await fetch(url, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const rd = await response.json();
      if (!response.ok) {
        const message = rd.error || rd.message || "Error al eliminar la promoción.";
        throw new Error(message);
      }
      return rd;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promos"] });
      showNotification({
        title: "Promoción eliminada",
        message: "La promoción se eliminó correctamente.",
        color: "green",
        autoClose: 2500,
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Error al eliminar la promoción.";
      showNotification({ title: "Error", message, color: "red" });
    },
  });
};

export const useUpdatePromo = () => {
  const queryClient = useQueryClient();
  const {
    auth: { token },
  } = useAdminContext();
  return useMutation({
    mutationKey: ["updatePromo"],
    mutationFn: async ({ id, values, image }: { id: string; values: PromoRequest; image?: File }) => {
      const formData = new FormData();
      if (values.code != null) formData.append("code", values.code);
      if (values.title != null) formData.append("title", values.title);
      if (values.description != null) formData.append("description", values.description);
      if (image) formData.append("image", image);
      if (values.type != null) formData.append("type", values.type);
      if (values.value != null) formData.append("value", String(values.value));
      if (values.max_discount != null) formData.append("max_discount", String(values.max_discount));
      if (values.min_order_amount != null) formData.append("min_order_amount", String(values.min_order_amount));
      if (values.start_date != null) formData.append("start_date", values.start_date);
      if (values.end_date != null) formData.append("end_date", values.end_date);
      if (values.is_active != null) formData.append("is_active", String(values.is_active));
      if (values.usage_limit != null) formData.append("usage_limit", String(values.usage_limit));
      if (values.usage_count != null) formData.append("usage_count", String(values.usage_count));
      if (values.show_in_home != null) formData.append("show_in_home", String(values.show_in_home));
      if (values.per_user_limit != null) formData.append("per_user_limit", String(values.per_user_limit));
      if (Array.isArray(values.categories)) formData.append("categories", JSON.stringify(values.categories));
      if (Array.isArray(values.products)) formData.append("products", JSON.stringify(values.products));

      const url = new URL(baseUrl + `/promos/${id}`);
      const response = await fetch(url, {
        method: "PUT",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      const rd = await response.json();
      if (!response.ok) {
        const message = rd.error || rd.message || "Error al actualizar la promoción.";
        throw new Error(message);
      }
      return rd;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promos"] });
      showNotification({ title: "Promoción actualizada", message: "Se guardaron los cambios.", color: "green" });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Error al actualizar la promoción.";
      showNotification({ title: "Error", message, color: "red" });
    },
  });
};

export const useTogglePromoActive = () => {
  const queryClient = useQueryClient();
  const {
    auth: { token },
  } = useAdminContext();
  return useMutation({
    mutationKey: ["togglePromoActive"],
    mutationFn: async ({ id, is_active }: { id: string; is_active?: boolean }) => {
      const url = new URL(baseUrl + `/promos/${id}/active`);
      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active }),
      });
      const rd = await response.json();
      if (!response.ok) {
        const message = rd.error || rd.message || "Error al cambiar el estado de la promoción.";
        throw new Error(message);
      }
      return rd;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promos"] });
    },
  });
};