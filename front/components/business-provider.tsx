"use client";

import { createContext, useContext } from "react";
import type { Business } from "@/lib/types";
import { BUSINESS_NAME_FALLBACK } from "@/lib/shop/constants";

export { BUSINESS_NAME_FALLBACK };

const BusinessContext = createContext<Business | null>(null);

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
