"use client";

import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { makeQueryClient } from "@/lib/query";
import { usePaletteStore, type PaletteName } from "@/stores/palette.store";

export function Providers({
  children,
  serverPalette,
}: {
  children: React.ReactNode;
  serverPalette?: PaletteName;
}) {
  const [qc] = useState(() => makeQueryClient());
  const palette = usePaletteStore((s) => s.palette);
  const setPalette = usePaletteStore((s) => s.setPalette);

  useEffect(() => {
    if (!serverPalette) return;
    try {
      const raw = localStorage.getItem("cinnamon-palette");
      if (!raw && palette !== serverPalette) {
        setPalette(serverPalette);
        return;
      }
    } catch {
      // localStorage unavailable — fall through
    }
    document.documentElement.dataset.palette = palette;
  }, [palette, serverPalette, setPalette]);

  return (
    <QueryClientProvider client={qc}>
      {children}
      <Toaster
        position="bottom-right"
        theme="system"
        toastOptions={{
          style: {
            background: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text)",
          },
        }}
      />
      {process.env.NODE_ENV === "development" ? (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      ) : null}
    </QueryClientProvider>
  );
}
