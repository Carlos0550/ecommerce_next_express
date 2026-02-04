import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminStore } from "@/stores/useAdminStore";
export const useListFaqsAdmin = () => {
  const fetchFaqs = useAdminStore((state) => state.fetchFaqs);
  return useQuery({
    queryKey: ["admin-faqs"],
    queryFn: async () => {
      await fetchFaqs();
      const items = useAdminStore.getState().faqs;
      return { items: Array.isArray(items) ? items : [] };
    },
  });
};
export const useCreateFaq = () => {
  const createFaq = useAdminStore((state) => state.createFaq);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFaq,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
    },
  });
};
export const useUpdateFaq = () => {
  const updateFaq = useAdminStore((state) => state.updateFaq);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { question: string; answer: string; category?: string };
    }) => updateFaq(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
    },
  });
};
export const useDeleteFaq = () => {
  const deleteFaq = useAdminStore((state) => state.deleteFaq);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFaq,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
    },
  });
};
