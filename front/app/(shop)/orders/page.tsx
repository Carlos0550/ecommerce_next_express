"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, unwrapError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import { Icon } from "@/components/brand";
import { RequireCustomer } from "@/components/shop/require-customer";
import { formatARS, cn } from "@/lib/utils";
import type { Order } from "@/lib/types";

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

export default function OrdersPage() {
  return (
    <RequireCustomer>
      <OrdersContent />
    </RequireCustomer>
  );
}

function OrdersContent() {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploadOrderId, setUploadOrderId] = useState<number | null>(null);

  const ordersQ = useQuery({
    queryKey: ["shop", "orders"],
    enabled: !!token,
    queryFn: async () => {
      const { data } = await api.get<{ orders?: Order[] } & { data?: Order[] }>(
        "/orders?page=1&limit=20"
      );
      return data?.orders ?? data?.data ?? [];
    },
  });

  const uploadMut = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post(`/orders/${id}/receipt`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: () => {
      toast.success("Comprobante enviado");
      qc.invalidateQueries({ queryKey: ["shop", "orders"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const orders = ordersQ.data ?? [];

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
          const isTransfer = String(o.payment_method).toUpperCase() === "TRANSFERENCIA";
          const needsReceipt = isTransfer && !o.receipt_url && o.status === "PENDING";
          return (
            <div
              key={o.id}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[13px] font-semibold">
                    #{o.id}
                  </div>
                  <div className="mt-1 text-[12px] text-[var(--color-text-dim)]">
                    {new Date(o.createdAt).toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                    {o.items ? ` · ${o.items.length} productos` : ""}
                  </div>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{
                    background: `color-mix(in srgb, ${color} 18%, transparent)`,
                    color,
                  }}
                >
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-4">
                <span className="font-grotesk text-[18px] font-semibold">
                  {formatARS(Number(o.total))}
                </span>
                {needsReceipt && (
                  <button
                    type="button"
                    onClick={() => {
                      setUploadOrderId(o.id);
                      fileInput.current?.click();
                    }}
                    disabled={uploadMut.isPending}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-accent)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
                    )}
                  >
                    <Icon name="upload" size={12} /> Subir comprobante
                  </button>
                )}
                {o.receipt_url && (
                  <span className="text-[11px] font-semibold text-[var(--color-success)]">
                    Comprobante enviado
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && uploadOrderId != null) {
            uploadMut.mutate({ id: uploadOrderId, file: f });
          }
          if (fileInput.current) fileInput.current.value = "";
        }}
      />
    </div>
  );
}
