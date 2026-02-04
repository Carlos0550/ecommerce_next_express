import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminStore } from "@/stores/useAdminStore";
export const useGetBusiness = () => {
  const fetchBusiness = useAdminStore((state) => state.fetchBusiness);
  return useQuery({
    queryKey: ["admin-business"],
    queryFn: async () => {
      await fetchBusiness();
      return useAdminStore.getState().business;
    },
  });
};
export const useCreateBusiness = () => {
  const updateBusiness = useAdminStore((state) => state.updateBusiness);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      updateBusiness("", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-business"] });
    },
  });
};
export const useUpdateBusiness = () => {
  const updateBusiness = useAdminStore((state) => state.updateBusiness);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Record<string, unknown>;
    }) => updateBusiness(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-business"] });
    },
  });
};
export const useUploadBusinessImage = () => {
  const queryClient = useQueryClient();
  const uploadImage = async ({
    file,
    field,
    id,
  }: {
    file: File;
    field: string;
    id?: string;
  }) => {
    const { adminService } = await import("@/services/admin.service");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("field", field);
    if (id) formData.append("id", id);
    const data = await adminService.uploadBusinessImage(formData);
    return data.url;
  };
  return useMutation({
    mutationFn: uploadImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-business"] });
    },
  });
};
export const useGenerateDescription = () => {
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      type?: string;
      city?: string;
      province?: string;
      actualDescription?: string;
    }) => {
      const { api } = await import("@/config/api");
      const { data } = await api.post(
        "/business/generate-description",
        payload,
      );
      return data.description;
    },
  });
};
