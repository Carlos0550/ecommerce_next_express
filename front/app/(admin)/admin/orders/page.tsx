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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type OrderSummary = {
  id: string | number;
  status?: string;
  payment_method?: string;
  total?: string | number;
  buyer_email?: string;
  buyer_name?: string;
  buyer_phone?: string;
  transfer_receipt_path?: string | null;
};

type ProductSummary = {
  product_id?: number;
  quantity?: number;
  product?: { title?: string };
};

type SaleRow = {
  id: string | number;
  total: string | number;
  source: string;
  payment_method?: string;
  processed?: boolean;
  declined?: boolean;
  decline_reason?: string;
  created_at?: string;
  createdAt?: string;
  user?: { email?: string; name?: string } | null;
  products?: ProductSummary[];
  orders?: OrderSummary[];
};

type SalesResp = {
  success: boolean;
  sales: SaleRow[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

type Scope = "pending" | "all";

export default function AdminOrdersPage() {
  const qc = useQueryClient();
  const [scope, setScope] = useState<Scope>("pending");
  const [page, setPage] = useState(1);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineTarget, setDeclineTarget] = useState<SaleRow | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const salesQ = useQuery({
    queryKey: ["sales", "orders-admin", { scope, page }],
    queryFn: async () => {
      const start = new Date();
      start.setDate(start.getDate() - 90);
      const end = new Date();
      const fmt = (d: Date) => d.toISOString().slice(0, 10);

      const params = new URLSearchParams({
        page: String(page),
        per_page: "20",
        start_date: fmt(start),
        end_date: fmt(end),
      });
      if (scope === "pending") params.set("pending", "true");

      const { data } = await api.get<SalesResp>(`/sales?${params}`);
      return data;
    },
  });

  const sales = salesQ.data?.sales ?? [];
  const totalPages = salesQ.data?.pagination?.totalPages ?? 1;
  const total = salesQ.data?.pagination?.total ?? 0;

  const processMut = useMutation({
    mutationFn: async (id: SaleRow["id"]) => {
      await api.patch(`/sales/${id}/process`);
    },
    onSuccess: () => {
      toast.success("Orden procesada");
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const declineMut = useMutation({
    mutationFn: async ({ id, reason }: { id: SaleRow["id"]; reason: string }) => {
      await api.patch(`/sales/${id}/decline`, { reason });
    },
    onSuccess: () => {
      toast.success("Orden rechazada");
      setDeclineOpen(false);
      setDeclineReason("");
      setDeclineTarget(null);
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const viewReceipt = async (saleId: SaleRow["id"]) => {
    try {
      const { data } = await api.get<{ ok: boolean; url?: string }>(
        `/sales/${saleId}/receipt`
      );
      if (data.url) window.open(data.url, "_blank", "noopener");
      else toast.error("No se encontró el comprobante");
    } catch (err) {
      toast.error(unwrapError(err));
    }
  };

  const openDecline = (s: SaleRow) => {
    setDeclineTarget(s);
    setDeclineReason("");
    setDeclineOpen(true);
  };

  return (
    <AdminShell
      title="Órdenes"
      subtitle={`${total} ${scope === "pending" ? "pendientes" : "órdenes"} (últimos 90 días)`}
    >
      <div className="mb-3.5 flex items-center gap-2.5">
        <div className="inline-flex rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-1">
          {(
            [
              { id: "pending", label: "Pendientes" },
              { id: "all", label: "Todas" },
            ] as const
          ).map((o) => (
            <button
              key={o.id}
              onClick={() => {
                setScope(o.id);
                setPage(1);
              }}
              className={cn(
                "rounded-[8px] px-3 py-1.5 text-[12px] font-semibold transition",
                scope === o.id
                  ? "bg-[var(--color-bg-elev)] text-[var(--color-text)] shadow-sm"
                  : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {salesQ.isLoading && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-10 text-center text-sm text-[var(--color-text-dim)]">
          Cargando órdenes…
        </div>
      )}

      {!salesQ.isLoading && sales.length === 0 && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center">
          <div className="font-grotesk text-[16px] font-semibold text-[var(--color-text)]">
            {scope === "pending" ? "Sin órdenes pendientes" : "Sin órdenes"}
          </div>
          <div className="mt-1 text-[13px] text-[var(--color-text-dim)]">
            {scope === "pending"
              ? "Todo procesado. Cuando llegue un comprobante aparecerá acá."
              : "Ajustá el rango para ver más órdenes."}
          </div>
        </div>
      )}

      <div className="grid gap-3.5 lg:grid-cols-2">
        {sales.map((s) => {
          const order = s.orders?.[0];
          const method = (order?.payment_method ?? s.payment_method ?? "—").toUpperCase();
          const state = s.processed
            ? { bg: "var(--color-success)", label: "Procesada" }
            : s.declined
              ? { bg: "var(--color-danger)", label: "Rechazada" }
              : { bg: "var(--color-warn)", label: "Pendiente" };

          const buyerName =
            order?.buyer_name ?? s.user?.name ?? "Invitado";
          const buyerEmail = order?.buyer_email ?? s.user?.email ?? "—";
          const when = s.createdAt ?? s.created_at;
          const hasReceipt = !!order?.transfer_receipt_path;
          const isTransfer = method.includes("TRANSFER");

          return (
            <div
              key={s.id}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-grotesk text-[15px] font-semibold text-[var(--color-text)]">
                      #{s.id}
                    </span>
                    <span
                      className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: `color-mix(in srgb, ${state.bg} 18%, transparent)`,
                        color: state.bg,
                      }}
                    >
                      {state.label}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--color-text-dim)]">
                    {when
                      ? new Date(when).toLocaleString("es-AR")
                      : "—"}{" "}
                    · {s.source}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-grotesk text-[16px] font-semibold text-[var(--color-text)]">
                    {formatARS(Number(s.total))}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-dim)]">
                    {method}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-input)] p-2.5 text-[12px]">
                <div>
                  <div className="text-[10px] uppercase tracking-[1px] text-[var(--color-text-dim)]">
                    Cliente
                  </div>
                  <div className="truncate font-medium text-[var(--color-text)]">
                    {buyerName}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[1px] text-[var(--color-text-dim)]">
                    Email
                  </div>
                  <div className="truncate text-[var(--color-text-dim)]">
                    {buyerEmail}
                  </div>
                </div>
              </div>

              {s.products && s.products.length > 0 && (
                <div className="mt-2.5 text-[12px] text-[var(--color-text-dim)]">
                  <span className="text-[var(--color-text)]">
                    {s.products.length}
                  </span>{" "}
                  {s.products.length === 1 ? "producto" : "productos"} ·{" "}
                  {s.products
                    .slice(0, 2)
                    .map((p) => p.product?.title ?? `#${p.product_id}`)
                    .join(", ")}
                  {s.products.length > 2 ? "…" : ""}
                </div>
              )}

              {s.declined && s.decline_reason && (
                <div className="mt-2.5 rounded-md border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)] p-2 text-[11px] text-[var(--color-danger)]">
                  Motivo: {s.decline_reason}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {isTransfer && hasReceipt && (
                  <button
                    onClick={() => viewReceipt(s.id)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 text-[12px] font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-input)]"
                  >
                    <Icon name="eye" size={12} /> Ver comprobante
                  </button>
                )}
                {isTransfer && !hasReceipt && !s.processed && !s.declined && (
                  <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed border-[var(--color-border)] px-2.5 text-[11px] text-[var(--color-text-dim)]">
                    <Icon name="clock" size={12} /> Esperando comprobante
                  </span>
                )}
                <div className="flex-1" />
                {!s.processed && !s.declined && (
                  <>
                    <button
                      onClick={() => openDecline(s)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 text-[12px] font-medium text-[var(--color-danger)] hover:bg-[var(--color-bg-input)]"
                    >
                      <Icon name="close" size={12} /> Rechazar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Marcar orden #${s.id} como procesada?`)) {
                          processMut.mutate(s.id);
                        }
                      }}
                      disabled={processMut.isPending}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-2.5 text-[12px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
                    >
                      <Icon name="check" size={12} /> Procesar
                    </button>
                  </>
                )}
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

      <Dialog open={declineOpen} onOpenChange={(o) => !o && setDeclineOpen(false)}>
        <DialogContent className="sm:max-w-[440px] bg-[var(--color-bg-elev)] text-[var(--color-text)]">
          <DialogHeader>
            <DialogTitle className="font-grotesk text-[18px]">
              Rechazar orden #{declineTarget?.id}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-[12px] text-[var(--color-text-dim)]">
              El cliente verá este motivo. Es obligatorio.
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={3}
              placeholder="Ej: el comprobante no coincide con el monto."
              className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 py-2.5 text-[13px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
            />
          </div>
          <DialogFooter className="mt-2 flex-row gap-2">
            <button
              onClick={() => setDeclineOpen(false)}
              className="flex-1 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3.5 py-2.5 text-[13px] font-medium text-[var(--color-text)]"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                const reason = declineReason.trim();
                if (!reason) {
                  toast.error("Indicá un motivo");
                  return;
                }
                if (declineTarget) {
                  declineMut.mutate({ id: declineTarget.id, reason });
                }
              }}
              disabled={declineMut.isPending}
              className="flex-1 rounded-[10px] bg-[var(--color-danger)] px-3.5 py-2.5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {declineMut.isPending ? "Enviando…" : "Confirmar rechazo"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
