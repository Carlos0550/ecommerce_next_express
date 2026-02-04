import { api } from "@/config/api";
export interface UserSession {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  role: number;
  profileImage?: string;
  subjectType: "admin" | "user";
}
export const authService = {
  loginUser: async (email: string, password: string) => {
    const { data } = await api.post("/shop/login", { email, password });
    return data;
  },
  resetPassword: async (email: string) => {
    const { data } = await api.post("/shop/password/reset", { email });
    return data;
  },
  loginAdmin: async (email: string, password: string) => {
    const { data } = await api.post("/admin/login", { email, password });
    return data;
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
    return data;
  },
  registerAdmin: async (name: string, email: string) => {
    const { data } = await api.post("/shop/register", {
      name,
      email,
      asAdmin: true,
    });
    return data;
  },
  validateToken: async () => {
    const { data } = await api.get<UserSession>("/auth/validate");
    return data;
  },
  getProfile: async () => {
    const { data } = await api.get("/auth/profile");
    return data;
  },
  updateProfile: async (payload: any) => {
    const { data } = await api.put("/auth/profile", payload);
    return data;
  },
  uploadAvatar: async (formData: FormData) => {
    const { data } = await api.post("/auth/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  changePassword: async (payload: any) => {
    const { data } = await api.post("/auth/change-password", payload);
    return data;
  },
  getOrders: async (params?: any) => {
    const { data } = await api.get("/orders", { params });
    return data;
  },
};
