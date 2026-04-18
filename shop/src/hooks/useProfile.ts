import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/useAuthStore";
export const useGetProfile = () => {
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const session = useAuthStore((state) => state.session);
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      await fetchProfile();
      return useAuthStore.getState().session;
    },
    enabled: Boolean(session),
    staleTime: 0,
  });
};
export const useUpdateProfile = () => {
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};
export const useUploadAvatar = () => {
  const uploadAvatar = useAuthStore((state) => state.uploadAvatar);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};
export const useChangePassword = () => {
  const changePassword = useAuthStore((state) => state.changePassword);
  return useMutation({
    mutationFn: changePassword,
  });
};
