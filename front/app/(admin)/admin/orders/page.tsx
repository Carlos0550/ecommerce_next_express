"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, unwrapError } from "@/lib/api";
import { cn, formatARS } from "@/lib/utils";
import { AdminShell } from "@/components/admin/admin-shell";
import { Icon } from "@/components/brand";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

type ItemSnapshot = {
  id?: string;
  title?: string;
  price?: number | string;
  quantity?: number;
  options?: Array<{ name?: string; value?: string; values?: string[] }>;
};

type AdminOrder = {
  id: string;
  status: OrderStatus;
  payment_method: string;
  total: string | number;
  subtotal?: string | number | null;
  buyer_email?: string | null;
  buyer_name?: string | null;
  buyer_phone?: string | null;
  buyer_street?: string | null;
  buyer_city?: string | null;
  buyer_postal_code?: string | null;
  buyer_province?: string | null;
  transfer_receipt_path?: string | null;
  saleId?: string | null;
  created_at: string;
  items: ItemSnapshot[];
  user?: { id: number; name?: string | null; email?: string | null } | null;
  sale?: {
    id: string;
    source: "CAJA" | "WEB";
    payment_method: string;
  } | null;
};

type OrdersResp = {
  ok: boolean;
  orders: AdminOrder[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

const STATUS_FILTERS: { id: OrderStatus | "ALL"; label: string }[] = [
  { id: "PENDING", label: "Pendientes" },
  { id: "PAID", label: "Pagadas" },
  { id: "PROCESSING", label: "En preparación" },
  { id: "SHIPPED", label: "Enviadas" },
  { id: "DELIVERED", label: "Entregadas" },
  { id: "CANCELLED", label: "Canceladas" },
  { id: "REFUNDED", label: "Reembolsadas" },
  { id: "ALL", label: "Todas" },
];

const STATUS_OPTIONS: { id: OrderStatus; label: string }[] = [
  { id: "PENDING", label: "Pendiente" },
  { id: "PAID", label: "Pagada" },
  { id: "PROCESSING", label: "En preparación" },
  { id: "SHIPPED", label: "Enviada" },
  { id: "DELIVERED", label: "Entregada" },
  { id: "CANCELLED", label: "Cancelada" },
  { id: "REFUNDED", label: "Reembolsada" },
];

const STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING: "var(--color-warn)",
  PAID: "var(--color-accent)",
  PROCESSING: "var(--color-accent)",
  SHIPPED: "var(--color-accent-strong)",
  DELIVERED: "var(--color-success)",
  CANCELLED: "var(--color-danger)",
  REFUNDED: "var(--color-text-dim)",
};

const STATUS_LABEL: Record<OrderStatus, string> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.id, s.label])
) as Record<OrderStatus, string>;

