import { useQuery } from "@tanstack/react-query";
import type { PublicCategory } from "@/stores/useConfigStore";
import { useConfigStore } from "@/stores/useConfigStore";
export const usePublicCategories = (initialData?: unknown) => {
  const fetchPublicCategories = useConfigStore(
    (state) => state.fetchPublicCategories,
  );
  return useQuery<PublicCategory[]>({
    queryKey: ["public-categories"],
    queryFn: async () => {
      await fetchPublicCategories();
      return useConfigStore.getState().publicCategories;
    },
    initialData: ((initialData as { data?: unknown })?.data ??
      (initialData as unknown)) as PublicCategory[],
    staleTime: 1000 * 60 * 60,
  });
};
