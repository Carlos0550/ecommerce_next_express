"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, unwrapError } from "@/lib/api";
import { cn, playNotificationSound } from "@/lib/utils";
import { Icon, type IconName } from "@/components/brand";
import type { Product } from "@/lib/types";
import type { LegacySale } from "./sales-table-legacy";

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: IconName }[] = [
  { value: "EFECTIVO", label: "Efectivo", icon: "cash" },
  { value: "TARJETA", label: "Tarjeta", icon: "card" },
  { value: "QR", label: "QR / MP", icon: "qr" },
  { value: "TRANSFERENCIA", label: "Transferencia", icon: "arrow" },
  { value: "NINGUNO", label: "Ninguno", icon: "close" },
];
type PaymentMethod =
  | "TARJETA"
  | "EFECTIVO"
  | "QR"
  | "NINGUNO"
  | "TRANSFERENCIA";

type SaleSource = "WEB" | "CAJA";

type ManualItem = { quantity: number; title: string; price: number };

type Mode = "catalog" | "manual";

function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseManual(text: string): { items: ManualItem[]; invalid: number } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const re = /^(\d+)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s-]+?)\s+(\d+(?:\.\d+)?)$/;
  const items: ManualItem[] = [];
  let invalid = 0;
  for (const line of lines) {
    const m = line.match(re);
    if (!m) {
      invalid++;
      continue;
    }
    const quantity = Number(m[1]);
    const title = m[2].trim();
    const price = Number(m[3]);
    if (!Number.isFinite(quantity) || !Number.isFinite(price)) {
      invalid++;
      continue;
    }
    items.push({ quantity, title, price });
  }
  return { items, invalid };
}

type Props = {
  sale?: LegacySale;
  onClose: () => void;
};

type ProductsResp = {
  ok: boolean;
  data: {
    products: Product[];
    pagination?: unknown;
  };
};

