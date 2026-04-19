import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAP: Record<string, { label: string; tone: "accent" | "success" | "warn" | "danger" | "neutral" }> = {
  PENDING: { label: "Pendiente", tone: "warn" },
  PAID: { label: "Pagado", tone: "success" },
  PROCESSING: { label: "Procesando", tone: "accent" },
  SHIPPED: { label: "Enviado", tone: "accent" },
  DELIVERED: { label: "Entregado", tone: "success" },
  CANCELLED: { label: "Cancelado", tone: "danger" },
  REFUNDED: { label: "Reembolsado", tone: "neutral" },
};

const TONE: Record<string, { bg: string; fg: string; border: string }> = {
  accent: {
    bg: "var(--color-accent-soft)",
    fg: "var(--color-accent)",
    border: "var(--color-border-strong)",
  },
  success: {
    bg: "color-mix(in oklab, var(--color-success) 16%, transparent)",
    fg: "var(--color-success)",
    border: "color-mix(in oklab, var(--color-success) 30%, transparent)",
  },
  warn: {
    bg: "color-mix(in oklab, var(--color-warn) 16%, transparent)",
    fg: "var(--color-warn)",
    border: "color-mix(in oklab, var(--color-warn) 30%, transparent)",
  },
  danger: {
    bg: "color-mix(in oklab, var(--color-danger) 14%, transparent)",
    fg: "var(--color-danger)",
    border: "color-mix(in oklab, var(--color-danger) 28%, transparent)",
  },
  neutral: {
    bg: "var(--color-bg-input)",
    fg: "var(--color-text-dim)",
    border: "var(--color-border)",
  },
};

export function StatusBadge({ status, className }: { status: OrderStatus | string; className?: string }) {
  const m = MAP[status] ?? { label: String(status), tone: "neutral" as const };
  const c = TONE[m.tone];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider",
        className
      )}
      style={{ background: c.bg, color: c.fg, borderColor: c.border }}
    >
      {m.label}
    </span>
  );
}
