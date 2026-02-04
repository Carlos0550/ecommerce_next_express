import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminStore } from "@/stores/useAdminStore";
export const useGetUsers = (
  page?: number,
  limit?: number,
  search?: string,
  filterType?: string,
) => {
  const fetchUsers = useAdminStore((state) => state.fetchUsers);
  return useQuery({
    queryKey: ["admin-users", page, limit, search, filterType],
    queryFn: async () => {
      await fetchUsers({ page, limit, search, type: filterType });
      return {
        users: useAdminStore.getState().users,
        pagination: {
          total: useAdminStore.getState().users.length, 
          totalPages: 1,
          page: page || 1,
          limit: limit || 10,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    },
  });
};
export const useCreateUser = () => {
  const createUser = useAdminStore((state) => state.createUser);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
};
export const useDeleteUser = () => {
  const deleteUser = useAdminStore((state) => state.deleteUser);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, type }: { id: string; type?: string }) =>
      deleteUser(id, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
};
export const useDisableUser = () => {
  const toggleUserStatus = useAdminStore((state) => state.toggleUserStatus);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, type }: { id: string; type?: string }) =>
      toggleUserStatus(id, false, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
};
export const useEnableUser = () => {
  const toggleUserStatus = useAdminStore((state) => state.toggleUserStatus);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, type }: { id: string; type?: string }) =>
      toggleUserStatus(id, true, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
};
