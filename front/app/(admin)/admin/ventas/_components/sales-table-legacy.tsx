"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, unwrapError } from "@/lib/api";
import { cn, formatARS } from "@/lib/utils";
import { Icon } from "@/components/brand";
import { StatCard } from "@/components/admin/stat-card";
import { SalesModal } from "./sales-modal";

export type LegacySale = {
  id: string | number;
  created_at?: string;
  createdAt?: string;
  payment_method?: string;
  source?: string;
  tax?: number | string;
  total: number | string;
  loadedManually?: boolean;
  user?: { id?: string; name?: string; email?: string } | null;
  orders?: { buyer_name?: string; buyer_email?: string; buyer_phone?: string }[];
  products?: Array<{
    id?: string | number;
    title?: string;
    price?: number | string;
    quantity?: number;
  }>;
  manualProducts?: Array<{
    title: string;
    price: number | string;
    quantity: number;
  }>;
  manual_products?: Array<{
    title: string;
    price: number | string;
    quantity: number;
  }>;
  items?: Array<{
    id: string;
    title: string;
    price: number;
    quantity: number;
  }>;
  paymentMethods?: Array<{ method: string; amount: number }>;
};

type SalesResp = {
  success: boolean;
  sales: LegacySale[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  totalSalesByDate?: number | string;
};

type AnalyticsPayload = {
  timeseries?: {
    by_day?: Array<{ date: string; revenue: number }>;
  };
};

type AnalyticsResp = {
  success?: boolean;
  analytics?: AnalyticsPayload;
};

type Preset = "HOY" | "AYER" | "ULTIMOS_3" | "ULTIMOS_7" | "MES" | "PERSONALIZADO";

const PRESETS: { id: Preset; label: string }[] = [
  { id: "HOY", label: "Hoy" },
  { id: "AYER", label: "Ayer" },
  { id: "ULTIMOS_3", label: "3 días" },
  { id: "ULTIMOS_7", label: "7 días" },
  { id: "MES", label: "Mes" },
  { id: "PERSONALIZADO", label: "Rango" },
];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
function addDays(d: Date, days: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, 0, 0, 0, 0);
}
function toDateOnly(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function SalesTableLegacy({
  onEdit,
}: {
  onEdit: (sale: LegacySale) => void;
}) {
  const qc = useQueryClient();

  const [preset, setPreset] = useState<Preset>("HOY");
  const [range, setRange] = useState<{ start: string; end: string }>(() => {
    const today = toDateOnly(new Date())!;
    return { start: today, end: today };
  });
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 5;

  const { start_date, end_date } = useMemo(() => {
    const today = new Date();
    switch (preset) {
      case "AYER": {
        const y = addDays(today, -1);
        return {
          start_date: toDateOnly(startOfDay(y)),
          end_date: toDateOnly(endOfDay(y)),
        };
      }
      case "ULTIMOS_3": {
        const s = addDays(today, -2);
        return {
          start_date: toDateOnly(startOfDay(s)),
          end_date: toDateOnly(endOfDay(today)),
        };
      }
      case "ULTIMOS_7": {
        const s = addDays(today, -6);
        return {
          start_date: toDateOnly(startOfDay(s)),
          end_date: toDateOnly(endOfDay(today)),
        };
      }
      case "MES": {
        const s = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          start_date: toDateOnly(s),
          end_date: toDateOnly(endOfDay(today)),
        };
      }
      case "PERSONALIZADO": {
        return { start_date: range.start, end_date: range.end };
      }
      case "HOY":
      default: {
        const s = toDateOnly(startOfDay(today))!;
        return { start_date: s, end_date: s };
      }
    }
  }, [preset, range]);

  const salesQ = useQuery<SalesResp>({
    queryKey: ["sales", "list", { start_date, end_date, page: currentPage }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(currentPage),
        per_page: String(perPage),
        start_date: start_date ?? "",
        end_date: end_date ?? "",
      });
      const { data } = await api.get<SalesResp>(`/sales?${params}`);
      return data;
    },
  });

  const analyticsQ = useQuery<AnalyticsResp>({
    queryKey: ["sales", "analytics", { start_date, end_date }],
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: start_date ?? "",
        end_date: end_date ?? "",
      });
      const { data } = await api.get<AnalyticsResp>(`/sales/analytics?${params}`);
      return data;
    },
  });

  const sales = salesQ.data?.sales ?? [];
  const pagination = salesQ.data?.pagination;
  const totalByDate = Number(salesQ.data?.totalSalesByDate ?? 0);

  const avgTicket = useMemo(() => {
    if (!sales.length) return 0;
    const sum = sales.reduce((acc, s) => acc + Number(s.total || 0), 0);
    return sum / sales.length;
  }, [sales]);

  const currency = useMemo(
    () =>
      new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }),
    [],
  );

  const deleteMut = useMutation({
    mutationFn: (id: string | number) => api.delete(`/sales/${id}`),
    onSuccess: () => {
      toast.success("Venta eliminada");
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const receiptMut = useMutation({
    mutationFn: async (id: string | number) => {
      const { data } = await api.get<{ url?: string } | string>(
        `/sales/${id}/receipt`,
      );
      return typeof data === "string" ? { url: data } : data;
    },
    onSuccess: (res) => {
      if (res?.url) {
        setReceiptUrl(res.url);
      } else {
        toast.error("Sin comprobante disponible");
      }
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const [viewProductsSale, setViewProductsSale] = useState<LegacySale | null>(null);
  const [viewBuyerSale, setViewBuyerSale] = useState<LegacySale | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string>("");

  const formatDate = (v?: string) => {
    if (!v) return "—";
    const d = new Date(v);
    return isNaN(d.getTime()) ? String(v) : d.toLocaleString("es-AR");
  };

  const chartData = useMemo(() => {
    const pts = analyticsQ.data?.analytics?.timeseries?.by_day ?? [];
    return pts.map((p) => ({
      date: p.date,
      revenue: Number(p.revenue) || 0,
    }));
  }, [analyticsQ.data]);

  const formatChartDate = (iso: string) => {
    const dt = new Date(`${iso}T00:00:00`);
    if (isNaN(dt.getTime())) return iso;
    return dt.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
  };
  const formatChartMoney = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${Math.round(v / 1000)}k`;
    return `$${Math.round(v)}`;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <StatCard
          label={
            preset === "HOY"
              ? "Total de hoy"
              : preset === "AYER"
                ? "Total de ayer"
                : preset === "ULTIMOS_3"
                  ? "Total de los últimos 3 días"
                  : preset === "ULTIMOS_7"
                    ? "Total de la semana"
                    : preset === "MES"
                      ? "Total del mes"
                      : "Total en rango"
          }
          value={formatARS(totalByDate)}
          icon="cash"
        />
        <StatCard
          label="Ventas"
          value={String(pagination?.total ?? sales.length)}
          icon="receipt"
        />
        <StatCard
          label="Promedio de ventas"
          value={formatARS(avgTicket)}
          icon="chart"
        />
      </div>

      {(preset === "ULTIMOS_3" ||
        preset === "ULTIMOS_7" ||
        preset === "MES" ||
        preset === "PERSONALIZADO") &&
        chartData.length >= 2 && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 md:p-6">
            <div className="mb-4 text-[13px] font-semibold text-[var(--color-text)]">
              Tendencia de Ingresos
            </div>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <AreaChart
                  data={chartData}
                  margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    tick={{ fontSize: 11, fill: "var(--color-text-dim)" }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)" }}
                    minTickGap={24}
                  />
                  <YAxis
                    tickFormatter={formatChartMoney}
                    tick={{ fontSize: 11, fill: "var(--color-text-dim)" }}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                  />
                  <Tooltip
                    cursor={{
                      stroke: "var(--color-accent)",
                      strokeWidth: 1,
                      strokeDasharray: "3 3",
                      opacity: 0.5,
                    }}
                    contentStyle={{
                      background: "var(--color-bg-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 10,
                      fontSize: 12,
                      padding: "8px 10px",
                    }}
                    labelStyle={{
                      color: "var(--color-text)",
                      fontWeight: 600,
                      marginBottom: 2,
                    }}
                    itemStyle={{ color: "var(--color-accent)" }}
                    labelFormatter={(label) => formatChartDate(String(label))}
                    formatter={(value: number) => [formatARS(value), "Ingresos"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--color-accent)"
                    strokeWidth={2}
                    fill="url(#revenueFill)"
                    activeDot={{
                      r: 5,
                      stroke: "var(--color-accent)",
                      strokeWidth: 2,
                      fill: "var(--color-bg-card)",
                    }}
                    dot={{
                      r: 3,
                      stroke: "var(--color-accent)",
                      strokeWidth: 2,
                      fill: "var(--color-bg-card)",
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-1">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setPreset(p.id);
                setCurrentPage(1);
              }}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[12px] font-medium transition",
                preset === p.id
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--color-text-dim)] hover:bg-[var(--color-bg-input)] hover:text-[var(--color-text)]",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === "PERSONALIZADO" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={range.start}
              onChange={(e) => {
                setRange((r) => ({ ...r, start: e.target.value }));
                setCurrentPage(1);
              }}
              className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 text-[12px] text-[var(--color-text)]"
            />
            <span className="text-[12px] text-[var(--color-text-dim)]">a</span>
            <input
              type="date"
              value={range.end}
              onChange={(e) => {
                setRange((r) => ({ ...r, end: e.target.value }));
                setCurrentPage(1);
              }}
              className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 text-[12px] text-[var(--color-text)]"
            />
          </div>
        )}

      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
        <div className="min-w-[900px]">
          <div
            className="grid gap-3 border-b border-[var(--color-border)] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]"
            style={{ gridTemplateColumns: GRID }}
          >
            <div>Fecha</div>
            <div>Origen</div>
            <div>Método</div>
            <div>Cliente</div>
            <div className="text-right">Total</div>
            <div className="text-right">Acciones</div>
          </div>

          {salesQ.isLoading && (
            <div className="p-8 text-center text-[13px] text-[var(--color-text-dim)]">
              Cargando ventas…
            </div>
          )}

          {!salesQ.isLoading && sales.length === 0 && (
            <div className="p-12 text-center text-[13px] text-[var(--color-text-dim)]">
              Sin resultados en este rango.
            </div>
          )}

          {sales.map((s) => {
            const createdAt = s.createdAt ?? s.created_at;
            const buyer =
              s.user?.email ||
              s.orders?.[0]?.buyer_email ||
              s.orders?.[0]?.buyer_name ||
              "—";
            return (
              <div
                key={String(s.id)}
                className="grid items-center gap-3 border-b border-[var(--color-border)] px-4 py-3 text-[13px] last:border-b-0"
                style={{ gridTemplateColumns: GRID }}
              >
                <div className="text-[var(--color-text-dim)]">
                  {formatDate(createdAt)}
                </div>
                <div>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                      s.source === "CAJA"
                        ? "bg-[var(--color-bg-input)] text-[var(--color-text-dim)]"
                        : "bg-[color-mix(in_srgb,var(--color-accent)_18%,transparent)] text-[var(--color-accent)]",
                    )}
                  >
                    {s.source ?? "—"}
                  </span>
                </div>
                <div className="text-[var(--color-text-dim)]">
                  {s.payment_method ?? "—"}
                </div>
                <div className="truncate text-[var(--color-text-dim)]">
                  {buyer}
                </div>
                <div className="text-right font-grotesk font-semibold text-[var(--color-text)]">
                  {formatARS(Number(s.total))}
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <IconBtn
                    title="Ver productos"
                    onClick={() => setViewProductsSale(s)}
                    color="blue"
                    icon="box"
                  />
                  <IconBtn
                    title="Ver comprador"
                    onClick={() => setViewBuyerSale(s)}
                    color="indigo"
                    icon="users"
                  />
                  {s.source === "WEB" && (
                    <IconBtn
                      title="Ver comprobante"
                      onClick={() => receiptMut.mutate(s.id)}
                      color="teal"
                      icon="receipt"
                    />
                  )}
                  {s.source !== "WEB" && (
                    <IconBtn
                      title="Editar"
                      onClick={() => onEdit(s)}
                      color="gray"
                      icon="edit"
                    />
                  )}
                  <IconBtn
                    title="Eliminar"
                    onClick={() => {
                      if (window.confirm("¿Eliminar esta venta?")) {
                        deleteMut.mutate(s.id);
                      }
                    }}
                    color="red"
                    icon="trash"
                    disabled={deleteMut.isPending}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-[12px] text-[var(--color-text-dim)]">
          <div>
            Página {pagination.page} de {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded-[10px] border border-[var(--color-border)] px-3 py-1.5 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))
              }
              className="rounded-[10px] border border-[var(--color-border)] px-3 py-1.5 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      <SalesModal
        open={!!viewProductsSale}
        onClose={() => setViewProductsSale(null)}
        title="Productos de la venta"
        size="narrow"
      >
        <ProductsList sale={viewProductsSale} currency={currency} />
      </SalesModal>

      <SalesModal
        open={!!viewBuyerSale}
        onClose={() => setViewBuyerSale(null)}
        title="Datos del comprador"
        size="narrow"
      >
        <BuyerView sale={viewBuyerSale} />
      </SalesModal>

      <SalesModal
        open={!!receiptUrl}
        onClose={() => setReceiptUrl("")}
        title="Comprobante"
        size="wide"
      >
        {receiptUrl && (
          <a
            href={receiptUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--color-accent)] underline"
          >
            <Icon name="download" size={14} /> Abrir comprobante en nueva pestaña
          </a>
        )}
      </SalesModal>

    </div>
  );
}

const GRID = "1.2fr 0.6fr 0.8fr 1.4fr 1fr 1.6fr";

function IconBtn({
  title,
  onClick,
  icon,
  color,
  disabled,
}: {
  title: string;
  onClick: () => void;
  icon: "box" | "users" | "receipt" | "edit" | "trash" | "close";
  color: "blue" | "indigo" | "teal" | "orange" | "gray" | "red";
  disabled?: boolean;
}) {
  const colorMap: Record<string, string> = {
    blue: "var(--color-accent)",
    indigo: "var(--color-accent)",
    teal: "var(--color-success)",
    orange: "var(--color-warn)",
    gray: "var(--color-text-dim)",
    red: "var(--color-danger)",
  };
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg-input)] hover:brightness-110 disabled:opacity-40"
      style={{ color: colorMap[color] }}
    >
      <Icon name={icon} size={12} />
    </button>
  );
}

function ProductsList({
  sale,
  currency,
}: {
  sale: LegacySale | null;
  currency: Intl.NumberFormat;
}) {
  if (!sale) return null;
  const manual = sale.manualProducts ?? sale.manual_products ?? [];
  const cat = sale.products ?? [];
  if (manual.length === 0 && cat.length === 0) {
    return (
      <div className="text-[13px] text-[var(--color-text-dim)]">
        Esta venta no tiene productos registrados.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {cat.map((p, i) => (
        <div
          key={`cat-${i}`}
          className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 py-2 text-[13px]"
        >
          <div className="truncate text-[var(--color-text)]">
            {p.title ?? "Producto"}
          </div>
          <div className="flex items-center gap-3 text-[var(--color-text-dim)]">
            <span>×{p.quantity ?? 1}</span>
            <span className="font-semibold text-[var(--color-text)]">
              {currency.format(Number(p.price ?? 0))}
            </span>
          </div>
        </div>
      ))}
      {manual.map((m, i) => (
        <div
          key={`man-${i}`}
          className="flex items-center justify-between rounded-lg border border-dashed border-[var(--color-border)] px-3 py-2 text-[13px]"
        >
          <div className="truncate text-[var(--color-text)]">{m.title}</div>
          <div className="flex items-center gap-3 text-[var(--color-text-dim)]">
            <span>×{m.quantity}</span>
            <span className="font-semibold text-[var(--color-text)]">
              {currency.format(Number(m.price))}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function BuyerView({ sale }: { sale: LegacySale | null }) {
  if (!sale) return null;
  const u = sale.user;
  const o = sale.orders?.[0];
  const rows: { label: string; value: string | undefined }[] = [
    { label: "Nombre", value: u?.name ?? o?.buyer_name ?? undefined },
    { label: "Email", value: u?.email ?? o?.buyer_email ?? undefined },
    { label: "Teléfono", value: o?.buyer_phone ?? undefined },
  ];
  const hasAny = rows.some((r) => r.value);
  if (!hasAny)
    return (
      <div className="text-[13px] text-[var(--color-text-dim)]">
        Sin datos de comprador.
      </div>
    );
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div
          key={r.label}
          className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 py-2 text-[13px]"
        >
          <div className="text-[var(--color-text-dim)]">{r.label}</div>
          <div className="truncate font-medium text-[var(--color-text)]">
            {r.value ?? "—"}
          </div>
        </div>
      ))}
    </div>
  );
}
