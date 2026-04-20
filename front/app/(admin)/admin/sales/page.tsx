"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn, formatARS } from "@/lib/utils";
import { AdminShell } from "@/components/admin/admin-shell";
import { StatCard } from "@/components/admin/stat-card";
import { Icon } from "@/components/brand";
import type { Sale } from "@/lib/types";

type SalesResp = {
  success: boolean;
  sales: (Sale & {
    processed?: boolean;
    declined?: boolean;
    user?: { email?: string; name?: string } | null;
  })[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  totalSalesByDate?: number | string;
};

export default function AdminSalesPage() {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);

  const [start, setStart] = useState(weekAgo);
  const [end, setEnd] = useState(today);
  const [page, setPage] = useState(1);

  const salesQ = useQuery({
    queryKey: ["sales", "list", { start, end, page }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        per_page: "20",
        start_date: start,
        end_date: end,
      });
      const { data } = await api.get<SalesResp>(`/sales?${params}`);
      return data;
    },
  });

  const sales = salesQ.data?.sales ?? [];
  const totalPages = salesQ.data?.pagination?.totalPages ?? 1;
  const totalCount = salesQ.data?.pagination?.total ?? 0;
  const totalByDate = Number(salesQ.data?.totalSalesByDate ?? 0);

  const avgTicket = useMemo(() => {
    const n = sales.length;
    if (n === 0) return 0;
    const sum = sales.reduce((acc, s) => acc + Number(s.total || 0), 0);
    return sum / n;
  }, [sales]);

  const exportCsv = () => {
    const header = ["id", "fecha", "origen", "método", "total", "estado", "cliente"];
    const rows = sales.map((s) => {
      const state = s.processed
        ? "Procesada"
        : s.declined
          ? "Rechazada"
          : "Pendiente";
      return [
        s.id,
        s.createdAt ? new Date(s.createdAt).toISOString() : "",
        s.source,
        s.payment_method ?? "",
        s.total,
        state,
        s.user?.email ?? "",
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",");
    });
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ventas-${start}_${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminShell
      title="Historial de ventas"
      subtitle={`${totalCount} ventas en el rango seleccionado`}
      actions={
        <button
          onClick={exportCsv}
          disabled={sales.length === 0}
          className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3.5 py-2.5 text-[13px] font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-input)] disabled:opacity-50"
        >
          <Icon name="download" size={14} /> Exportar CSV
        </button>
      }
    >
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <StatCard
          label="Total en rango"
          value={formatARS(totalByDate)}
          icon="cash"
        />
        <StatCard
          label="Ventas"
          value={String(totalCount)}
          icon="receipt"
        />
        <StatCard
          label="Ticket promedio"
          value={formatARS(avgTicket)}
          icon="chart"
        />
      </div>

      <div className="mb-3.5 flex flex-wrap items-end gap-3">
        <label className="block">
          <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
            Desde
          </div>
          <input
            type="date"
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              setPage(1);
            }}
            className={inputCls}
          />
        </label>
        <label className="block">
          <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
            Hasta
          </div>
          <input
            type="date"
            value={end}
            onChange={(e) => {
              setEnd(e.target.value);
              setPage(1);
            }}
            className={inputCls}
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
        <div
          className="grid gap-3 border-b border-[var(--color-border)] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]"
          style={{ gridTemplateColumns: GRID }}
        >
          <div>#</div>
          <div>Fecha</div>
          <div>Origen</div>
          <div>Método</div>
          <div>Cliente</div>
          <div>Estado</div>
          <div className="text-right">Total</div>
        </div>

        {salesQ.isLoading && (
          <div className="p-8 text-center text-sm text-[var(--color-text-dim)]">
            Cargando ventas…
          </div>
        )}

        {!salesQ.isLoading && sales.length === 0 && (
          <div className="p-12 text-center text-sm text-[var(--color-text-dim)]">
            Sin resultados en este rango.
          </div>
        )}

        {sales.map((s) => {
          const state = s.processed
            ? { color: "var(--color-success)", label: "Procesada" }
            : s.declined
              ? { color: "var(--color-danger)", label: "Rechazada" }
              : { color: "var(--color-warn)", label: "Pendiente" };

          return (
            <div
              key={s.id}
              className="grid items-center gap-3 border-b border-[var(--color-border)] px-4 py-3 text-[13px] last:border-b-0"
              style={{ gridTemplateColumns: GRID }}
            >
              <div className="font-mono text-[12px] text-[var(--color-text)]">
                #{s.id}
              </div>
              <div className="text-[var(--color-text-dim)]">
                {s.createdAt
                  ? new Date(s.createdAt).toLocaleString("es-AR")
                  : "—"}
              </div>
              <div>
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                    s.source === "CAJA"
                      ? "bg-[var(--color-bg-input)] text-[var(--color-text-dim)]"
                      : "bg-[color-mix(in_srgb,var(--color-accent)_18%,transparent)] text-[var(--color-accent)]"
                  )}
                >
                  {s.source}
                </span>
              </div>
              <div className="text-[var(--color-text-dim)]">
                {s.payment_method ?? "—"}
              </div>
              <div className="truncate text-[var(--color-text-dim)]">
                {s.user?.email ?? "—"}
              </div>
              <div>
                <span
                  className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    background: `color-mix(in srgb, ${state.color} 18%, transparent)`,
                    color: state.color,
                  }}
                >
                  {state.label}
                </span>
              </div>
              <div className="text-right font-grotesk font-semibold text-[var(--color-text)]">
                {formatARS(Number(s.total))}
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-[12px] text-[var(--color-text-dim)]">
          <div>
            Página {page} de {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-[10px] border border-[var(--color-border)] px-3 py-1.5 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-[10px] border border-[var(--color-border)] px-3 py-1.5 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

const GRID = "80px 1.5fr 0.8fr 1fr 1.3fr 0.9fr 1fr";

const inputCls =
  "h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-[13px] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]";
