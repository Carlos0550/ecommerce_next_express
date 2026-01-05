import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/Context/AppContext";
import { notifications } from "@mantine/notifications";
import { baseUrl } from "./index";

export type Category_info = {
  id: string;
  title: string;
  active: boolean;
  image: string;
  created_at: string | number | Date;
}

export type ProductState =
  | 'active'
  | 'inactive'
  | 'draft'
  | 'out_stock'
  | 'deleted';

export type Product = {
  id: string;
  state: ProductState;
  title: string;
  name: string;
  price: number;
  active: boolean;
  images: string[];
  description?: string;
  category?: Category_info;
  created_at?: string | number | Date;
  stock?: number;
  options?: { name: string; values: string[] }[];
};

export type Pagination = {
  hasNextPage: boolean
  hasPrevPage: boolean
  limit: number
  page: number
  total: number
  totalPages: number
};

export type GetProductsResponse = {
  products: Product[];
  pagination?: Pagination;
};

type SaveProductPayload = {
  title: string;
  price: string | number;
  tags?: string[];
  active: boolean;
  category?: string;
  description?: string;
  images: File[];
  
  fillWithAI?: boolean;
  existingImageUrls?: string[];
  deletedImageUrls?: string[];
  productId?: string;
  state?: ProductState;
  publishAutomatically?: boolean;
  stock?: number;
  additionalContext?: string;
  options?: { name: string; values: string[] }[];
};

export const useSaveProduct = () => {
  const queryClient = useQueryClient();
  const {
    auth: {
      token
    }
  } = useAppContext();

  return useMutation({
    mutationKey: ["saveProduct"],
    mutationFn: async (value: SaveProductPayload) => {
      try {
        console.log("📤 useSaveProduct - value.fillWithAI:", value.fillWithAI);
        console.log("📤 useSaveProduct - value.state:", value.state);
        
        const formData = new FormData();
        formData.append("title", value.title);
        formData.append("price", String(value.price));
        formData.append("active", String(value.active));
        if (value.tags) {
          formData.append("tags", JSON.stringify(value.tags));
        }
        if (value.category) {
          formData.append("category_id", value.category);
        }
        if (value.description) {
          formData.append("description", value.description);
        }
        if (typeof value.stock === "number") {
          formData.append("stock", String(value.stock));
        }
        if (value.productId) {
          formData.append("product_id", value.productId);
        }
        if (Array.isArray(value.existingImageUrls)) {
          formData.append("existing_image_urls", JSON.stringify(value.existingImageUrls));
        }
        if (Array.isArray(value.deletedImageUrls)) {
          formData.append("deleted_image_urls", JSON.stringify(value.deletedImageUrls));
        }
        value.images.forEach((image: File) => {
          formData.append("productImages", image);
        });

        formData.append("fillWithAI", value.fillWithAI ? "true" : "false");
        formData.append("state", value.state || "active"); 

        if(value.publishAutomatically) {
          formData.append("publishAutomatically", "true");
        }
        if (value.additionalContext) {
          formData.append("additionalContext", value.additionalContext);
        }
        if (value.options) {
          formData.append("options", JSON.stringify(value.options));
        }

        const res = await fetch(baseUrl + "/products/save-product", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          body: formData,
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData?.error || "Error creando el producto");
        }

        return res.json();
      } catch (error: unknown) {
        console.log(error);
        if (error instanceof Error) throw error;
        throw new Error(String(error));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      notifications.show({
        message: "Producto creado con éxito",
        color: "green"
      });
    },
    onError: (error: Error) => {
      notifications.show({
        message: error?.message ?? "Error al crear el producto",
        color: "red"
      });
    }
  });
};

export type GetProductsParams = {
  page: number;
  limit: number;
  title?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  state: ProductState;
};

export const useGetAllProducts = (
  params: GetProductsParams = { page: 1, limit: 10, state: 'active' }
) => {
  const {
    auth: {
      token
    }
  } = useAppContext();

  return useQuery<GetProductsResponse, Error>({
    queryKey: ["products", params],
    queryFn: () => getAllProducts(params, token),
    enabled: !!token,
  });
};

const buildQueryString = (queryParams: GetProductsParams): string => {
  const qs = new URLSearchParams();
  qs.set("page", String(queryParams.page));
  qs.set("limit", String(queryParams.limit));
  qs.set("state", queryParams.state);
  if (queryParams.title) qs.set("title", queryParams.title);
  if (queryParams.categoryId) qs.set("categoryId", queryParams.categoryId);
  if (typeof queryParams.minPrice === "number")
    qs.set("minPrice", String(queryParams.minPrice));
  if (typeof queryParams.maxPrice === "number")
    qs.set("maxPrice", String(queryParams.maxPrice));
  if (typeof queryParams.isActive === "boolean")
    qs.set("isActive", String(queryParams.isActive));
  if (queryParams.sortBy) qs.set("sortBy", queryParams.sortBy);
  if (queryParams.sortOrder) qs.set("sortOrder", queryParams.sortOrder);
  return qs.toString();
};

