import { useInfiniteQuery } from "@tanstack/react-query";
import { useConfigStore } from "@/stores/useConfigStore";
interface UseInfiniteProductsParams {
  limit?: number;
  title?: string;
  categoryId?: string;
  initialData?: unknown;
}
export const useInfiniteProducts = ({
  limit = 30,
  title = "",
  categoryId = "",
  initialData,
}: UseInfiniteProductsParams) => {
  const fetchPublicProducts = useConfigStore(
    (state) => state.fetchPublicProducts,
  );
  return useInfiniteQuery({
    queryKey: ["public-products", limit, title, categoryId],
    queryFn: async ({ pageParam = 1 }) => {
      return await fetchPublicProducts({
        page: pageParam,
        limit,
        title,
        categoryId,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: {
      data?: { page: number; totalPages: number };
      page?: number;
      totalPages?: number;
    }) => {
      const page = lastPage.data?.page ?? lastPage.page;
      const totalPages = lastPage.data?.totalPages ?? lastPage.totalPages;
      if (page === undefined || totalPages === undefined) return undefined;
      return page < totalPages ? page + 1 : undefined;
    },
    initialData: initialData
      ? { pages: [initialData], pageParams: [1] }
      : undefined,
  });
};
