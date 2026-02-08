import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { authService, UserSession } from "@/services/auth.service";
import { queryClient } from "@/config/queryClient";
import { resetLogoutFlag } from "@/config/api";
import { showNotification } from "@mantine/notifications";
interface AuthState {
  token: string | null;
  session: UserSession | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isUser: boolean;
  loading: boolean;
  setToken: (token: string | null) => void;
  validateSession: () => Promise<void>;
  loginUser: (email: string, password: string) => Promise<void>;
  loginAdmin: (email: string, password: string) => Promise<void>;
  registerUser: (name: string, email: string) => Promise<void>;
  registerAdmin: (name: string, email: string) => Promise<unknown>;
  logout: (options?: { expired?: boolean; redirect?: string }) => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (payload: { name?: string; email?: string }) => Promise<void>;
  uploadAvatar: (formData: FormData) => Promise<UserSession>;
  changePassword: (payload: {
    old_password?: string;
    new_password?: string;
  }) => Promise<void>;
  fetchOrders: (params?: { page?: number; limit?: number }) => Promise<unknown>;
}
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      session: null,
      isAuthenticated: false,
      isAdmin: false,
      isUser: false,
      loading: true,
      setToken: (token) => {
        if (typeof document !== "undefined") {
          const isSecure = window.location.protocol === "https:";
          if (token) {
            const encoded = encodeURIComponent(token);
            document.cookie = `auth_token=${encoded}; path=/; samesite=lax${isSecure ? "; secure" : ""}`;
          } else {
            document.cookie =
              "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
          }
        }
        set({ token });
        if (!token) {
          set({
            session: null,
            isAuthenticated: false,
            isAdmin: false,
            isUser: false,
            loading: false,
          });
        }
      },
      validateSession: async () => {
        const { token } = get();
        if (!token) {
          set({ loading: false });
          return;
        }
        try {
          set({ loading: true });
          const session = await authService.validateToken();
          if (!session.is_active) {
            throw new Error("Account inactive");
          }
          set({
            session,
            isAuthenticated: true,
            isAdmin: session.subjectType === "admin" || session.role === 1,
            isUser: session.subjectType === "user" || session.role === 2,
            loading: false,
          });
        } catch (error) {
          console.error("Session validation failed", error);
          if (typeof document !== "undefined") {
            document.cookie =
              "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
          }
          set({
            token: null,
            session: null,
            isAuthenticated: false,
            isAdmin: false,
            isUser: false,
            loading: false,
          });
        }
      },
      loginUser: async (email, password) => {
        set({ loading: true });
        try {
          const data = await authService.loginUser(email, password);
          console.log("raw token", data);
          get().setToken(data.token);
          resetLogoutFlag();
          await get().validateSession();
          showNotification({
            title: "Bienvenido",
            message: "Has in ciado sesión correctamente",
            color: "green",
          });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },
      loginAdmin: async (email, password) => {
        set({ loading: true });
        try {
          const data = await authService.loginAdmin(email, password);
          get().setToken(data.token);
          resetLogoutFlag();
          await get().validateSession();
          showNotification({
            title: "Bienvenido Admin",
            message: "Has iniciado sesión correctamente",
            color: "green",
          });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },
      registerUser: async (name, email) => {
        set({ loading: true });
        try {
          const data = await authService.registerUser(name, email);
          if (data.token) {
            get().setToken(data.token);
            await get().validateSession();
          }
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },
      registerAdmin: async (name, email) => {
        set({ loading: true });
        try {
          const data = await authService.registerAdmin(name, email);
          if (data.token) {
            get().setToken(data.token);
            await get().validateSession();
          }
          return data;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },
      logout: (options = {}) => {
        const { isAdmin } = get();

        if (typeof document !== "undefined") {
          document.cookie =
            "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
        }

        set({
          token: null,
          session: null,
          isAuthenticated: false,
          isAdmin: false,
          isUser: false,
          loading: false,
        });

        queryClient.removeQueries();

        if (options.expired) {
          showNotification({
            title: "Sesión expirada",
            message: "Por favor inicia sesión nuevamente",
            color: "red",
          });
        } else {
          showNotification({
            title: "Sesión cerrada",
            message: "Has cerrado sesión correctamente",
            color: "blue",
          });
        }

        if (typeof window !== "undefined") {
          const redirectTo = isAdmin ? "/admin/auth" : "/";
          window.location.href = redirectTo;
        }
      },
      fetchProfile: async () => {
        try {
          const data = await authService.getProfile();
          set({ session: data });
        } catch (error) {
          console.error("Failed to fetch profile", error);
        }
      },
      updateProfile: async (payload) => {
        set({ loading: true });
        try {
          const filteredPayload = Object.fromEntries(
            Object.entries(payload).filter(
              ([, value]) =>
                value !== "" && value !== null && value !== undefined,
            ),
          );
          const data = await authService.updateProfile(filteredPayload);
          set({ session: data, loading: false });
          showNotification({
            message: "Perfil actualizado correctamente",
            color: "green",
          });
        } catch (error) {
          set({ loading: false });
          showNotification({
            message: "Error al actualizar perfil",
            color: "red",
          });
          throw error;
        }
      },
      uploadAvatar: async (formData) => {
        set({ loading: true });
        try {
          const data = await authService.uploadAvatar(formData);
          set({ session: data, loading: false });
          showNotification({
            message: "Imagen actualizada correctamente",
            color: "green",
          });
          return data;
        } catch (error) {
          set({ loading: false });
          showNotification({
            message: "Error al subir imagen",
            color: "red",
          });
          throw error;
        }
      },
      changePassword: async (payload) => {
        set({ loading: true });
        try {
          await authService.changePassword(payload);
          set({ loading: false });
          showNotification({
            message: "Contraseña actualizada correctamente",
            color: "green",
          });
        } catch (error) {
          set({ loading: false });
          showNotification({
            message: "Error al cambiar contraseña",
            color: "red",
          });
          throw error;
        }
      },
      fetchOrders: async (params) => {
        set({ loading: true });
        try {
          const data = await authService.getOrders(params);
          set({ loading: false });
          return data;
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },
    }),
    {
      name: "auth_storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, isAdmin: state.isAdmin }),
    },
  ),
);
