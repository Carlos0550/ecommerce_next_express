"use client";
import { createContext, useContext, useMemo } from "react";
import { useAdminAuth } from "./useAdminAuth";
import { useMediaQuery } from "@mantine/hooks";

type AdminContextValue = {
  auth: ReturnType<typeof useAdminAuth>;
  utils: {
    baseUrl: string;
    isMobile: boolean;
    capitalizeTexts: (text: string) => string;
  };
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminContextProvider({ children }: { children: React.ReactNode }) {
  const auth = useAdminAuth();
  const isMobile = useMediaQuery("(max-width: 768px)") ?? false;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

  const capitalizeTexts = (text: string) => {
    if (!text) return "";
    return text
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const value = useMemo<AdminContextValue>(
    () => ({
      auth,
      utils: {
        baseUrl,
        isMobile,
        capitalizeTexts,
      },
    }),
    [auth, baseUrl, isMobile]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminContext() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdminContext must be used within an AdminContextProvider");
  }
  return context;
}
