"use client";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { useConfigStore } from "@/stores/useConfigStore";
import { queryClient as globalQueryClient } from "@/config/queryClient";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { getPalette, tokensToCssVars } from "@/theme/palettes";
import { buildMantineTheme } from "@/theme/mantineTheme";
import { ThemeTokensContext } from "@/hooks/usePaletteTokens";

function getQueryClient() {
  return globalQueryClient;
}

type Props = {
  children: React.ReactNode;
};

export default function AppProvider({ children }: Props) {
  const { fetchConfig, activePalette } = useConfigStore();
  const [queryClient] = useState(() => getQueryClient());

  const tokens = useMemo(() => getPalette(activePalette), [activePalette]);
  const mantineTheme = useMemo(() => buildMantineTheme(tokens), [tokens]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    const root = document.documentElement;
    const vars = tokensToCssVars(tokens);
    for (const [k, v] of Object.entries(vars)) {
      root.style.setProperty(k, v);
    }
    root.dataset.palette = activePalette;
    root.style.colorScheme = tokens.isDark ? "dark" : "light";
  }, [tokens, activePalette]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeTokensContext.Provider value={tokens}>
        <MantineProvider
          theme={mantineTheme}
          defaultColorScheme={tokens.isDark ? "dark" : "light"}
          forceColorScheme={tokens.isDark ? "dark" : "light"}
        >
          <Notifications position="top-right" />
          {children}
        </MantineProvider>
      </ThemeTokensContext.Provider>
    </QueryClientProvider>
  );
}
