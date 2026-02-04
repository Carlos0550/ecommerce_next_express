import { useQuery } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
export const useGetOrders = (page: number = 1, limit: number = 10) => {
  return useQuery({
    queryKey: ["orders", page, limit],
    queryFn: async () => {
      return await authService.getOrders({ page, limit });
    },
  });
};
