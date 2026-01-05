import { useAppContext } from "@/providers/AppContext"
import { useQuery } from "@tanstack/react-query"
import { ProductCategory } from "./useProducts"

export interface CategoriesResponse {
    data: ProductCategory[];
}

export interface Categories {
    id: string,
    title: string,
    image?: string
    
}

export const useCategories = (initialData?: CategoriesResponse) => {
    
    const {
        utils: {
            baseUrl,
            getTenantHeaders,
            tenantSlug
        }
    } = useAppContext()
    return useQuery<CategoriesResponse>({
        queryKey: ['categories'],
        enabled: !!tenantSlug, 
        initialData,
        queryFn: async (): Promise<CategoriesResponse> => {
            const headers = getTenantHeaders()
            if (!headers['x-tenant-slug']) {
                throw new Error('No tenant slug available')
            }
            const res = await fetch(`${baseUrl}/products/public/categories`, {
                headers
            })
            const data = await res.json();
            return data as CategoriesResponse;
        }
    })
}