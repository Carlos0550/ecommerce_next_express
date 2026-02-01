"use client";
import { showNotification } from "@mantine/notifications";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

export type AdminSession = {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  role: number;
};

const TOKEN_KEY = "admin_auth_token";

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

export function useAdminAuth() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";
  const router = useRouter();

  const token = useSyncExternalStore(subscribeToStorage, getStoredToken, getServerSnapshot);

  const updateToken = useCallback((newToken: string | null) => {
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    window.dispatchEvent(new StorageEvent("storage", { key: TOKEN_KEY }));
  }, []);

  const {
    data: validationData,
    isLoading: isValidating,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["validateAdminToken", token],
    queryFn: async () => {
      if (!token) {
        throw new Error("No token available");
      }

      const response = await fetchWithTimeout(baseUrl + "/validate-token", {
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

      return (await response.json()) as AdminSession;
    },
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const session = useMemo((): AdminSession | null => {
    if (!validationData) return null;
    if (!validationData.is_active) return null;
    return validationData;
  }, [validationData]);

  const loading = useMemo(() => {
    if (typeof window === "undefined") return true;
    if (token && isValidating) return true;
    if (token && !validationData && !isError) return true;
    return false;
  }, [token, isValidating, validationData, isError]);

  const handleAuthError = useCallback(() => {
    updateToken(null);
    router.push("/admin/auth");
  }, [updateToken, router]);

  const logout = useCallback(
    (expired_session: boolean = false) => {
      updateToken(null);
      router.push("/admin/auth");
      if (expired_session) {
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
    [router, updateToken]
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
      if (!window.location.pathname.startsWith("/admin/auth")) {
        router.push("/admin/auth");
        showNotification({
          title: "Acceso denegado",
          message: "Tu cuenta de administrador aún no ha sido aprobada.",
          color: "red",
        });
      }
    });
  }

  return useMemo(() => ({
    session,
    setSession: () => {},
    token,
    setToken: updateToken,
    loading,
    refetchValidation: refetch,
    logout,
  }), [session, token, loading, refetch, logout, updateToken]);
}

export default useAdminAuth;
