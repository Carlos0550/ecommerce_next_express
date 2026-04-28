"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, unwrapError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import { RequireCustomer } from "@/components/shop/require-customer";
import { Icon } from "@/components/brand";
import { formatARS } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  PENDING: "var(--color-warn)",
  PAID: "var(--color-success)",
  PROCESSING: "var(--color-accent)",
  SHIPPED: "var(--color-accent)",
  DELIVERED: "var(--color-success)",
  CANCELLED: "var(--color-danger)",
  REFUNDED: "var(--color-text-dim)",
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  PAID: "Pagada",
  PROCESSING: "Preparando",
  SHIPPED: "Enviada",
  DELIVERED: "Entregada",
  CANCELLED: "Cancelada",
  REFUNDED: "Reembolsada",
};

const PAYMENT_LABEL: Record<string, string> = {
  TRANSFERENCIA: "Transferencia",
  EFECTIVO: "Efectivo",
};

type SnapshotItem = {
  id?: string;
  title: string;
  price: number;
  quantity: number;
  options?: unknown;
};

type ShopOrder = {
  id: string;
  status: string;
  payment_method: string;
  total: number | string;
  subtotal?: number | string | null;
  items: SnapshotItem[] | null;
  transfer_receipt_path?: string | null;
  createdAt: string;
};

export default function OrdersPage() {
  return (
    <RequireCustomer>
      <OrdersContent />
    </RequireCustomer>
  );
}

function OrdersContent() {
  const token = useAuthStore((s) => s.token);
  const [openId, setOpenId] = useState<string | null>(null);
  const [receiptLoadingId, setReceiptLoadingId] = useState<string | null>(null);

  const ordersQ = useQuery({
    queryKey: ["shop", "orders"],
    enabled: !!token,
    queryFn: async () => {
      const { data } = await api.get<{ orders?: ShopOrder[] }>(
        "/orders?page=1&limit=20"
      );
      return data?.orders ?? [];
    },
  });

  const orders = ordersQ.data ?? [];

  const openReceipt = async (id: string) => {
    try {
      setReceiptLoadingId(id);
      const { data } = await api.get<{ ok: boolean; url?: string }>(
        `/orders/${id}/receipt`
      );
      if (data?.url) window.open(data.url, "_blank", "noopener");
      else toast.error("No se pudo abrir el comprobante");
    } catch (err) {
      toast.error(unwrapError(err));
    } finally {
      setReceiptLoadingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-12 pt-4 md:px-10 md:pt-8">
      <h1 className="font-grotesk text-[24px] font-semibold tracking-[-0.5px] md:text-[28px]">
        Mis órdenes
      </h1>
      <p className="mt-1 text-[13px] text-[var(--color-text-dim)]">
        {orders.length} pedidos en total
      </p>

      <div className="mt-5 flex flex-col gap-3">
        {ordersQ.isLoading && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-10 text-center text-sm text-[var(--color-text-dim)]">
            Cargando…
          </div>
        )}
        {!ordersQ.isLoading && orders.length === 0 && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-10 text-center text-sm text-[var(--color-text-dim)]">
            Todavía no tenés órdenes.
          </div>
        )}
        {orders.map((o) => {
          const color = STATUS_COLOR[o.status] ?? "var(--color-text-dim)";
          const items = Array.isArray(o.items) ? o.items : [];
          const isOpen = openId === o.id;
          const totalQty = items.reduce(
            (n, it) => n + Number(it.quantity || 0),
            0
          );
          const hasReceipt = !!o.transfer_receipt_path;
          const isTransfer =
            String(o.payment_method).toUpperCase() === "TRANSFERENCIA";
          return (
            <div
              key={o.id}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-mono text-[13px] font-semibold">
                    #{o.id}
                  </div>
                  <div className="mt-1 text-[12px] text-[var(--color-text-dim)]">
                    {new Date(o.createdAt).toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                    {" · "}
                    {totalQty} {totalQty === 1 ? "producto" : "productos"}
                    {" · "}
                    {PAYMENT_LABEL[String(o.payment_method).toUpperCase()] ??
                      o.payment_method}
                  </div>
                </div>
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{
                    background: `color-mix(in srgb, ${color} 18%, transparent)`,
                    color,
                  }}
                >
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
              </div>

              <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                <div className="flex flex-col gap-2">
                  {(isOpen ? items : items.slice(0, 2)).map((it, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-3 text-[13px]"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[var(--color-text)]">
                          {it.title}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--color-text-dim)]">
                          {it.quantity} × {formatARS(Number(it.price))}
                        </div>
                      </div>
                      <div className="shrink-0 font-grotesk text-[13px] font-semibold">
                        {formatARS(Number(it.price) * Number(it.quantity))}
                      </div>
                    </div>
                  ))}
                  {!isOpen && items.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setOpenId(o.id)}
                      className="self-start text-[12px] font-medium text-[var(--color-accent)] hover:underline"
                    >
                      Ver {items.length - 2} más
                    </button>
                  )}
                  {isOpen && items.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setOpenId(null)}
                      className="self-start text-[12px] font-medium text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                    >
                      Mostrar menos
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
                <div className="flex items-center gap-3">
                  {isTransfer && hasReceipt && (
                    <button
                      type="button"
                      onClick={() => openReceipt(o.id)}
                      disabled={receiptLoadingId === o.id}
                      className="inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-card)] disabled:opacity-60"
                    >
                      <Icon name="eye" size={12} />
                      {receiptLoadingId === o.id
                        ? "Abriendo…"
                        : "Ver comprobante"}
                    </button>
                  )}
                  {isTransfer && !hasReceipt && (
                    <span className="text-[11px] text-[var(--color-warn)]">
                      Sin comprobante
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.5px] text-[var(--color-text-dim)]">
                    Total
                  </div>
                  <div className="font-grotesk text-[18px] font-semibold">
                    {formatARS(Number(o.total))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
