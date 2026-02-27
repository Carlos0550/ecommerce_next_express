import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminStore, GetProductsParams } from "@/stores/useAdminStore";
export const useGetAllProducts = (params?: GetProductsParams) => {
  const fetchProducts = useAdminStore((state) => state.fetchProducts);
  return useQuery({
    queryKey: ["admin-products", params],
    queryFn: async () => {
      await fetchProducts(params);
      const state = useAdminStore.getState();
      return {
        products: state.products,
        pagination: state.productsPagination,
      };
    },
  });
};
export const useCreateProduct = () => {
  const createProduct = useAdminStore((state) => state.createProduct);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });
};
export const useUpdateProduct = () => {
  const updateProduct = useAdminStore((state) => state.updateProduct);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      updateProduct(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });
};
export const useDeleteProduct = () => {
  const deleteProduct = useAdminStore((state) => state.deleteProduct);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });
};
export const useUpdateProductStock = () => {
  const updateProductStock = useAdminStore((state) => state.updateProductStock);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      quantity,
    }: {
      productId: string;
      quantity: number;
    }) => updateProductStock(productId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });
};
export const useEnhanceProductContent = () => {
  const enhanceProduct = useAdminStore((state) => state.enhanceProduct);
  return useMutation({
    mutationFn: (payload: {
      productId?: string;
      title?: string;
      description?: string;
      additionalContext?: string;
      imageUrls?: string[];
    }) => enhanceProduct(payload),
  });
};
export const useUpdateProductDetails = () => {
  const updateProduct = useAdminStore((state) => state.updateProduct);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      ...payload
    }: {
      productId: string;
      [key: string]: unknown;
    }) => {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (key === "images") {
          (value as File[]).forEach((file) =>
            formData.append("productImages", file),
          );
        } else {
          formData.append(
            key,
            typeof value === "object" ? JSON.stringify(value) : String(value),
          );
        }
      });
      return updateProduct(productId, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });
};
