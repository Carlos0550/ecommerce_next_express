import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminStore } from "@/stores/useAdminStore";
export const useGetCategories = () => {
  const fetchCategories = useAdminStore((state) => state.fetchCategories);
  return useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      await fetchCategories();
      return useAdminStore.getState().categories;
    },
  });
};
export const useGetAllCategories = useGetCategories;
export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  const createCategory = useAdminStore((state) => state.createCategory);
  return useMutation({
    mutationFn: (formData: FormData) => createCategory(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });
};
export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  const updateCategory = useAdminStore((state) => state.updateCategory);
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      updateCategory(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });
};
export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  const deleteCategory = useAdminStore((state) => state.deleteCategory);
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });
};
export const useChangeCategoryStatus = () => {
  const queryClient = useQueryClient();
  const changeCategoryStatus = useAdminStore(
    (state) => state.changeCategoryStatus,
  );
  return useMutation({
    mutationFn: ({
      categoryId,
      status,
    }: {
      categoryId: string;
      status: string;
    }) => changeCategoryStatus(categoryId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });
};