export function SalesFormLegacy({ sale, onClose }: Props) {
  const qc = useQueryClient();
  const isEdit = Boolean(sale?.id);

  const [mode, setMode] = useState<Mode>(() =>
    sale ? (sale.loadedManually === false ? "catalog" : "manual") : "manual",
  );
  const [source, setSource] = useState<SaleSource>(
    () => ((sale?.source as SaleSource) ?? "CAJA") as SaleSource,
  );
  const [tax, setTax] = useState<number>(() => Number(sale?.tax ?? 0));
  const [saleDate, setSaleDate] = useState<string>(() =>
    sale?.created_at
      ? formatDateOnly(new Date(sale.created_at))
      : sale?.createdAt
        ? formatDateOnly(new Date(sale.createdAt))
        : formatDateOnly(new Date()),
  );

  const [manualText, setManualText] = useState<string>(() => {
    const list = sale?.manualProducts ?? sale?.manual_products ?? [];
    return list
      .map((m) => `${m.quantity} ${m.title} ${m.price}`)
      .join("\n");
  });
  const { items: manualItems, invalid: manualInvalid } = useMemo(
    () => parseManual(manualText),
    [manualText],
  );

  const [selectedProducts, setSelectedProducts] = useState<Product[]>(() =>
    (sale?.products ?? []).map(
      (p) =>
        ({
          id: Number(p.id) || 0,
          title: p.title ?? "Producto",
          price: Number(p.price ?? 0),
          stock: 0,
          category_id: 0,
        }) as Product,
    ),
  );

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => {
    const fromArr = sale?.paymentMethods?.[0]?.method as
      | PaymentMethod
      | undefined;
    const fromField = sale?.payment_method as PaymentMethod | undefined;
    return fromArr ?? fromField ?? "EFECTIVO";
  });

  const [search, setSearch] = useState("");
  const productsQ = useQuery<ProductsResp>({
    queryKey: ["products", "sales-form", { search }],
    enabled: mode === "catalog",
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", limit: "20" });
      if (search.trim()) params.set("title", search.trim());
      const { data } = await api.get<ProductsResp>(
        `/products?${params.toString()}`,
      );
      return data;
    },
  });

  const catalogProducts = productsQ.data?.data?.products ?? [];

  const addProduct = (id: number) => {
    const found = catalogProducts.find((p) => Number(p.id) === id);
    if (!found) return;
    setSelectedProducts((prev) =>
      prev.some((p) => Number(p.id) === id) ? prev : [...prev, found],
    );
  };
  const removeProduct = (id: number) =>
    setSelectedProducts((prev) => prev.filter((p) => Number(p.id) !== id));

  const effectiveTax =
    paymentMethod === "EFECTIVO" || paymentMethod === "NINGUNO" ? 0 : tax;

  const subtotalCatalog = selectedProducts.reduce(
    (acc, p) => acc + Number(p.price || 0),
    0,
  );
  const subtotalManual = manualItems.reduce(
    (acc, it) => acc + it.quantity * it.price,
    0,
  );
  const subtotal = mode === "manual" ? subtotalManual : subtotalCatalog;
  const finalTotal = subtotal * (1 + effectiveTax / 100);

  const saveMut = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      if (isEdit && sale?.id != null) {
        const { data } = await api.put(`/sales/${sale.id}`, body);
        return data;
      }
      const { data } = await api.post(`/sales/save`, body);
      return data;
    },
    onSuccess: () => {
      toast.success(isEdit ? "Venta actualizada" : "Venta registrada");
      if (!isEdit) playNotificationSound();
      qc.invalidateQueries({ queryKey: ["sales"] });
      onClose();
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const canSubmit =
    !saveMut.isPending &&
    ((mode === "catalog" && selectedProducts.length > 0) ||
      (mode === "manual" && manualItems.length > 0 && manualInvalid === 0));

  const handleSubmit = () => {
    const base: Record<string, unknown> = {
      payment_method: paymentMethod,
      source,
      tax: effectiveTax,
      sale_date: saleDate,
      loadedManually: mode === "manual",
    };
    if (mode === "catalog") {
      base.product_ids = selectedProducts.map((p) => String(p.id));
      base.manualProducts = [];
    } else {
      base.manualProducts = manualItems;
      base.product_ids = [];
    }
    saveMut.mutate(base);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-1">
          {(["catalog", "manual"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[12px] font-semibold transition",
                mode === m
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--color-text-dim)] hover:bg-[var(--color-bg-input)]",
              )}
            >
              {m === "catalog" ? "Catálogo" : "Manual"}
            </button>
          ))}
        </div>

        <div className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-1">
          {(["CAJA", "WEB"] as SaleSource[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSource(s)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[12px] font-semibold transition",
                source === s
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--color-text-dim)] hover:bg-[var(--color-bg-input)]",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
          <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[var(--color-text)]">
            <Icon name="box" size={14} /> Productos
          </div>

          {mode === "catalog" ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar producto…"
                  className="h-9 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 text-[13px] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              <div className="max-h-56 overflow-y-auto rounded-lg border border-[var(--color-border)]">
                {productsQ.isLoading && (
                  <div className="p-3 text-center text-[12px] text-[var(--color-text-dim)]">
                    Cargando…
                  </div>
                )}
                {!productsQ.isLoading && catalogProducts.length === 0 && (
                  <div className="p-3 text-center text-[12px] text-[var(--color-text-dim)]">
                    Sin resultados.
                  </div>
                )}
                {catalogProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProduct(Number(p.id))}
                    className="flex w-full items-center justify-between border-b border-[var(--color-border)] px-3 py-2 text-left text-[13px] last:border-b-0 hover:bg-[var(--color-bg-input)]"
                  >
                    <span className="truncate text-[var(--color-text)]">
                      {p.title}
                    </span>
                    <span className="ml-2 shrink-0 text-[var(--color-text-dim)]">
                      ${Number(p.price ?? 0).toLocaleString("es-AR")}
                    </span>
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
                  Seleccionados ({selectedProducts.length})
                </div>
                {selectedProducts.length === 0 && (
                  <div className="rounded-lg border border-dashed border-[var(--color-border)] p-3 text-center text-[12px] text-[var(--color-text-dim)]">
                    Sin productos agregados.
                  </div>
                )}
                {selectedProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 py-2 text-[13px]"
                  >
                    <span className="truncate text-[var(--color-text)]">
                      {p.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--color-text-dim)]">
                        ${Number(p.price ?? 0).toLocaleString("es-AR")}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeProduct(Number(p.id))}
                        className="text-[var(--color-danger)] hover:brightness-110"
                        aria-label="Quitar"
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
                Una línea por producto. Formato:{" "}
                <code className="rounded bg-[var(--color-bg-input)] px-1">
                  cantidad título precio
                </code>
              </label>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                rows={8}
                placeholder="2 Pan lactal 500&#10;1 Mermelada 1200"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] p-3 font-mono text-[12px] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
              />
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--color-text-dim)]">
                  {manualItems.length} ítem(s) válidos
                </span>
                {manualInvalid > 0 && (
                  <span className="text-[var(--color-danger)]">
                    {manualInvalid} línea(s) inválidas
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
            <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[var(--color-text)]">
              <Icon name="calendar" size={14} /> Datos generales
            </div>
            <div className="space-y-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
                  Fecha
                </span>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 text-[13px] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
                  Tax / recargo (%)
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={tax}
                  onChange={(e) => setTax(Number(e.target.value) || 0)}
                  disabled={
                    paymentMethod === "EFECTIVO" || paymentMethod === "NINGUNO"
                  }
                  className="h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 text-[13px] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
                />
                {(paymentMethod === "EFECTIVO" ||
                  paymentMethod === "NINGUNO") && (
                  <span className="mt-1 block text-[10px] text-[var(--color-text-dim)]">
                    Sin tax con método principal {paymentMethod}.
                  </span>
                )}
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
            <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[var(--color-text)]">
              <Icon name="card" size={14} /> Método de pago
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setPaymentMethod(m.value)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-[10px] border px-2 py-2 text-[12px] font-semibold transition",
                    paymentMethod === m.value
                      ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_15%,transparent)] text-[var(--color-accent)]"
                      : "border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]",
                  )}
                >
                  <Icon name={m.icon} size={13} />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)] p-4">
            <div className="space-y-1.5 text-[13px]">
              <Row label="Subtotal" value={subtotal} />
              {effectiveTax > 0 && (
                <Row
                  label={`Tax (${effectiveTax}%)`}
                  value={finalTotal - subtotal}
                />
              )}
              <Row label="Total" value={finalTotal} strong />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-[10px] border border-[var(--color-border)] px-4 py-2 text-[13px] font-medium text-[var(--color-text-dim)] hover:bg-[var(--color-bg-input)]"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-4 py-2 text-[13px] font-semibold text-white hover:brightness-110 disabled:opacity-60"
        >
          <Icon name="check" size={13} />
          {isEdit ? "Guardar cambios" : "Registrar venta"}
        </button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  color,
}: {
  label: string;
  value: number;
  strong?: boolean;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--color-text-dim)]">{label}</span>
      <span
        className={cn(strong ? "font-grotesk text-[16px] font-semibold" : "")}
        style={{ color: color ?? "var(--color-text)" }}
      >
        ${value.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}
