import { useAppContext } from "@/providers/AppContext";
import { useQuery } from "@tanstack/react-query";

export type BankData = {
    id: string;
    bank_name: string;
    account_number: string;
    account_holder: string;
    businessId: string;
};

export type BusinessData = {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;

    bankData: BankData[];
};

export default function useBankInfo() {
    const {
        utils: {
            baseUrl,
            getTenantHeaders,
            tenantSlug
        }
    } = useAppContext();

    return useQuery<BusinessData | null>({
        queryKey: ['business-info'],
        enabled: !!tenantSlug,
        queryFn: async () => {
            const headers = getTenantHeaders();
            if (!headers['x-tenant-slug']) {
                throw new Error('No tenant slug available');
            }
            const res = await fetch(`${baseUrl}/business/public`, { headers });
            if (!res.ok) {
                if (res.status === 404) return null;
                throw new Error("Error fetching business info");
            }
            const data = await res.json();
            return data as BusinessData;
        },
        staleTime: 1000 * 60 * 60, 
        retry: 1
    });
}
