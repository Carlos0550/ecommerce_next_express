"use client";
import { showNotification } from "@mantine/notifications";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useRouter, usePathname } from "next/navigation";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

export type UserSession = {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  role: number;
  profileImage?: string;
  subjectType: "admin" | "user";
};

const TOKEN_KEY = "auth_token";
const TOKEN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  return token && token !== "" ? token : null;
}

function subscribeToStorage(callback: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === TOKEN_KEY) callback();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function getServerSnapshot(): string | null {
  return null;
}

function setCookie(name: string, value: string, maxAge: number) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${value}; Max-Age=${maxAge}; Path=/; SameSite=Strict`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Max-Age=0; Path=/`;
}

export function useUnifiedAuth() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const token = useSyncExternalStore(subscribeToStorage, getStoredToken, getServerSnapshot);

  const updateToken = useCallback((newToken: string | null) => {
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
      setCookie(TOKEN_KEY, newToken, TOKEN_COOKIE_MAX_AGE);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      deleteCookie(TOKEN_KEY);
    }
    window.dispatchEvent(new StorageEvent("storage", { key: TOKEN_KEY }));
  }, []);

  const {
    data: validationData,
    isLoading: isValidating,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["validateToken", token],
    queryFn: async () => {
      if (!token) {
        throw new Error("No token available");
      }

      const response = await fetchWithTimeout(baseUrl + "/auth/validate", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 5000,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || "validation_failed");
      }

      return (await response.json()) as UserSession;
    },
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const session = useMemo((): UserSession | null => {
    if (!validationData) return null;
    if (!validationData.is_active) return null;
    return validationData;
  }, [validationData]);

  const isAdmin = useMemo(() => {
    return session?.subjectType === "admin" || session?.role === 1;
  }, [session]);

  const isUser = useMemo(() => {
    return session?.subjectType === "user" || session?.role === 2;
  }, [session]);

  const loading = useMemo(() => {
    if (typeof window === "undefined") return true;
    if (token && isValidating) return true;
    if (token && !validationData && !isError) return true;
    return false;
  }, [token, isValidating, validationData, isError]);

  const handleAuthError = useCallback(() => {
    updateToken(null);
    queryClient.removeQueries({ queryKey: ["validateToken"] });
    
    const isAdminRoute = pathname?.startsWith("/admin");
    if (isAdminRoute) {
      router.push("/admin/auth");
    } else {
      router.push("/");
    }
  }, [updateToken, router, pathname, queryClient]);

  const logout = useCallback(
    (options: { expired?: boolean; redirect?: string } = {}) => {
      updateToken(null);
      queryClient.removeQueries({ queryKey: ["validateToken"] });
      
      const redirectTo = options.redirect || (pathname?.startsWith("/admin") ? "/admin/auth" : "/");
      router.push(redirectTo);

      if (options.expired) {
        showNotification({
          title: "Sesión expirada",
          message: "Por favor, inicie sesión de nuevo",
          color: "red",
        });
      } else {
        showNotification({
          title: "Sesión cerrada",
          message: "Hasta pronto",
          color: "green",
        });
      }
    },
    [router, updateToken, pathname, queryClient]
  );

  const loginAdmin = useCallback(
    async (email: string, password: string) => {
      const response = await fetchWithTimeout(`${baseUrl}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        timeout: 10000,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.message || err?.error || "login_failed");
      }

      const data = await response.json();
      updateToken(data.token);
      await refetch();
      return data;
    },
    [baseUrl, updateToken, refetch]
  );

  const loginUser = useCallback(
    async (email: string, password: string) => {
      const response = await fetchWithTimeout(`${baseUrl}/shop/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        timeout: 10000,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.message || err?.error || "login_failed");
      }

      const data = await response.json();
      updateToken(data.token);
      await refetch();
      return data;
    },
    [baseUrl, updateToken, refetch]
  );

  const registerAdmin = useCallback(
    async (name: string, email: string, password: string) => {
      const response = await fetchWithTimeout(`${baseUrl}/shop/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, asAdmin: true }),
        timeout: 10000,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.message || err?.error || "register_failed");
      }

      const data = await response.json();
      
      if (data.pending) {
        return { pending: true, message: data.message };
      }

      if (data.token) {
        updateToken(data.token);
        await refetch();
      }
      
      return data;
    },
    [baseUrl, updateToken, refetch]
  );

  const registerUser = useCallback(
    async (name: string, email: string, password: string) => {
      const response = await fetchWithTimeout(`${baseUrl}/shop/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, asAdmin: false }),
        timeout: 10000,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.message || err?.error || "register_failed");
      }

      const data = await response.json();
      updateToken(data.token);
      await refetch();
      return data;
    },
    [baseUrl, updateToken, refetch]
  );

  if (isError && token) {
    queueMicrotask(() => {
      handleAuthError();
      showNotification({
        title: "Sesión inválida",
        message: "Por favor inicie sesión de nuevo.",
        color: "red",
      });
    });
  }

  if (validationData && !validationData.is_active && token) {
    queueMicrotask(() => {
      const isAdminRoute = pathname?.startsWith("/admin");
      if (isAdminRoute && !pathname?.startsWith("/admin/auth")) {
        router.push("/admin/auth");
        showNotification({
          title: "Acceso denegado",
          message: isAdmin 
            ? "Tu cuenta de administrador aún no ha sido aprobada."
            : "Tu cuenta ha sido desactivada.",
          color: "red",
        });
      }
    });
  }

  return useMemo(() => ({
    session,
    token,
    loading,
    isAdmin,
    isUser,
    isAuthenticated: !!session,
    setToken: updateToken,
    refetchValidation: refetch,
    logout,
    loginAdmin,
    loginUser,
    registerAdmin,
    registerUser,
  }), [
    session, 
    token, 
    loading, 
    isAdmin, 
    isUser, 
    refetch, 
    logout, 
    updateToken,
    loginAdmin,
    loginUser,
    registerAdmin,
    registerUser,
  ]);
}

export default useUnifiedAuth;
