"use client";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/brand";
import type { AdminLayoutConfig, AdminLayoutMode } from "@/lib/types";

export const DEFAULT_ADMIN_LAYOUT: AdminLayoutConfig = {
  sales: "modern",
};

type ModeOption = {
  id: AdminLayoutMode;
  label: string;
  hint: string;
};

const SALES_MODES: ModeOption[] = [
  {
    id: "modern",
    label: "Moderno",
    hint: "POS dedicado + historial separado. Flujo optimizado para caja rápida.",
  },
  {
    id: "legacy",
    label: "Clásico",
    hint: "Una sola vista con histórico y botón para cargar venta en modal.",
  },
];

export function AdminLayoutToggle({
  value,
  onChange,
}: {
  value: AdminLayoutConfig;
  onChange: (next: AdminLayoutConfig) => void;
}) {
  const current = value.sales ?? "modern";
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 md:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon name="settings" size={16} />
        <h3 className="text-[14px] font-semibold text-[var(--color-text)]">
          Diseño del panel admin
        </h3>
      </div>
      <p className="mb-4 text-[12px] text-[var(--color-text-dim)]">
        Elegí cómo ver los módulos del panel. Afecta solo a este negocio.
      </p>

      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
          Módulo de ventas
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SALES_MODES.map((opt) => {
            const active = current === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ ...value, sales: opt.id })}
                className={cn(
                  "rounded-xl border px-3.5 py-3 text-left transition",
                  active
                    ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)]"
                    : "border-[var(--color-border)] bg-[var(--color-bg-input)] hover:border-[var(--color-text-dim)]",
                )}
                aria-pressed={active}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-[var(--color-text)]">
                    {opt.label}
                  </span>
                  {active && (
                    <span className="inline-flex h-5 items-center gap-1 rounded-full bg-[var(--color-accent)] px-2 text-[10px] font-semibold uppercase tracking-wider text-white">
                      Activo
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11.5px] leading-snug text-[var(--color-text-dim)]">
                  {opt.hint}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