const getAllProducts = async (
  queryParams: GetProductsParams,
  token: string | null
): Promise<GetProductsResponse> => {
  try {
    const qs = buildQueryString(queryParams);
    const res = await fetch(`${baseUrl}/products?${qs}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.error || "Error obteniendo los productos");
    }

    if (Array.isArray(json)) {
      return { products: json, pagination: undefined };
    }

    const products = Array.isArray(json?.data?.products)
      ? (json.data.products as Product[])
      : Array.isArray(json?.products)
      ? (json.products as Product[])
      : Array.isArray(json?.data)
      ? (json.data as Product[])
      : [];

    const pagination: Pagination | undefined =
      (json?.pagination as Pagination | undefined) ||
      (json?.data?.pagination as Pagination | undefined) ||
      undefined;

    return { products, pagination };
  } catch (error: unknown) {
    console.log(error);
    if (error instanceof Error) throw error;
    throw new Error(String(error));
  }
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  const {
    auth: {
      token
    }
  } = useAppContext();

  return useMutation({
    mutationKey: ["deleteProduct"],
    mutationFn: async (id: string) => {
      try {
        const res = await fetch(`${baseUrl}/products/${id}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error || "Error eliminando el producto");
        }
        return json;
      } catch (error: unknown) {
        console.log(error);
        if (error instanceof Error) throw error;
        throw new Error(String(error));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      notifications.show({
        message: "Producto eliminado con éxito",
        color: "green"
      });
    },
    onError: (error: Error) => {
      notifications.show({
        message: error?.message ?? "Error al eliminar el producto",
        color: "red"
      });
    }
  });
};


export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  const {
    auth: {
      token
    }
  } = useAppContext();

  return useMutation({
    mutationKey: ["updateProduct"],
    mutationFn: async (value: SaveProductPayload) => {
      try {
        const formData = new FormData();
        formData.append("title", value.title);
        formData.append("price", String(value.price));
        formData.append("active", String(value.active));
        if (value.tags) {
          formData.append("tags", JSON.stringify(value.tags));
        }
        if (value.category) {
          formData.append("category_id", value.category);
        }
        if (value.description) {
          formData.append("description", value.description);
        }
        if (value.productId) {
          formData.append("product_id", value.productId);
        }
        if (Array.isArray(value.existingImageUrls)) {
          formData.append("existing_image_urls", JSON.stringify(value.existingImageUrls));
        }
        if (Array.isArray(value.deletedImageUrls)) {
          formData.append("deleted_image_urls", JSON.stringify(value.deletedImageUrls));
        }
        value.images.forEach((image: File) => {
          formData.append("productImages", image);
        });
        if (value.fillWithAI !== undefined) {
          formData.append("fillWithAI", value.fillWithAI ? "true" : "false");
        }
        if (value.state) {
          formData.append("state", value.state);
        }
        if (typeof value.stock === "number") {
          formData.append("stock", String(value.stock));
        }
        if (typeof value.stock === "number") {
          formData.append("stock", String(value.stock));
        }
        if (value.additionalContext) {
          formData.append("additionalContext", value.additionalContext);
        }
        if (value.options) {
          formData.append("options", JSON.stringify(value.options));
        }

        console.log("Actualizando producto...")
        const res = await fetch(baseUrl + "/products/" + value.productId, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          body: formData,
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData?.error || "Error actualizando el producto");
        }
        console.log("Actualizacion exitosa", res)
        return res.json();
      } catch (error: unknown) {
        console.log(error);
        if (error instanceof Error) throw error;
        throw new Error(String(error));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      notifications.show({
        message: "Producto actualizado con éxito",
        color: "green"
      });
    },
    onError: (error: Error) => {
      notifications.show({
        message: error?.message ?? "Error al actualizar el producto",
        color: "red"
      });
    }
  });
};

export const useUpdateProductState = () => {
  const queryClient = useQueryClient();
  const {
    auth: { token },
  } = useAppContext();

  return useMutation({
    mutationKey: ["updateProductState"],
    mutationFn: async (payload: { productId: string; state: ProductState }) => {
      const res = await fetch(`${baseUrl}/products/status/${payload.productId}/${payload.state}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Error actualizando el estado del producto");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      notifications.show({
        message: "Estado actualizado con éxito",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        message: error?.message ?? "Error al actualizar el estado",
        color: "red",
      });
    },
  });
};

export const useUpdateProductStock = () => {
  const queryClient = useQueryClient();
  const {
    auth: { token },
  } = useAppContext();

  return useMutation({
    mutationKey: ["updateProductStock"],
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      const res = await fetch(`${baseUrl}/products/stock/${productId}/${quantity}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Error actualizando stock");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      notifications.show({
        message: "Stock actualizado",
        color: "green",
      });
    },
    onError: (error: Error) => {
      notifications.show({
        message: error?.message ?? "Error actualizando stock",
        color: "red",
      });
    },
  });
};


export type EnhanceResponse = {
  ok: boolean;
  proposal?: { title: string; description: string; options?: { name: string; values: string[] }[] };
  error?: string;
};

export const useEnhanceProductContent = () => {
  const {
    auth: { token },
  } = useAppContext();
  return useMutation({
    mutationKey: ["enhanceProductContent"],
    mutationFn: async ({ productId, additionalContext, imageUrls }: { productId: string; additionalContext?: string; imageUrls?: string[] }): Promise<EnhanceResponse> => {
      const res = await fetch(`${baseUrl}/products/ai/enhance/${productId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ additionalContext, imageUrls }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Error mejorando contenido con IA");
      }
      return json as EnhanceResponse;
    },
  });
};
