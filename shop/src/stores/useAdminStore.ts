import { create } from "zustand";
import { adminService } from "@/services/admin.service";
import { queryClient } from "@/config/queryClient";
import { showNotification } from "@mantine/notifications";
export interface AdminProduct {
  id: string;
  title: string;
  price: number;
  is_active: boolean;
  created_at: string;
  images: string[];
  categoryId: string | null;
  tags: string[] | null;
  description: string;
  state: "active" | "inactive" | "draft" | "out_stock" | "deleted";
  stock: number;
  options: { name: string; values: string[] }[];
  category?: { id: string; title: string };
}
export interface AdminCategory {
  id: string;
  title: string;
  image: string | null;
  created_at: string;
  is_active: boolean;
  status: "active" | "inactive" | "deleted";
  products?: AdminProduct[];
}
export interface AdminSale {
  id: string;
  payment_method: string;
  source: string;
  created_at: string;
  userId: number | null;
  total: number;
  tax: number;
  loadedManually: boolean;
  manualProducts: { title: string; price: number; quantity: number }[];
  paymentMethods: { method: string; amount: number }[];
  processed: boolean;
  declined: boolean;
  decline_reason: string | null;
  items: {
    product_id: string;
    quantity: number;
    price: number;
    title: string;
  }[];
  user?: { name: string; email: string };
}
export interface AdminBusiness {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  description: string | null;
  business_image: string | null;
  favicon: string | null;
  hero_image: string | null;
  type: string | null;
  whatsapp_connected: boolean;
  whatsapp_enabled: boolean;
  whatsapp_phone_number: string | null;
  bankData: {
    bank_name: string;
    account_number: string;
    account_holder: string;
  }[];
}
interface AdminState {
  products: AdminProduct[];
  categories: AdminCategory[];
  sales: AdminSale[];
  isLoading: boolean;
  business: AdminBusiness | null;
  fetchProducts: (params?: any) => Promise<any>;
  fetchCategories: () => Promise<void>;
  fetchBusiness: () => Promise<void>;
  fetchSales: (params?: any) => Promise<any>;
  createProduct: (formData: FormData) => Promise<void>;
  updateProduct: (id: string, formData: FormData) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  updateProductStock: (id: string, quantity: number) => Promise<void>;
  enhanceProduct: (payload: any) => Promise<any>;
  createCategory: (formData: FormData) => Promise<void>;
  updateCategory: (id: string, formData: FormData) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  changeCategoryStatus: (id: string, status: string) => Promise<void>;
  saveSale: (payload: any) => Promise<void>;
  updateSale: (id: string, payload: any) => Promise<void>;
  processSale: (id: string) => Promise<void>;
  declineSale: (id: string, reason: string) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  fetchSalesAnalytics: (params?: any) => Promise<any>;
  fetchSaleReceipt: (id: string) => Promise<string>;
  fetchFaqs: () => Promise<void>;
  createFaq: (payload: any) => Promise<void>;
  updateFaq: (id: string, payload: any) => Promise<void>;
  deleteFaq: (id: string) => Promise<void>;
  fetchWhatsAppConfig: () => Promise<any>;
  updateWhatsAppConfig: (payload: any) => Promise<void>;
  createWhatsAppSession: (payload: {
    name: string;
    phone_number: string;
  }) => Promise<any>;
  fetchWhatsAppQR: () => Promise<any>;
  fetchWhatsAppStatus: () => Promise<any>;
  disconnectWhatsApp: () => Promise<void>;
  sendWhatsAppTest: (payload: any) => Promise<void>;
  fetchUsers: (params?: any) => Promise<void>;
  createUser: (payload: any) => Promise<void>;
  deleteUser: (id: string, type?: string) => Promise<void>;
  toggleUserStatus: (
    id: string,
    status: boolean,
    type?: string,
  ) => Promise<void>;
  updateBusiness: (id: string, payload: any) => Promise<void>;
  palettes: any[];
  fetchPalettes: () => Promise<void>;
  createPalette: (payload: { name: string; colors: string[] }) => Promise<void>;
  updatePalette: (id: string, payload: any) => Promise<void>;
  deletePalette: (id: string) => Promise<void>;
  activatePalette: (id: string, active: boolean) => Promise<void>;
  usePalette: (paletteId: string, target: "admin" | "shop") => Promise<void>;
  generatePalette: (prompt: string) => Promise<void>;
  randomPalette: (name: string) => Promise<void>;
  users: any[];
  faqs: any[];
  analytics: any | null;
  whatsappStatus: any | null;
  productsPagination: any | null;
}
export const useAdminStore = create<AdminState>((set, get) => ({
  products: [],
  categories: [],
  sales: [],
  isLoading: false,
  business: null,
  users: [],
  faqs: [],
  analytics: null,
  whatsappStatus: null,
  productsPagination: null,
  palettes: [],
  fetchProducts: async (params) => {
    set({ isLoading: true });
    try {
      const data = await adminService.getProducts(params);
      console.log("data", data);
      set({
        products: data.data.products || data,
        productsPagination: data.data.pagination || null,
        isLoading: false,
      });
      return data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  fetchCategories: async () => {
    set({ isLoading: true });
    try {
      const data = await adminService.getCategories();
      set({ categories: data?.categories || data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  fetchSales: async (params) => {
    set({ isLoading: true });
    try {
      const data = await adminService.getSales(params);
      console.log("Sales data raw", data);
      set({ sales: data.sales || data, isLoading: false });
      return data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  saveSale: async (payload) => {
    try {
      await adminService.saveSale(payload);
      showNotification({ message: "Venta guardada", color: "green" });
    } catch (error) {
      showNotification({ message: "Error al guardar venta", color: "red" });
      throw error;
    }
  },
  updateSale: async (id, payload) => {
    try {
      await adminService.updateSale(id, payload);
      showNotification({ message: "Venta actualizada", color: "green" });
    } catch (error) {
      showNotification({ message: "Error al actualizar venta", color: "red" });
      throw error;
    }
  },
  processSale: async (id) => {
    try {
      await adminService.processSale(id);
      showNotification({ message: "Venta procesada", color: "green" });
    } catch (error) {
      showNotification({ message: "Error al procesar venta", color: "red" });
      throw error;
    }
  },
  declineSale: async (id, reason) => {
    try {
      await adminService.declineSale(id, reason);
      showNotification({ message: "Venta declinada", color: "green" });
    } catch (error) {
      showNotification({ message: "Error al declinar venta", color: "red" });
      throw error;
    }
  },
  deleteSale: async (id) => {
    try {
      await adminService.deleteSale(id);
      showNotification({ message: "Venta eliminada", color: "green" });
    } catch (error) {
      showNotification({ message: "Error al eliminar venta", color: "red" });
      throw error;
    }
  },
  fetchSalesAnalytics: async (params) => {
    try {
      const data = await adminService.getSalesAnalytics(params);
      const analyticsData = data?.analytics || data;
      set({ analytics: analyticsData });
      return analyticsData || null;
    } catch (error) {
      console.error(error);
      return null;
    }
  },
  fetchSaleReceipt: async (id: string) => {
    try {
      const data = await adminService.getSaleReceipt(id);
      return data;
    } catch (error) {
      throw error;
    }
  },
  fetchFaqs: async () => {
    try {
      const data = await adminService.getFaqs();
      set({ faqs: data?.items || data?.faqs || data });
    } catch (error) {
      console.error(error);
    }
  },
  createFaq: async (payload) => {
    try {
      await adminService.createFaq(payload);
      get().fetchFaqs();
      showNotification({ message: "FAQ creada", color: "green" });
    } catch (error) {
      throw error;
    }
  },
  updateFaq: async (id, payload) => {
    try {
      await adminService.updateFaq(id, payload);
      get().fetchFaqs();
      showNotification({ message: "FAQ actualizada", color: "green" });
    } catch (error) {
      throw error;
    }
  },
  deleteFaq: async (id) => {
    try {
      await adminService.deleteFaq(id);
      get().fetchFaqs();
      showNotification({ message: "FAQ eliminada", color: "green" });
    } catch (error) {
      throw error;
    }
  },
  fetchWhatsAppConfig: async () => {
    try {
      const data = await adminService.getWhatsAppConfig();
      return data;
    } catch (error) {
      console.error(error);
    }
  },
  updateWhatsAppConfig: async (payload) => {
    try {
      await adminService.updateWhatsAppConfig(payload);
      showNotification({
        message: "Configuración de WhatsApp actualizada",
        color: "green",
      });
    } catch (error) {
      throw error;
    }
  },
  createWhatsAppSession: async (payload) => {
    try {
      return await adminService.createWhatsAppSession(payload);
    } catch (error) {
      throw error;
    }
  },
  fetchWhatsAppQR: async () => {
    try {
      return await adminService.getWhatsAppQR();
    } catch (error) {
      throw error;
    }
  },
  fetchWhatsAppStatus: async () => {
    try {
      const data = await adminService.getWhatsAppStatus();
      set({ whatsappStatus: data });
      return data;
    } catch (error) {
      console.error(error);
    }
  },
  disconnectWhatsApp: async () => {
    try {
      await adminService.disconnectWhatsApp();
      set({ whatsappStatus: null });
      showNotification({ message: "WhatsApp desconectado", color: "green" });
    } catch (error) {
      throw error;
    }
  },
  sendWhatsAppTest: async (payload) => {
    try {
      await adminService.sendWhatsAppTest(payload);
      showNotification({
        message: "Mensaje de prueba enviado",
        color: "green",
      });
    } catch (error) {
      throw error;
    }
  },
  fetchUsers: async (params) => {
    try {
      const data = await adminService.getUsers(params);
      console.log("user raw data: ", data);
      set({ users: data?.users || data });
    } catch (error) {
      console.error(error);
    }
  },
  createUser: async (payload) => {
    try {
      await adminService.createUser(payload);
      get().fetchUsers();
      showNotification({ message: "Usuario creado", color: "green" });
    } catch (error) {
      throw error;
    }
  },
  deleteUser: async (id, type) => {
    try {
      await adminService.deleteUser(id, type);
      get().fetchUsers();
      showNotification({ message: "Usuario eliminado", color: "green" });
    } catch (error) {
      throw error;
    }
  },
  toggleUserStatus: async (id, status, type) => {
    try {
      await adminService.toggleUserStatus(id, status, type);
      get().fetchUsers();
      showNotification({
        message: "Estado de usuario actualizado",
        color: "green",
      });
    } catch (error) {
      throw error;
    }
  },
  updateBusiness: async (id, payload) => {
    try {
      await adminService.updateBusiness(id, payload);
      await get().fetchBusiness();
      showNotification({ message: "Información actualizada", color: "green" });
    } catch (error) {
      showNotification({
        message: "Error al actualizar información",
        color: "red",
      });
      throw error;
    }
  },
  fetchBusiness: async () => {
    set({ isLoading: true });
    try {
      const data = await adminService.getBusiness();
      set({ business: data, isLoading: false });
    } catch (error) {
      console.error("Failed to fetch business", error);
      set({ isLoading: false });
    }
  },
  createProduct: async (formData) => {
    set({ isLoading: true });
    try {
      await adminService.createProduct(formData);
      await get().fetchProducts(); 
      showNotification({
        title: "Éxito",
        message: "Producto creado correctamente",
        color: "green",
      });
    } catch (error) {
      console.error("Failed to create product", error);
      showNotification({
        title: "Error",
        message: "Error al crear producto",
        color: "red",
      });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  updateProduct: async (id, formData) => {
    set({ isLoading: true });
    try {
      await adminService.updateProduct(id, formData);
      await get().fetchProducts();
      showNotification({
        title: "Éxito",
        message: "Producto actualizado correctamente",
        color: "green",
      });
    } catch (error) {
      console.error("Failed to update product", error);
      showNotification({
        title: "Error",
        message: "Error al actualizar producto",
        color: "red",
      });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  deleteProduct: async (id) => {
    set({ isLoading: true });
    try {
      await adminService.deleteProduct(id);
      await get().fetchProducts();
      showNotification({
        title: "Éxito",
        message: "Producto eliminado correctamente",
        color: "green",
      });
    } catch (error) {
      console.error("Failed to delete product", error);
      showNotification({
        title: "Error",
        message: "Error al eliminar producto",
        color: "red",
      });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  updateProductStock: async (id, quantity) => {
    try {
      await adminService.updateProductStock(id, quantity);
      await get().fetchProducts();
      showNotification({ message: "Stock actualizado", color: "green" });
    } catch (error) {
      showNotification({ message: "Error al actualizar stock", color: "red" });
      throw error;
    }
  },
  enhanceProduct: async (payload) => {
    try {
      return await adminService.enhanceProduct(payload);
    } catch (error) {
      console.error("Failed to enhance product", error);
      throw error;
    }
  },
  createCategory: async (formData) => {
    set({ isLoading: true });
    try {
      await adminService.createCategory(formData);
      await get().fetchCategories();
      showNotification({
        title: "Éxito",
        message: "Categoría creada correctamente",
        color: "green",
      });
    } catch (error) {
      console.error("Failed to create category", error);
      showNotification({
        title: "Error",
        message: "Error al crear categoría",
        color: "red",
      });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  updateCategory: async (id, formData) => {
    set({ isLoading: true });
    try {
      await adminService.updateCategory(id, formData);
      await get().fetchCategories();
      showNotification({
        title: "Éxito",
        message: "Categoría actualizada correctamente",
        color: "green",
      });
    } catch (error) {
      console.error("Failed to update category", error);
      showNotification({
        title: "Error",
        message: "Error al actualizar categoría",
        color: "red",
      });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  deleteCategory: async (id) => {
    set({ isLoading: true });
    try {
      await adminService.deleteCategory(id);
      await get().fetchCategories();
      showNotification({
        title: "Éxito",
        message: "Categoría eliminada correctamente",
        color: "green",
      });
    } catch (error) {
      console.error("Failed to delete category", error);
      showNotification({
        title: "Error",
        message: "Error al eliminar categoría",
        color: "red",
      });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  changeCategoryStatus: async (id, status) => {
    try {
      await adminService.changeCategoryStatus(id, status);
      await get().fetchCategories();
      showNotification({
        message: "Estado de categoría actualizado",
        color: "green",
      });
    } catch (error) {
      showNotification({
        message: "Error al actualizar estado",
        color: "red",
      });
      throw error;
    }
  },
  fetchPalettes: async () => {
    try {
      const data = await adminService.getPalettes();
      set({ palettes: data?.palettes || data });
    } catch (error) {
      console.error(error);
    }
  },
  createPalette: async (payload) => {
    try {
      await adminService.createPalette(payload);
      get().fetchPalettes();
      showNotification({ message: "Paleta creada", color: "green" });
    } catch (error) {
      throw error;
    }
  },
  updatePalette: async (id, payload) => {
    try {
      await adminService.updatePalette(id, payload);
      get().fetchPalettes();
      showNotification({ message: "Paleta actualizada", color: "green" });
    } catch (error) {
      throw error;
    }
  },
  deletePalette: async (id) => {
    try {
      await adminService.deletePalette(id);
      get().fetchPalettes();
      showNotification({ message: "Paleta eliminada", color: "green" });
    } catch (error) {
      throw error;
    }
  },
  activatePalette: async (id, active) => {
    try {
      await adminService.activatePalette(id, active);
      get().fetchPalettes();
      showNotification({ message: "Paleta activada", color: "green" });
    } catch (error) {
      throw error;
    }
  },
  usePalette: async (paletteId, target) => {
    try {
      await adminService.usePalette(paletteId, target);
      get().fetchPalettes();
      showNotification({
        message: `Paleta aplicada a ${target}`,
        color: "green",
      });
    } catch (error) {
      throw error;
    }
  },
  generatePalette: async (prompt) => {
    try {
      await adminService.generatePalette(prompt);
      get().fetchPalettes();
    } catch (error) {
      throw error;
    }
  },
  randomPalette: async (name) => {
    try {
      await adminService.randomPalette(name);
      get().fetchPalettes();
    } catch (error) {
      throw error;
    }
  },
}));
