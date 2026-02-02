"use client";
import { useMemo } from "react";
import { useUnifiedAuth, type UserSession } from "./useUnifiedAuth";

export type AdminSession = UserSession;

export function useAdminAuth() {
  const unifiedAuth = useUnifiedAuth();

  return useMemo(() => ({
    session: unifiedAuth.isAdmin ? unifiedAuth.session : null,
    setSession: () => {},
    token: unifiedAuth.token,
    setToken: unifiedAuth.setToken,
    loading: unifiedAuth.loading,
    refetchValidation: unifiedAuth.refetchValidation,
    logout: (expired_session: boolean = false) => {
      unifiedAuth.logout({ expired: expired_session, redirect: "/admin/auth" });
    },
  }), [unifiedAuth]);
}

export default useAdminAuth;
