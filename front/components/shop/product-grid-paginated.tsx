"use client";

import { useState } from "react";
import { ProductCard } from "@/components/shop/product-card";
import { API_URL } from "@/lib/api";
import type { Product } from "@/lib/types";

type Props = {
  initialProducts: Product[];
  initialHasMore: boolean;
  limit?: number;
  categoryId?: string | number;
  title?: string;
};

function normalizeImages<T extends { images?: unknown }>(p: T): T {
  const raw = (p as any)?.images;
  if (Array.isArray(raw)) {
    (p as any).images = raw.map((im: any, i: number) =>
      typeof im === "string" ? { id: `${i}`, url: im } : im,
    );
  }
  return p;
}

export function ProductGridPaginated({
  initialProducts,
  initialHasMore,
  limit = 24,
  categoryId,
  title,
}: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    try {
      const nextPage = page + 1;
      const qs = new URLSearchParams();
      qs.set("page", String(nextPage));
      qs.set("limit", String(limit));
      if (categoryId) qs.set("categoryId", String(categoryId));
      if (title) qs.set("title", title);
      const res = await fetch(`${API_URL}/products/public?${qs.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list: Product[] = data?.data?.products ?? data?.products ?? [];
      const pag = data?.data?.pagination ?? data?.pagination ?? {};
      setProducts((prev) => [...prev, ...list.map(normalizeImages)]);
      setPage(nextPage);
      setHasMore(Boolean(pag.hasNextPage));
    } catch (e) {
      setError("No pudimos cargar más productos. Reintentá.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} />
        ))}
      </div>
      {(hasMore || error) && (
        <div className="mt-8 flex flex-col items-center gap-2">
          {error && (
            <p className="text-[12px] text-[var(--color-text-dim)]">{error}</p>
          )}
          {hasMore && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-card)] px-5 text-[13px] font-medium tracking-[-0.1px] text-[var(--color-text)] transition hover:bg-[var(--color-bg-muted,var(--color-bg-card))] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Cargando…" : "Ver más"}
            </button>
          )}
        </div>
      )}
    </>
  );
}
