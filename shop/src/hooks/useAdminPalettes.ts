import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminStore } from "@/stores/useAdminStore";
export const useListPalettes = () => {
  const fetchPalettes = useAdminStore((state) => state.fetchPalettes);
  return useQuery({
    queryKey: ["admin-palettes"],
    queryFn: async () => {
      await fetchPalettes();
      return useAdminStore.getState().palettes;
    },
  });
};
export const useCreatePalette = () => {
  const createPalette = useAdminStore((state) => state.createPalette);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPalette,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-palettes"] });
    },
  });
};
export const useUpdatePalette = () => {
  const updatePalette = useAdminStore((state) => state.updatePalette);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      palette,
    }: {
      id: string;
      palette: Partial<{ name: string; colors: string[] }>;
    }) => updatePalette(id, palette),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-palettes"] });
    },
  });
};
export const useDeletePalette = () => {
  const deletePalette = useAdminStore((state) => state.deletePalette);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePalette,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-palettes"] });
    },
  });
};
export const useActivatePalette = () => {
  const activatePalette = useAdminStore((state) => state.activatePalette);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      activatePalette(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-palettes"] });
    },
  });
};
export const useSetUsage = () => {
  const applyPalette = useAdminStore((state) => state.applyPalette);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      paletteId,
      target,
    }: {
      paletteId: string;
      target: "admin" | "shop";
    }) => applyPalette(paletteId, target),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-palettes"] });
    },
  });
};
export const useGeneratePalette = () => {
  const generatePalette = useAdminStore((state) => state.generatePalette);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generatePalette,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-palettes"] });
    },
  });
};
export const useRandomPalette = () => {
  const randomPalette = useAdminStore((state) => state.randomPalette);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: randomPalette,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-palettes"] });
    },
  });
};
