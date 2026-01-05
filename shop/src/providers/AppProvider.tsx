"use client";

import { MantineProvider, localStorageColorSchemeManager } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import ActivePaletteProvider from "./ActivePaletteProvider";
import { TenantProvider } from "./TenantProvider";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AppContextProvider } from "./AppContext";

type Props = {
  children: React.ReactNode;
  initialTenantSlug?: string;
};

export default function AppProvider({ children, initialTenantSlug }: Props) {
  const colorSchemeManager = localStorageColorSchemeManager({ key: "mantine-color-scheme" });
  const [queryClient] = useState(() => new QueryClient());

  return (
    <MantineProvider defaultColorScheme="light" colorSchemeManager={colorSchemeManager}>
      <TenantProvider initialSlug={initialTenantSlug}>
        <ActivePaletteProvider>
          <QueryClientProvider client={queryClient}>
            <Notifications position="top-right" />
            <AppContextProvider>
              {children}
            </AppContextProvider>
          </QueryClientProvider>
        </ActivePaletteProvider>
      </TenantProvider>
    </MantineProvider>
  );
}
