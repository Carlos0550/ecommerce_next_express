import { api } from "@/config/api";

export interface UserSession {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  role: number;
  profileImage?: string;
  profile_image?: string;
  subjectType: "admin" | "user";
  phone?: string;
  shipping_street?: string;
  shipping_postal_code?: string;
  shipping_city?: string;
  shipping_province?: string;
}

export const authService = {
  loginUser: async (email: string, password: string) => {
    const { data } = await api.post("/shop/login", { email, password });
    return data as { token: string };
  },
  resetPassword: async (email: string) => {
    const { data } = await api.post("/shop/password/reset", { email });
    return data;
  },
  loginAdmin: async (email: string, password: string) => {
    const { data } = await api.post("/admin/login", { email, password });
    return data as { token: string };
  },
  resetAdminPassword: async (email: string) => {
    const { data } = await api.post("/admin/password/reset", { email });
    return data;
  },
  changeAdminPassword: async (payload: {
    old_password: string;
    new_password: string;
  }) => {
    const { data } = await api.post("/admin/password/change", payload);
    return data;
  },
  registerUser: async (name: string, email: string) => {
    const { data } = await api.post("/shop/register", {
      name,
      email,
      asAdmin: false,
    });
    return data as { token: string };
  },
  registerAdmin: async (name: string, email: string) => {
    const { data } = await api.post("/shop/register", {
      name,
      email,
      asAdmin: true,
    });
    return data as { token: string };
  },
  validateToken: async () => {
    const { data } = await api.get<UserSession>("/auth/validate");
    return data;
  },
  getProfile: async () => {
    const { data } = await api.get<UserSession>("/auth/profile");
    return data;
  },
  updateProfile: async (payload: { name?: string; email?: string }) => {
    const { data } = await api.put<UserSession>("/auth/profile", payload);
    return data;
  },
  uploadAvatar: async (formData: FormData) => {
    const { data } = await api.post<UserSession>("/auth/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  changePassword: async (payload: {
    old_password?: string;
    new_password?: string;
  }) => {
    const { data } = await api.post("/auth/change-password", payload);
    return data;
  },
  getOrders: async (params?: { page?: number; limit?: number }) => {
    const { data } = await api.get("/orders", { params });
    return data;
  },
};
