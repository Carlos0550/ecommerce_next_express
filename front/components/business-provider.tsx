"use client";

import { createContext, useContext } from "react";
import type { Business } from "@/lib/types";

const BusinessContext = createContext<Business | null>(null);

export const BUSINESS_NAME_FALLBACK = "Tu tienda online";

export function BusinessProvider({
  value,
  children,
}: {
  value: Business | null;
  children: React.ReactNode;
}) {
  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness(): Business | null {
  return useContext(BusinessContext);
}

export function useBusinessName(): string {
  const b = useContext(BusinessContext);
  const name = b?.name?.trim();
  return name && name.length > 0 ? name : BUSINESS_NAME_FALLBACK;
}
