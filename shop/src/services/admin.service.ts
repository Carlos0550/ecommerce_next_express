import { api } from "@/config/api";
export const adminService = {
  getProducts: async (params?: any) => {
    const { data } = await api.get("/products", { params });
    return data;
  },
  createProduct: async (formData: FormData) => {
    const { data } = await api.post("/products/save-product", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  updateProduct: async (id: string, formData: FormData) => {
    const { data } = await api.put(`/products/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  deleteProduct: async (id: string) => {
    const { data } = await api.delete(`/products/${id}`);
    return data;
  },
  updateProductStatus: async (id: string, state: boolean) => {
    const { data } = await api.patch(`/products/status/${id}/${state}`);
    return data;
  },
  updateProductStock: async (id: string, quantity: number) => {
    const { data } = await api.patch(`/products/stock/${id}/${quantity}`);
    return data;
  },
  enhanceProduct: async (payload: any) => {
    const { data } = await api.post("/products/enhance", payload);
    return data;
  },
  getCategories: async () => {
    const { data } = await api.get("/products/categories");
    return data;
  },
  createCategory: async (formData: FormData) => {
    const { data } = await api.post("/products/categories", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  updateCategory: async (id: string, formData: FormData) => {
    const { data } = await api.put(`/products/categories/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  changeCategoryStatus: async (id: string, status: any) => {
    const { data } = await api.patch(
      `/products/categories/status/${id}/${status}`,
    );
    return data;
  },
  deleteCategory: async (id: string) => {
    const { data } = await api.delete(`/products/categories/${id}`);
    return data;
  },
  getBusiness: async () => {
    const { data } = await api.get("/business");
    return data;
  },
  updateBusiness: async (id: string, payload: Record<string, unknown>) => {
    const { data } = await api.put(`/business/${id}`, payload);
    return data;
  },
  uploadBusinessImage: async (formData: FormData) => {
    const { data } = await api.post("/business/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  getPalettes: async () => {
    const { data } = await api.get("/palettes");
    return data;
  },
  createPalette: async (palette: Record<string, unknown>) => {
    const { data } = await api.post("/palettes", palette);
    return data;
  },
  updatePalette: async (id: string, palette: Record<string, unknown>) => {
    const { data } = await api.put(`/palettes/${id}`, palette);
    return data;
  },
  deletePalette: async (id: string) => {
    const { data } = await api.delete(`/palettes/${id}`);
    return data;
  },
  usePalette: async (id: string, target: "admin" | "shop") => {
    const { data } = await api.patch("/palettes/use", { id, target });
    return data;
  },
  activatePalette: async (id: string, active: boolean) => {
    const { data } = await api.patch(`/palettes/activate/${id}`, {
      active,
    });
    return data;
  },
  generatePalette: async (prompt: string) => {
    const { data } = await api.post("/palettes/generate", { prompt });
    return data;
  },
  randomPalette: async (name: string) => {
    const { data } = await api.post("/palettes/random", { name });
    return data;
  },
  getSales: async (params?: any) => {
    const { data } = await api.get("/sales", { params });
    return data;
  },
  saveSale: async (payload: any) => {
    const { data } = await api.post("/sales/save", payload);
    return data;
  },
  updateSale: async (id: string, payload: any) => {
    const { data } = await api.put(`/sales/${id}`, payload);
    return data;
  },
  processSale: async (id: string) => {
    const { data } = await api.patch(`/sales/${id}/process`);
    return data;
  },
  declineSale: async (id: string, reason: string) => {
    const { data } = await api.patch(`/sales/${id}/decline`, { reason });
    return data;
  },
  deleteSale: async (id: string) => {
    const { data } = await api.delete(`/sales/${id}`);
    return data;
  },
  getSalesAnalytics: async (params?: any) => {
    const { data } = await api.get("/sales/analytics", { params });
    return data;
  },
  getSaleReceipt: async (id: string) => {
    const { data } = await api.get(`/sales/${id}/receipt`);
    return data;
  },
  getFaqs: async () => {
    const { data } = await api.get("/faq");
    return data;
  },
  createFaq: async (payload: any) => {
    const { data } = await api.post("/faq", payload);
    return data;
  },
  updateFaq: async (id: string, payload: any) => {
    const { data } = await api.put(`/faq/${id}`, payload);
    return data;
  },
  deleteFaq: async (id: string) => {
    const { data } = await api.delete(`/faq/${id}`);
    return data;
  },
  getWhatsAppConfig: async () => {
    const { data } = await api.get("/whatsapp/config");
    return data;
  },
  updateWhatsAppConfig: async (payload: any) => {
    const { data } = await api.put("/whatsapp/config", payload);
    return data;
  },
  createWhatsAppSession: async (payload: any) => {
    const { data } = await api.post("/whatsapp/session", payload);
    return data;
  },
  getWhatsAppQR: async () => {
    const { data } = await api.get("/whatsapp/session/qrcode");
    return data;
  },
  getWhatsAppStatus: async () => {
    const { data } = await api.get("/whatsapp/session/status");
    return data;
  },
  disconnectWhatsApp: async () => {
    const { data } = await api.delete("/whatsapp/session/disconnect");
    return data;
  },
  sendWhatsAppTest: async (payload: any) => {
    const { data } = await api.post("/whatsapp/test", payload);
    return data;
  },
  getUsers: async (params?: any) => {
    const { data } = await api.get("/auth/users", { params });
    return data;
  },
  createUser: async (payload: any) => {
    const { data } = await api.post("/auth/register", payload);
    return data;
  },
  deleteUser: async (id: string, type?: string) => {
    const { data } = await api.delete(`/auth/users/${id}`, {
      params: { type },
    });
    return data;
  },
  toggleUserStatus: async (id: string, status: boolean, type?: string) => {
    const action = status ? "enable" : "disable";
    const { data } = await api.put(
      `/auth/users/${id}/${action}`,
      {},
      { params: { type } },
    );
    return data;
  },
};
