"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api, unwrapError } from "@/lib/api";
import { AdminShell } from "@/components/admin/admin-shell";
import { ProductForm } from "@/components/admin/product-form";
import type { Category, Product } from "@/lib/types";

type ProductDetailResponse = {
  ok: boolean;
  product: Product;
};

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const productQ = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data } = await api.get<ProductDetailResponse>(`/products/public/${id}`);
      return data.product;
    },
  });

  const categoriesQ = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await api.get<{
        ok: boolean;
        data?: Category[];
        categories?: Category[];
      }>("/products/categories");
      return data.data ?? data.categories ?? [];
    },
  });

  return (
    <AdminShell
      title={productQ.data ? `Editar "${productQ.data.title}"` : "Editar producto"}
      subtitle={productQ.data ? `ID: ${productQ.data.id}` : "Cargando…"}
      actions={
        <Link
          href="/admin/products"
          className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-[12px] font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-input)]"
        >
          <ArrowLeft size={14} />
          Volver
        </Link>
      }
    >
      <div className="mx-auto flex max-w-[1100px] flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-text-dim)]">
          <Link
            href="/admin/products"
            className="hover:text-[var(--color-text)]"
          >
            Productos
          </Link>
          <span>/</span>
          <span className="text-[var(--color-text)]">Editar</span>
        </div>

        {productQ.isError && (
          <div className="rounded-[10px] border border-[var(--color-danger)] bg-[color-mix(in_srgb,var(--color-danger)_12%,var(--color-bg-card))] px-3.5 py-2.5 text-[12px] font-medium text-[var(--color-danger)]">
            No se pudo cargar el producto: {unwrapError(productQ.error)}
          </div>
        )}

        {productQ.isLoading && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center text-[13px] text-[var(--color-text-dim)]">
            Cargando producto…
          </div>
        )}

        {productQ.data && (
          <ProductForm
            key={productQ.data.id}
            mode="edit"
            product={productQ.data}
            categories={categoriesQ.data ?? []}
            onSuccessRedirect="/admin/products"
          />
        )}
      </div>
    </AdminShell>
  );
}