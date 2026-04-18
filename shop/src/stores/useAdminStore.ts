import { create } from "zustand";
import { adminService } from "@/services/admin.service";
import { showNotification } from "@mantine/notifications";
export type ProductState =
  | "active"
  | "inactive"
  | "draft"
  | "out_stock"
  | "deleted";
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
  state: ProductState;
  stock: number;
  options: { name: string; values: string[] }[];
  category?: { id: string; title: string };
}
export interface GetProductsParams {
  page?: number;
  limit?: number;
  title?: string;
  state?: ProductState;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  isActive?: boolean;
  categoryId?: string;
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
export interface GetSalesParams {
  page?: number;
  limit?: number;
  start_date?: string;
  end_date?: string;
  pendingOnly?: boolean;
}
export interface AdminSaleAnalyticsParams {
  start_date: string;
  end_date: string;
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

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role_id: string;
  is_active: boolean;
  created_at: string;
  phone?: string;
}

export interface AdminFaq {
  id: string;
  question: string;
  answer: string;
  category?: string;
  created_at: string;
  position?: number;
  is_active?: boolean;
}

export interface AdminAnalytics {
  totals: {
    revenue_total: number;
    sales_count: number;
    products_sold: number;
    avg_order_value?: number;
    total_units_sold?: number;
    total_tax_collected?: number;
    best_day?: { date: string; revenue: number };
    worst_day?: { date: string; revenue: number };
  };
  timeseries: {
    by_day: { date: string; revenue: number; count: number; sales?: number }[];
  };
  breakdowns?: {
    payment_methods?: { method: string; count: number }[];
    sources?: { source: string; count: number }[];
    by_category?: { name: string; revenue: number }[];
    by_hour?: { hour: number; count: number; revenue: number }[];
  };
  growth?: {
    count_percent?: number;
    revenue_percent?: number;
    units_percent?: number;
  };
  top_products?: { title: string; quantity_sold: number; revenue: number }[];
  range?: { start_date: string; end_date: string; days: number };
  previous?: { sales_count: number; revenue_total: number };
}

export interface WhatsAppStatus {
  status: "connected" | "disconnected" | "connecting";
  phone_number?: string;
}

export interface WhatsAppConfig {
  whatsapp_enabled: boolean;
  whatsapp_connected: boolean;
  whatsapp_phone_number: string | null;
  whatsapp_allowed_remitents?: string;
  has_access_token?: boolean;
}

export interface ProductsPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
export interface AdminSalesResponse {
  sales: AdminSale[];
  pagination: ProductsPagination;
  totalSalesByDate?: number;
}
interface AdminState {
  products: AdminProduct[];
  categories: AdminCategory[];
  sales: AdminSale[];
  isLoading: boolean;
  business: AdminBusiness | null;
  fetchProducts: (params?: GetProductsParams) => Promise<unknown>;
  fetchCategories: () => Promise<void>;
  fetchBusiness: () => Promise<void>;
  fetchSales: (params?: GetSalesParams) => Promise<AdminSalesResponse>;
  createProduct: (formData: FormData) => Promise<void>;
  updateProduct: (id: string, formData: FormData) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  updateProductStock: (id: string, quantity: number) => Promise<void>;
  enhanceProduct: (payload: {
    productId?: string;
    title?: string;
    description?: string;
    additionalContext?: string;
    imageUrls?: string[];
  }) => Promise<{ proposal: { title: string; description: string } }>;
  createCategory: (formData: FormData) => Promise<void>;
  updateCategory: (id: string, formData: FormData) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  changeCategoryStatus: (id: string, status: string) => Promise<void>;
  saveSale: (payload: Record<string, unknown>) => Promise<void>;
  updateSale: (id: string, payload: Record<string, unknown>) => Promise<void>;
  processSale: (id: string) => Promise<void>;
  declineSale: (id: string, reason: string) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  fetchSalesAnalytics: (params?: {
    start_date: string;
    end_date: string;
  }) => Promise<AdminAnalytics | null>;
  fetchSaleReceipt: (id: string) => Promise<{ url?: string } | string>;
  fetchFaqs: () => Promise<void>;
  createFaq: (payload: {
    question: string;
    answer: string;
    category?: string;
  }) => Promise<void>;
  updateFaq: (
    id: string,
    payload: { question: string; answer: string; category?: string },
  ) => Promise<void>;
  deleteFaq: (id: string) => Promise<void>;
  fetchWhatsAppConfig: () => Promise<WhatsAppConfig | undefined>;
  updateWhatsAppConfig: (payload: Partial<WhatsAppConfig>) => Promise<void>;
  createWhatsAppSession: (payload: {
    name: string;
    phone_number: string;
  }) => Promise<unknown>;
  fetchWhatsAppQR: () => Promise<{ qr_code: string }>;
  fetchWhatsAppStatus: () => Promise<WhatsAppStatus | undefined>;
  disconnectWhatsApp: () => Promise<void>;
  sendWhatsAppTest: (payload: { to: string; message: string }) => Promise<void>;
  fetchUsers: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
  }) => Promise<void>;
  createUser: (payload: {
    name: string;
    email: string;
    role_id: string;
    phone?: string;
  }) => Promise<void>;
  deleteUser: (id: string, type?: string) => Promise<void>;
  toggleUserStatus: (
    id: string,
    status: boolean,
    type?: string,
  ) => Promise<void>;
  updateBusiness: (
    id: string,
    payload: Record<string, unknown>,
  ) => Promise<void>;
  users: AdminUser[];
  faqs: AdminFaq[];
  analytics: AdminAnalytics | null;
  whatsappStatus: WhatsAppStatus | null;
  productsPagination: ProductsPagination | null;
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
  fetchProducts: async (params?: GetProductsParams) => {
    set({ isLoading: true });
    try {
      const data = await adminService.getProducts(params);
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
  fetchSales: async (params?: GetSalesParams) => {
    set({ isLoading: true });
    try {
      const data = (await adminService.getSales(params)) as AdminSalesResponse;
      console.log("Sales data raw", data);
      set({ sales: data.sales || data, isLoading: false });
      return data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  saveSale: async (payload: Record<string, unknown>) => {
    try {
      await adminService.saveSale(payload);
      showNotification({ message: "Venta guardada", color: "green" });
    } catch (error) {
      showNotification({ message: "Error al guardar venta", color: "red" });
      throw error;
    }
  },
  updateSale: async (id: string, payload: Record<string, unknown>) => {
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
  fetchSalesAnalytics: async (params?: AdminSaleAnalyticsParams) => {
    try {
      const data = await adminService.getSalesAnalytics(params);
      const analyticsData =
        (data as { analytics?: AdminAnalytics })?.analytics ||
        (data as AdminAnalytics);
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
  createFaq: async (payload: {
    question: string;
    answer: string;
    category?: string;
  }) => {
    try {
      await adminService.createFaq(payload);
      get().fetchFaqs();
      showNotification({ message: "FAQ creada", color: "green" });
    } catch (error) {
      throw error;
    }
  },
  updateFaq: async (
    id: string,
    payload: { question: string; answer: string; category?: string },
  ) => {
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
  updateWhatsAppConfig: async (payload: Partial<WhatsAppConfig>) => {
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
  createWhatsAppSession: async (payload: {
    name: string;
    phone_number: string;
  }) => {
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
  sendWhatsAppTest: async (payload: { to: string; message: string }) => {
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
  fetchUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
  }) => {
    try {
      const data = await adminService.getUsers(params);
      console.log("user raw data: ", data);
      set({ users: data?.users || data });
    } catch (error) {
      console.error(error);
    }
  },
  createUser: async (payload: {
    name: string;
    email: string;
    role_id: string;
    phone?: string;
  }) => {
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
  updateBusiness: async (id: string, payload: Record<string, unknown>) => {
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
}));
