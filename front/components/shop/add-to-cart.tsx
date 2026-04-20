"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cart.store";
import { Icon } from "@/components/brand";
import { formatARS, cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

export function AddToCart({ product }: { product: Product }) {
  const router = useRouter();
  const add = useCartStore((s) => s.add);
  const [qty, setQty] = useState(1);
  const price = Number(product.price) || 0;
  const outOfStock = (product.stock ?? 0) <= 0 || product.state === "out_stock";

  const handleAdd = () => {
    if (outOfStock) return;
    add(product, qty);
    toast.success("Agregado al carrito");
  };

  return (
    <>
      <div className="mt-5 flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 md:mt-6">
        <span className="text-[13px] text-[var(--color-text-dim)]">Cantidad</span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-bg-input)]"
          >
            <Icon name="minus" size={14} />
          </button>
          <span className="min-w-[20px] text-center font-grotesk text-[16px] font-semibold">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-text)] text-[var(--color-bg)]"
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
            {formatARS(price * qty)}
          </div>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={outOfStock}
          className={cn(
            "inline-flex h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl text-[14px] font-semibold md:h-12 md:rounded-xl",
            outOfStock
              ? "bg-[var(--color-bg-input)] text-[var(--color-text-muted)]"
              : "bg-[var(--color-accent)] text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)]"
          )}
        >
          <Icon name="cart" size={15} />
          {outOfStock ? "Sin stock" : (
            <>Agregar al carrito <span className="hidden md:inline">· {formatARS(price * qty)}</span></>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            if (outOfStock) return;
            add(product, qty);
            router.push("/cart");
          }}
          disabled={outOfStock}
          className="hidden h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-5 text-[13px] font-semibold hover:bg-[var(--color-bg-input)] disabled:opacity-50 md:inline-flex md:items-center"
        >
          Comprar ahora
        </button>
      </div>
    </>
  );
}
