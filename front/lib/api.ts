import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/auth.store";
import { translateError } from "@/lib/error-messages";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: false,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window === "undefined") return config;
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (typeof window === "undefined") return Promise.reject(error);
    const status = error.response?.status;
    if (status === 401) {
      const path = window.location.pathname;
      const store = useAuthStore.getState();
      store.logout();
      if (path.startsWith("/admin") && path !== "/admin/login") {
        window.location.replace("/admin/login");
      }
    }
    return Promise.reject(error);
  }
);

export function storageUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_STORAGE_URL || `${API_URL}/storage`;
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

export function unwrapError(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string; error?: string } | undefined;
    if (data?.message && data.message.length > 0 && !/^[a-z][a-z0-9_]*$/.test(data.message)) {
      return data.message;
    }
    return translateError(data?.error ?? data?.message ?? err.code ?? err.message);
  }
  if (err instanceof Error) return translateError(err.message);
  return translateError(null);
}
