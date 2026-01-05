import { useAppContext } from "@/providers/AppContext";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";

export type FetchProductsParams = {
    page: number;
    limit: number;
    title: string;
    categoryId?: string;
}

export interface ProductCategory{
    id: string,
    title: string,
    image: string
}

export interface Products {
    id: string,
    title: string,
    price: number,
    stock: number,
    images: string[],
    description: string,
    category: ProductCategory
    options?: { name: string; values: string[] }[];
}

export type ProductsResponse = {
    data: {
        products: Products[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages?: number;
            hasNextPage?: boolean;
            hasPrevPage?: boolean;
        };
    };
};

export default function useProducts(params: FetchProductsParams){

    const {
        utils: {
            baseUrl,
            getTenantHeaders,
            tenantSlug
        }
    } = useAppContext()
    return useQuery<ProductsResponse>({
        queryKey: ['products', params],
        enabled: !!tenantSlug, 
        queryFn: async (): Promise<ProductsResponse> => {
            const qp = new URLSearchParams({
                page: params.page.toString(),
                limit: params.limit.toString(),
            })
            if (params.title && params.title.trim().length > 0) {
                qp.append('title', params.title.trim())
            }
            if (params.categoryId) {
                qp.append('categoryId', params.categoryId)
            }
            const headers = getTenantHeaders()
            if (!headers['x-tenant-slug']) {
                throw new Error('No tenant slug available')
            }
            const res = await fetch(`${baseUrl}/products/public?${qp}`, {
                headers
            })
            const data = await res.json();
            return data as ProductsResponse;
        },
        placeholderData: (previousData) => previousData
    })
}

export function useInfiniteProducts(params: Omit<FetchProductsParams, 'page'> & { initialData?: ProductsResponse }) {
  const {
    utils: { baseUrl, getTenantHeaders, tenantSlug }
  } = useAppContext();

  return useInfiniteQuery<ProductsResponse>({
    queryKey: ['products-infinite', params],
    enabled: !!tenantSlug, 
    initialPageParam: 1,
    initialData: params.initialData ? {
      pages: [params.initialData],
      pageParams: [1]
    } : undefined,
    queryFn: async ({ pageParam }) => {
      const qp = new URLSearchParams({
        page: String(pageParam ?? 1),
        limit: String(params.limit),
      });
      if (params.title && params.title.trim().length > 0) qp.append('title', params.title.trim());
      if (params.categoryId) qp.append('categoryId', params.categoryId);
      const headers = getTenantHeaders()
      if (!headers['x-tenant-slug']) {
        throw new Error('No tenant slug available')
      }
      const res = await fetch(`${baseUrl}/products/public?${qp}`, {
        headers
      });
      const data = await res.json();
      return data as ProductsResponse;
    },
    getNextPageParam: (lastPage) => {
      const pag = lastPage?.data?.pagination;
      if (!pag) return undefined;
      if (typeof pag.hasNextPage === "boolean") {
        return pag.hasNextPage ? (pag.page || 1) + 1 : undefined;
      }
      const totalPages = typeof pag.totalPages === "number"
        ? pag.totalPages
        : Math.ceil((pag.total || 0) / (pag.limit || 1));
      return pag.page < totalPages ? (pag.page || 1) + 1 : undefined;
    },
  });
}
