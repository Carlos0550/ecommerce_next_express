import { api } from "@/config/api";
export const configService = {
  getPublicBusinessInfo: async () => {
    try {
      const { data } = await api.get("/business/public");
      return data;
    } catch (error) {
      console.warn("No se pudo cargar la info pública del negocio", error);
      return null;
    }
  },
  getPublicProducts: async (params?: Record<string, unknown>) => {
    const { data } = await api.get("/products/public", { params });
    return data;
  },
  getPublicCategories: async () => {
    const { data } = await api.get("/products/public/categories");
    return data;
  },
  getBankInfo: async () => {
    const { data } = await api.get("/business/public/bank-info");
    return data;
  },
  getProductById: async (id: string) => {
    const { data } = await api.get(`/products/public/${id}`);
    return data;
  },
  getThemePalette: async (target: string = "light") => {
    const { data } = await api.get(`/theme/palette/${target}`);
    return data;
  },
};
