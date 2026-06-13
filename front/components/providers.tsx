"use client";

import { useState, useLayoutEffect, useEffect, useRef } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { makeQueryClient } from "@/lib/query";
import {
  usePaletteStore,
  readPersistedPalette,
  DEFAULT_PALETTE,
  type PaletteName,
} from "@/stores/palette.store";

// useLayoutEffect da warning en SSR; lo aplanamos a useEffect ahí.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Resuelve la paleta que debe aplicarse al DOM, con esta prioridad:
 *
 *   1. localStorage, pero solo si es un override explícito del usuario
 *      (es decir, un valor distinto del default "kuromi"). Esto evita
 *      que una entrada histórica de "kuromi" en storage ancle al
 *      visitante a esa paleta aunque el admin la cambie en el server.
 *   2. serverPalette (lo que configuró el admin en el backend)
 *   3. DEFAULT_PALETTE (fallback)
 *
 * Esta función SOLO se ejecuta en el cliente.
 */
function resolveClientPalette(serverPalette?: PaletteName): PaletteName {
  const stored = readPersistedPalette();
  if (stored && stored !== DEFAULT_PALETTE) return stored;
  if (serverPalette) return serverPalette;
  return DEFAULT_PALETTE;
}

export function Providers({
  children,
  serverPalette,
}: {
  children: React.ReactNode;
  serverPalette?: PaletteName;
}) {
  const [qc] = useState(() => makeQueryClient());
  const palette = usePaletteStore((s) => s.palette);
  const setPaletteFromServer = usePaletteStore((s) => s._setFromServer);
  const reconciled = useRef(false);

  // ── Resolución única, antes del primer paint ─────────────────────
  // Este useLayoutEffect corre antes de que el browser pinte el primer
  // frame. Calculamos la paleta correcta (localStorage > server >
  // default) y la aplicamos al <html data-palette> + al store de forma
  // atómica, sin importar qué tenía el store al arrancar.
  //
  // Solo corre una vez (`reconciled.current` evita loops si el store
  // cambia por una acción explícita del usuario después).
  useIsomorphicLayoutEffect(() => {
    if (reconciled.current) return;
    if (typeof document === "undefined") return;

    const resolved = resolveClientPalette(serverPalette);

    // 1) Reflejar en el DOM antes del primer paint.
    document.documentElement.dataset.palette = resolved;

    // 2) Reflejar en el store. Usamos `_setFromServer` para NO persistir
    //    en localStorage: si el valor viene del server, no debe
    //    contaminar el storage del visitante (si el admin cambia la
    //    paleta mañana, queremos que se vea sin que el visitante tenga
    //    que borrar cookies). El caso localStorage ya está persistido
    //    de antes, así que tampoco necesita re-persistir.
    if (palette !== resolved) {
      setPaletteFromServer(resolved);
    }

    reconciled.current = true;
  }, [palette, serverPalette, setPaletteFromServer]);

  // ── Sincronización post-hidratación (cambios del usuario) ────────
  // Después del primer paint, mantenemos el DOM en sync con el store
  // para que `setPalette(...)` desde el admin se refleje de inmediato.
  useIsomorphicLayoutEffect(() => {
    if (!reconciled.current) return;
    if (typeof document === "undefined") return;
    if (document.documentElement.dataset.palette !== palette) {
      document.documentElement.dataset.palette = palette;
    }
  }, [palette]);

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
