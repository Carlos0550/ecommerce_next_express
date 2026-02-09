import axios from "axios";
import { useAuthStore } from "@/stores/useAuthStore";
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

let isLoggingOut = false;

export const resetLogoutFlag = () => {
  isLoggingOut = false;
};

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});
api.interceptors.request.use(
  (config) => {
    const isPublicPath = config.url?.includes("/public/");
    const skipToken = config.params?.skipToken === true;
    if (skipToken) {
      delete config.params.skipToken;
      return config;
    }
    if (isPublicPath) {
      return config;
    }
    let token: string | null = null;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("auth_storage");
        if (stored) {
          const parsed = JSON.parse(stored);
          token = parsed?.state?.token;
        }
      } catch {}
      if (!token) {
        const cookieToken = document.cookie
          .split("; ")
          .find((row) => row.startsWith("auth_token="))
          ?.split("=")[1];
        if (cookieToken) {
          token = decodeURIComponent(cookieToken);
        }
      }
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      "Un error inesperado ocurrió";
    if (error.response?.status === 401) {
      const url = error.config?.url || "";
      const isAuthEndpoint =
        url.includes("/auth/validate") ||
        url.includes("/profile/me") ||
        url.includes("/login") ||
        url.includes("/register");
      if (!isAuthEndpoint && typeof window !== "undefined" && !isLoggingOut) {
        isLoggingOut = true;
        useAuthStore.getState().logout({ expired: true });
      }
    }
    return Promise.reject({ ...error, message });
  },
);
