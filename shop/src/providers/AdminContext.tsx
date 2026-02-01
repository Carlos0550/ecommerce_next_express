"use client";
import { createContext, useContext, useMemo, useCallback } from "react";
import { useAdminAuth } from "./useAdminAuth";
import { useWindowSize } from "@/utils/hooks/useWindowSize";
import { capitalizeTexts, BASE_URL } from "@/utils/constants";

type AdminContextValue = {
  auth: ReturnType<typeof useAdminAuth>;
  utils: {
    baseUrl: string;
    isMobile: boolean;
    capitalizeTexts: (text: string) => string;
  };
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useAdminAuth();
  const { isMobile } = useWindowSize();

  const value = useMemo<AdminContextValue>(
    () => ({
      auth,
      utils: {
        baseUrl: BASE_URL,
        isMobile,
        capitalizeTexts,
      },
    }),
    [auth, isMobile]
  );

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdminContext() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error(
      "useAdminContext must be used within an AdminContextProvider"
    );
  }
  return context;
}
