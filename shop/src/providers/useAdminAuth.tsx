"use client";
import { showNotification } from "@mantine/notifications";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

export type AdminSession = {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  role: number;
};

type AdminState = {
  token: string | null;
  session: AdminSession | null;
  loading: boolean;
};

export function useAdminAuth() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";
  const [state, setState] = useState<AdminState>({
    token: null,
    session: null,
    loading: true, // Siempre empezamos cargando para hidratación segura
  });
  const router = useRouter();

  // Inicialización en el cliente
  useEffect(() => {
    const storedToken = localStorage.getItem("admin_auth_token");
    if (storedToken && storedToken !== "") {
      setState(s => ({ ...s, token: storedToken, loading: true }));
    } else {
      localStorage.removeItem("admin_auth_token");
      setState(s => ({ ...s, token: null, loading: false }));
    }
  }, []);

  useLayoutEffect(() => {
    // Solo redirigir si ya terminamos de intentar cargar el token inicial
    if (!state.loading && !state.token && !window.location.pathname.startsWith("/admin/auth")) {
      router.push("/admin/auth");
    }
  }, [state.token, state.loading, router]);

  const updateToken = useCallback((newToken: string | null) => {
    setState(s => ({ ...s, token: newToken, loading: !!newToken }));
    if (newToken) {
      localStorage.setItem("admin_auth_token", newToken);
    } else {
      localStorage.removeItem("admin_auth_token");
      setState(s => ({ ...s, session: null }));
    }
  }, []);

  const {
    data: validationData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["validateAdminToken", state.token],
    queryFn: async () => {
      if (!state.token) {
        throw new Error("No token available");
      }

      const response = await fetchWithTimeout(baseUrl + "/validate-token", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${state.token}`,
        },
        timeout: 5000,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || "validation_failed");
      }

      return (await response.json()) as AdminSession;
    },
    enabled: !!state.token,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useLayoutEffect(() => {
    if (validationData) {
      if (!validationData.is_active) {
        setState(s => ({ ...s, loading: false }));
        if (!window.location.pathname.startsWith("/admin/auth")) {
          router.push("/admin/auth");
          showNotification({
            title: "Acceso denegado",
            message: "Tu cuenta de administrador aún no ha sido aprobada.",
            color: "red",
          });
        }
        return;
      }
      setState(s => ({ ...s, session: validationData, loading: false }));
    }
  }, [validationData, router]);

  useLayoutEffect(() => {
    if (isError && state.token) {
      setState(s => ({ ...s, token: null, session: null, loading: false }));
      localStorage.removeItem("admin_auth_token");
      router.push("/admin/auth");
      showNotification({
        title: "Sesión inválida",
        message: "Por favor inicie sesión de nuevo.",
        color: "red",
      });
    }
  }, [isError, state.token, router]);

  const logout = useCallback(
    (expired_session: boolean = false) => {
      updateToken(null);
      router.push("/admin/auth");
      if (expired_session) {
        return showNotification({
          title: "Sesión expirada",
          message: "Por favor, inicie sesión de nuevo",
          color: "red",
        });
      } else {
        return showNotification({
          title: "Sesión cerrada",
          message: "Hasta pronto",
          color: "green",
        });
      }
    },
    [router, updateToken]
  );

  return {
    session: state.session,
    setSession: () => {},
    token: state.token,
    setToken: updateToken,
    loading: state.loading || (!!state.token && !state.session && !isError),
    refetchValidation: refetch,
    logout,
  };
}

export default useAdminAuth;
