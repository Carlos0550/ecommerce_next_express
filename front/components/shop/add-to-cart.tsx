"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cart.store";
import { Icon } from "@/components/brand";
import { formatARS, cn } from "@/lib/utils";
import { playAddToCartSound } from "@/lib/sound";
import type { Product } from "@/lib/types";

export function AddToCart({ product }: { product: Product }) {
  const router = useRouter();
  const add = useCartStore((s) => s.add);
  const inCart = useCartStore(
    (s) => s.items.find((i) => i.product_id === product.id)?.quantity ?? 0,
  );
  const stock = Number(product.stock) || 0;
  const outOfStock = stock <= 0 || product.state === "out_stock";
  const remaining = Math.max(0, stock - inCart);
  const maxAddable = Math.max(1, remaining);
  const [qty, setQty] = useState(1);
  const effectiveQty = Math.min(qty, maxAddable);
  const price = Number(product.price) || 0;
  const canAddMore = !outOfStock && remaining > 0;

  const handleAdd = () => {
    if (!canAddMore) return;
    if (qty > remaining) {
      toast.error(`Solo quedan ${remaining} unidades disponibles`);
      return;
    }
    add(product, effectiveQty);
    playAddToCartSound();
    toast.success("Agregado al carrito");
  };

  const inc = () => {
    setQty((q) => {
      if (q >= remaining) {
        toast.error(`Máximo disponible: ${remaining}`);
        return q;
      }
      return q + 1;
    });
  };

  const dec = () => setQty((q) => Math.max(1, q - 1));

  return (
    <>
      <div className="mt-5 flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 md:mt-6">
        <div className="flex flex-col">
          <span className="text-[13px] text-[var(--color-text-dim)]">Cantidad</span>
          {!outOfStock && (
            <span className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
              {inCart > 0
                ? `Stock: ${stock} · ${remaining} disponibles (${inCart} en carrito)`
                : `Stock disponible: ${stock}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={dec}
            disabled={qty <= 1 || !canAddMore}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-bg-input)] disabled:opacity-40"
          >
            <Icon name="minus" size={14} />
          </button>
          <span className="min-w-[20px] text-center font-grotesk text-[16px] font-semibold">
            {effectiveQty}
          </span>
          <button
            type="button"
            onClick={inc}
            disabled={!canAddMore || qty >= remaining}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-text)] text-[var(--color-bg)] disabled:opacity-40"
          >
            <Icon name="plus" size={14} />
          </button>
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-[68px] z-30 flex items-center gap-3 border-t border-[var(--color-border)] bg-[var(--color-bg-elev)]/95 px-4 py-3 backdrop-blur-md md:static md:mt-6 md:flex-row md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
      >
        <div className="md:hidden">
          <div className="text-[11px] text-[var(--color-text-dim)]">Total</div>
          <div className="font-grotesk text-[20px] font-semibold">
            {formatARS(price * effectiveQty)}
          </div>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAddMore}
          className={cn(
            "inline-flex h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl text-[14px] font-semibold md:h-12 md:rounded-xl",
            !canAddMore
              ? "bg-[var(--color-bg-input)] text-[var(--color-text-muted)]"
              : "bg-[var(--color-accent)] text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)]"
          )}
        >
          <Icon name="cart" size={15} />
          {outOfStock ? (
            "Sin stock"
          ) : remaining === 0 ? (
            "Ya agregaste todo el stock"
          ) : (
            <>
              Agregar al carrito{" "}
              <span className="hidden md:inline">· {formatARS(price * effectiveQty)}</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!canAddMore) return;
            if (qty > remaining) {
              toast.error(`Solo quedan ${remaining} unidades disponibles`);
              return;
            }
            add(product, effectiveQty);
            playAddToCartSound();
            router.push("/cart");
          }}
          disabled={!canAddMore}
          className="hidden h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-5 text-[13px] font-semibold hover:bg-[var(--color-bg-input)] disabled:opacity-50 md:inline-flex md:items-center"
        >
          Comprar ahora
        </button>
      </div>
    </>
  );
}
