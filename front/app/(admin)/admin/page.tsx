"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AdminShell } from "@/components/admin/admin-shell";
import { StatCard } from "@/components/admin/stat-card";
import { Icon } from "@/components/brand";
import { formatARS } from "@/lib/utils";
import type { Sale } from "@/lib/types";

type Analytics = {
  success: boolean;
  analytics: {
    day?: { total: number; orders: number };
    week?: { total: number; orders: number };
    month?: { total: number; orders: number };
    net_income_month?: number;
    series?: Array<{ d: string; v: number }>;
    delta?: Record<string, number>;
  };
};

export default function AdminDashboardPage() {
  const analytics = useQuery({
    queryKey: ["sales", "analytics"],
    queryFn: async () => {
      const { data } = await api.get<Analytics>("/sales/analytics");
      return data.analytics ?? {};
    },
  });

  const recent = useQuery({
    queryKey: ["sales", "recent"],
    queryFn: async () => {
      const { data } = await api.get<{ sales?: Sale[]; data?: Sale[] }>(
        "/sales?limit=5"
      );
      return data.sales ?? data.data ?? [];
    },
  });

  const a = analytics.data ?? {};
  const day = a.day?.total ?? 0;
  const week = a.week?.total ?? 0;
  const month = a.month?.total ?? 0;
  const net = a.net_income_month ?? 0;

  const subtitle = new Date().toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <AdminShell
      title="Dashboard"
      subtitle={`Observabilidad del negocio · ${subtitle}`}
      actions={
        <button className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)]">
          <Icon name="download" size={14} />
          Exportar reporte
        </button>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard label="Ventas del día" value={formatARS(day)} icon="cash" />
        <StatCard
          label="Ventas de la semana"
          value={formatARS(week)}
          icon="chart"
        />
        <StatCard
          label="Ventas del mes"
          value={formatARS(month)}
          icon="wallet"
        />
        <StatCard
          label="Ingreso neto (mes)"
          value={formatARS(net)}
          icon="package"
        />
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
            Últimas ventas
          </div>
          <div className="mt-3.5 flex flex-col">
            {recent.isLoading && (
              <div className="py-6 text-center text-sm text-[var(--color-text-dim)]">
                Cargando…
              </div>
            )}
            {recent.data?.length === 0 && (
              <div className="py-6 text-center text-sm text-[var(--color-text-dim)]">
                Sin ventas todavía.
              </div>
            )}
            {recent.data?.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2.5 border-b border-[var(--color-border)] py-2.5 last:border-b-0"
              >
                <div className="flex-1">
                  <div className="text-[13px] font-medium text-[var(--color-text)]">
                    #{s.id}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-dim)]">
                    {new Date(s.createdAt).toLocaleString("es-AR")} ·{" "}
                    {s.source}
                  </div>
                </div>
                <span className="font-grotesk text-[13px] font-semibold text-[var(--color-text)]">
                  {formatARS(Number(s.total))}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
            Accesos rápidos
          </div>
          <div className="flex flex-col gap-2">
            {[
              { href: "/admin/pos", label: "Abrir POS / Caja", icon: "cash" as const },
              { href: "/admin/products", label: "Productos", icon: "box" as const },
              { href: "/admin/orders", label: "Órdenes pendientes", icon: "package" as const },
              { href: "/admin/business", label: "Datos del negocio", icon: "settings" as const },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center gap-3 rounded-[10px] border border-[var(--color-border)] px-3.5 py-2.5 text-[13px] text-[var(--color-text)] transition hover:bg-[var(--color-bg-input)]"
              >
                <Icon
                  name={l.icon}
                  size={14}
                  className="text-[var(--color-accent)]"
                />
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
