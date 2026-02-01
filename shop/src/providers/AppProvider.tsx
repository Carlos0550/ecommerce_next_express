"use client";

import { MantineProvider, createTheme } from "@mantine/core";
import type { MantineColorsTuple } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { AppContextProvider } from "./AppContext";
import { BASE_URL } from "@/utils/constants";

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

const toMantineTuple = (arr: string[]): MantineColorsTuple => {
  const fixed =
    arr.length >= 10
      ? arr.slice(0, 10)
      : [...arr, ...Array(10 - arr.length).fill("#000000")];
  return fixed as unknown as MantineColorsTuple;
};

const defaultColors = [
  "#ffffff",
  "#f2f2f2",
  "#e6e6e6",
  "#cccccc",
  "#b3b3b3",
  "#999999",
  "#7f7f7f",
  "#666666",
  "#4d4d4d",
  "#1a1a1a",
];

type Props = {
  children: React.ReactNode;
};

export default function AppProvider({ children }: Props) {
  const [queryClient] = useState(() => getQueryClient());
  const [paletteName, setPaletteName] = useState<string>("mono");
  const [colors, setColors] = useState<string[]>(defaultColors);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/theme/palette/shop`);
        if (res.ok && isMounted) {
          const p = await res.json();
          if (p?.name && Array.isArray(p.colors) && p.colors.length === 10) {
            const slug =
              String(p.name)
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9-]/g, "") || "brand";
            setPaletteName(slug);
            setColors(p.colors);
          }
        }
      } catch (err) {
        console.warn("Failed to load palette:", err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const theme = createTheme({
    fontFamily: "var(--font-stack), Arial, Helvetica, sans-serif",
    headings: { fontFamily: "var(--font-stack), Arial, Helvetica, sans-serif" },
    colors: { [paletteName]: toMantineTuple(colors) },
    primaryColor: paletteName,
    primaryShade: { light: 6, dark: 6 },
    defaultRadius: "md",
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="light">
        <Notifications position="top-right" />
        <AppContextProvider>{children}</AppContextProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}