export default function AdminOrdersPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<OrderStatus | "ALL">("PENDING");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [itemsTarget, setItemsTarget] = useState<AdminOrder | null>(null);

  const ordersQ = useQuery({
    queryKey: ["orders", "admin", { status, page, q }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        status,
      });
      if (q.trim()) params.set("q", q.trim());
      const { data } = await api.get<OrdersResp>(`/orders/admin?${params}`);
      return data;
    },
  });

  const orders = ordersQ.data?.orders ?? [];
  const totalPages = ordersQ.data?.pagination?.totalPages ?? 1;
  const total = ordersQ.data?.pagination?.total ?? 0;

  const updateStatus = useMutation({
    mutationFn: async (vars: { id: string; status: OrderStatus }) => {
      await api.patch(`/orders/${vars.id}/status`, { status: vars.status });
    },
    onSuccess: () => {
      toast.success("Estado actualizado");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const bulkUpdate = useMutation({
    mutationFn: async (vars: { ids: string[]; status: OrderStatus }) => {
      const results = await Promise.allSettled(
        vars.ids.map((id) =>
          api.patch(`/orders/${id}/status`, { status: vars.status })
        )
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      return { ok: vars.ids.length - failed, failed };
    },
    onSuccess: ({ ok, failed }) => {
      if (ok > 0) toast.success(`${ok} orden(es) actualizada(s)`);
      if (failed > 0) toast.error(`${failed} fallaron`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const toggle = (id: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allVisibleSelected =
    orders.length > 0 && orders.every((o) => selected.has(o.id));
  const toggleAll = () =>
    setSelected((cur) => {
      if (allVisibleSelected) {
        const next = new Set(cur);
        orders.forEach((o) => next.delete(o.id));
        return next;
      }
      const next = new Set(cur);
      orders.forEach((o) => next.add(o.id));
      return next;
    });

  const viewReceipt = async (orderId: string) => {
    try {
      const { data } = await api.get<{ ok: boolean; url?: string }>(
        `/orders/${orderId}/receipt`
      );
      if (data.url) window.open(data.url, "_blank", "noopener");
      else toast.error("No se encontró el comprobante");
    } catch (err) {
      toast.error(unwrapError(err));
    }
  };

  return (
    <AdminShell
      title="Órdenes"
      subtitle={`${total} ${status === "ALL" ? "órdenes" : STATUS_LABEL[status as OrderStatus]?.toLowerCase() ?? "órdenes"}`}
    >
      <div className="mb-3.5 flex flex-col gap-2.5 md:flex-row md:flex-wrap md:items-center">
        <div className="-mx-1 flex gap-1 overflow-x-auto rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-1 md:mx-0 md:inline-flex md:flex-wrap md:overflow-visible">
          {STATUS_FILTERS.map((o) => (
            <button
              key={o.id}
              onClick={() => {
                setStatus(o.id);
                setPage(1);
              }}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-[8px] px-3 py-1.5 text-[12px] font-semibold transition",
                status === o.id
                  ? "bg-[var(--color-bg-elev)] text-[var(--color-text)] shadow-sm"
                  : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:ml-auto md:w-64">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por ID, email, nombre…"
            className="h-9 w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] pl-8 pr-3 text-[12px] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
          />
          <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]">
            <Icon name="search" size={13} />
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3.5 py-2 text-[12px]">
        <label className="flex items-center gap-2 text-[var(--color-text-dim)]">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={toggleAll}
            disabled={orders.length === 0}
            className="h-3.5 w-3.5 cursor-pointer accent-[var(--color-accent)]"
          />
          {selected.size > 0
            ? `${selected.size} seleccionada(s)`
            : "Seleccionar todas"}
        </label>
        {selected.size > 0 && (
          <>
            <div className="mx-1 h-4 w-px bg-[var(--color-border)]" />
            <label className="flex items-center gap-2">
              Cambiar estado a
              <select
                disabled={bulkUpdate.isPending}
                defaultValue=""
                onChange={(e) => {
                  const value = e.target.value as OrderStatus | "";
                  if (!value) return;
                  bulkUpdate.mutate({
                    ids: Array.from(selected),
                    status: value,
                  });
                  e.target.value = "";
                }}
                className="h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-input)] px-2 text-[12px] font-medium text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
              >
                <option value="" disabled>
                  Elegir…
                </option>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => setSelected(new Set())}
              disabled={bulkUpdate.isPending}
              className="ml-auto rounded-md border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-dim)] hover:bg-[var(--color-bg-input)] disabled:opacity-60"
            >
              Limpiar
            </button>
          </>
        )}
      </div>

      {ordersQ.isLoading && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-10 text-center text-sm text-[var(--color-text-dim)]">
          Cargando órdenes…
        </div>
      )}

      {!ordersQ.isLoading && orders.length === 0 && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center">
          <div className="font-grotesk text-[16px] font-semibold text-[var(--color-text)]">
            Sin órdenes
          </div>
          <div className="mt-1 text-[13px] text-[var(--color-text-dim)]">
            No hay órdenes en este estado.
          </div>
        </div>
      )}

      <div className="grid gap-3.5 lg:grid-cols-2">
        {orders.map((o) => {
          const color = STATUS_COLOR[o.status];
          const label = STATUS_LABEL[o.status] ?? o.status;
          const isTransfer = String(o.payment_method).toUpperCase().includes("TRANSFER");
          const hasReceipt = !!o.transfer_receipt_path;
          const itemsArr = Array.isArray(o.items) ? o.items : [];

          const checked = selected.has(o.id);
          return (
            <div
              key={o.id}
              className={cn(
                "rounded-2xl border bg-[var(--color-bg-card)] p-4 transition",
                checked
                  ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_6%,var(--color-bg-card))]"
                  : "border-[var(--color-border)]"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(o.id)}
                      aria-label={`Seleccionar ${o.id}`}
                      className="h-3.5 w-3.5 cursor-pointer accent-[var(--color-accent)]"
                    />
                    <span className="font-grotesk text-[15px] font-semibold text-[var(--color-text)]">
                      #{o.id}
                    </span>
                    <span
                      className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: `color-mix(in srgb, ${color} 18%, transparent)`,
                        color,
                      }}
                    >
                      {label}
                    </span>
                    {o.sale?.source && (
                      <span className="rounded-md bg-[var(--color-bg-input)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-dim)]">
                        {o.sale.source}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--color-text-dim)]">
                    {new Date(o.created_at).toLocaleString("es-AR")} ·{" "}
                    {o.payment_method}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-grotesk text-[16px] font-semibold text-[var(--color-text)]">
                    {formatARS(Number(o.total))}
                  </div>
                  {o.saleId && (
                    <div className="text-[10px] text-[var(--color-text-dim)]">
                      venta #{o.saleId}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-input)] p-2.5 text-[12px] md:grid-cols-3">
                <Field
                  label="Cliente"
                  value={o.buyer_name ?? o.user?.name ?? "Invitado"}
                  emphasis
                />
                <Field
                  label="Email"
                  value={o.buyer_email ?? o.user?.email ?? "—"}
                />
                <Field label="Teléfono" value={o.buyer_phone ?? "—"} />
                <Field
                  label="Dirección"
                  value={o.buyer_street ?? "—"}
                  className="md:col-span-2"
                />
                <Field label="Ciudad" value={o.buyer_city ?? "—"} />
                <Field label="Código postal" value={o.buyer_postal_code ?? "—"} />
                {o.buyer_province && (
                  <Field label="Provincia" value={o.buyer_province} />
                )}
              </div>

              {itemsArr.length > 0 && (
                <div className="mt-2.5 text-[12px] text-[var(--color-text-dim)]">
                  <span className="text-[var(--color-text)]">
                    {itemsArr.length}
                  </span>{" "}
                  {itemsArr.length === 1 ? "producto" : "productos"} ·{" "}
                  {itemsArr
                    .slice(0, 2)
                    .map((it) => it.title ?? `#${it.id}`)
                    .join(", ")}
                  {itemsArr.length > 2 ? "…" : ""}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setItemsTarget(o)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 text-[12px] font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-input)]"
                >
                  <Icon name="package" size={12} /> Ver items
                </button>
                {isTransfer && hasReceipt && (
                  <button
                    onClick={() => viewReceipt(o.id)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 text-[12px] font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-input)]"
                  >
                    <Icon name="eye" size={12} /> Comprobante
                  </button>
                )}
                <div className="flex-1" />
                <label className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-dim)]">
                  Estado
                  <select
                    value={o.status}
                    disabled={updateStatus.isPending}
                    onChange={(e) =>
                      updateStatus.mutate({
                        id: o.id,
                        status: e.target.value as OrderStatus,
                      })
                    }
                    className="h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-input)] px-2 text-[12px] font-medium text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
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

      <Dialog
        open={!!itemsTarget}
        onOpenChange={(o) => !o && setItemsTarget(null)}
      >
        <DialogContent className="sm:max-w-[520px] bg-[var(--color-bg-elev)] text-[var(--color-text)]">
          <DialogHeader>
            <DialogTitle className="font-grotesk text-[17px]">
              Items de la orden #{itemsTarget?.id}
            </DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
            {(Array.isArray(itemsTarget?.items) ? itemsTarget!.items : []).map(
              (it, i) => {
                const qty = Number(it.quantity) || 1;
                const unit = Number(it.price) || 0;
                const lineTotal = unit * qty;
                const opts = Array.isArray(it.options)
                  ? it.options
                      .map(
                        (op) =>
                          `${op.name ?? ""}: ${op.value ?? (Array.isArray(op.values) ? op.values.join("/") : "")}`
                      )
                      .filter((s) => s.trim().length > 2)
                  : [];
                return (
                  <div
                    key={`${it.id ?? i}-${i}`}
                    className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-2.5"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium text-[var(--color-text)]">
                        {it.title ?? `#${it.id ?? "—"}`}
                      </div>
                      <div className="text-[11px] text-[var(--color-text-dim)]">
                        {qty} × {formatARS(unit)}
                        {opts.length > 0 ? ` · ${opts.join(", ")}` : ""}
                      </div>
                    </div>
                    <div className="font-grotesk text-[13px] font-semibold text-[var(--color-text)]">
                      {formatARS(lineTotal)}
                    </div>
                  </div>
                );
              }
            )}
            {(!itemsTarget?.items ||
              (Array.isArray(itemsTarget.items) &&
                itemsTarget.items.length === 0)) && (
              <div className="rounded-[10px] border border-dashed border-[var(--color-border)] p-4 text-center text-[12px] text-[var(--color-text-dim)]">
                Esta orden no tiene items registrados.
              </div>
            )}
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-[13px]">
            <span className="text-[var(--color-text-dim)]">Total</span>
            <span className="font-grotesk font-semibold text-[var(--color-text)]">
              {formatARS(Number(itemsTarget?.total ?? 0))}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

function Field({
  label,
  value,
  emphasis,
  className,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-[10px] uppercase tracking-[1px] text-[var(--color-text-dim)]">
        {label}
      </div>
      <div
        className={cn(
          "truncate",
          emphasis
            ? "font-medium text-[var(--color-text)]"
            : "text-[var(--color-text-dim)]"
        )}
      >
        {value}
      </div>
    </div>
  );
}
