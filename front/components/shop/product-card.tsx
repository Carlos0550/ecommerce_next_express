"use client";

import Link from "next/link";
import { ProductImg, Icon } from "@/components/brand";
import { formatARS } from "@/lib/utils";
import { useCartStore } from "@/stores/cart.store";
import { playAddToCartSound } from "@/lib/sound";
import type { Product } from "@/lib/types";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const img = product.images?.[0]?.url;
  const href = `/producto/${product.slug ?? product.id}`;
  const categoryLabel = product.category?.title;
  const add = useCartStore((s) => s.add);
  const outOfStock = (product.stock ?? 0) <= 0 || product.state === "out_stock";

  const handleAdd = () => {
    if (outOfStock) return;
    add(product, 1);
    playAddToCartSound();
  };

  return (
    <div className="group relative">
      <Link
        href={href}
        className="flex flex-col gap-2.5 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-2.5 text-left text-[var(--color-text)] transition hover:border-[var(--color-border-strong)]"
      >
        <div className="relative overflow-hidden rounded-[14px]">
          <ProductImg
            label={product.title}
            image={img}
            tone={index % 2 === 0 ? "accent" : "pink"}
            rounded={14}
          />
        </div>
        <div className="space-y-1 px-1">
          {categoryLabel && (
            <div className="text-[10px] uppercase tracking-[0.5px] text-[var(--color-text-dim)]">
              {categoryLabel}
            </div>
          )}
          <div className="line-clamp-2 text-[13px] font-medium leading-tight text-[var(--color-text)]">
            {product.title}
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="font-grotesk text-[15px] font-semibold text-[var(--color-text)]">
              {formatARS(Number(product.price))}
            </span>
            <span aria-hidden className="h-7 w-7" />
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={handleAdd}
        disabled={outOfStock}
        aria-label={outOfStock ? "Sin stock" : "Agregar al carrito"}
        className="absolute bottom-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-text)] text-[var(--color-bg)] shadow-sm transition hover:scale-110 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Icon name="plus" size={13} />
      </button>
    </div>
  );
}
