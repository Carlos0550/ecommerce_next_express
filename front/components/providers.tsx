"use client";

import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { makeQueryClient } from "@/lib/query";
import { usePaletteStore } from "@/stores/palette.store";

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => makeQueryClient());
  const palette = usePaletteStore((s) => s.palette);

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
  }, [palette]);

  return (
    <QueryClientProvider client={qc}>
      {children}
      <Toaster
        position="top-right"
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
