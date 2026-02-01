"use client";

import { MantineProvider, localStorageColorSchemeManager } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import ActivePaletteProvider from "./ActivePaletteProvider";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AppContextProvider } from "./AppContext";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

type Props = {
  children: React.ReactNode;
};

export default function AppProvider({ children }: Props) {
  const colorSchemeManager = localStorageColorSchemeManager({ key: "mantine-color-scheme" });
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider defaultColorScheme="light" colorSchemeManager={colorSchemeManager}>
        <ActivePaletteProvider>
          <Notifications position="top-right" />
          <AppContextProvider>
            {children}
          </AppContextProvider>
        </ActivePaletteProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}
