import { useQuery } from "@tanstack/react-query";
import { useConfigStore } from "@/stores/useConfigStore";
export const usePublicCategories = (initialData?: any) => {
  const fetchPublicCategories = useConfigStore(
    (state) => state.fetchPublicCategories,
  );
  const publicCategories = useConfigStore((state) => state.publicCategories);
  return useQuery({
    queryKey: ["public-categories"],
    queryFn: async () => {
      await fetchPublicCategories();
      return useConfigStore.getState().publicCategories;
    },
    initialData: initialData?.data || initialData,
    staleTime: 1000 * 60 * 60, 
  });
};
