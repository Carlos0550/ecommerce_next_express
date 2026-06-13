"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { makeQueryClient } from "@/lib/query";
import { usePaletteStore, type PaletteName } from "@/stores/palette.store";

// useLayoutEffect da warning en SSR; lo aplanamos a useEffect ahí.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

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

  useIsomorphicLayoutEffect(() => {
    if (typeof document === "undefined") return;
    // Mantener <html data-palette> en sync con el store. Usamos
    // useLayoutEffect para que se aplique antes del primer paint y no haya
    // flash de la paleta default.
    document.documentElement.dataset.palette = palette;
  }, [palette]);

  useEffect(() => {
    if (!serverPalette) return;

    // El SSR ya pintó <html data-palette={serverPalette}>. En la primera
    // hidratación solo debemos corregir si localStorage tiene un override
    // del usuario. Cualquier otro caso (storage vacío o ya sincronizado)
    // no debe pisar el atributo del html.
    try {
      const raw = localStorage.getItem("cinnamon-palette");
      const stored = raw ? (JSON.parse(raw)?.state?.palette as PaletteName | undefined) : undefined;

      if (!stored) {
        if (palette !== serverPalette) setPalette(serverPalette);
        return;
      }

      if (stored !== palette) setPalette(stored);
    } catch {
      // localStorage unavailable — fall through
    }
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
