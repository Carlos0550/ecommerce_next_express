"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api, unwrapError } from "@/lib/api";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  ProductForm,
  type ProductDraftSeed,
} from "@/components/admin/product-form";
import type { Category } from "@/lib/types";

export default function NewProductPage() {
  return (
    <Suspense fallback={null}>
      <NewProductPageInner />
    </Suspense>
  );
}

function NewProductPageInner() {
  const searchParams = useSearchParams();
  const draftTempId = searchParams.get("draft");

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

  const draftQ = useQuery({
    queryKey: ["product-draft", draftTempId],
    enabled: !!draftTempId,
    queryFn: async () => {
      const { data } = await api.get<{
        ok: boolean;
        draft: {
          tempId: string;
          title: string;
          description?: string;
          price: string | number;
          stock: string | number;
          category_id?: string;
          sku?: string;
          createdAt?: number;
        };
      }>(`/products/draft/${draftTempId}`);
      const d = data.draft;
      return {
        tempId: d.tempId,
        title: d.title,
        description: d.description,
        price: d.price,
        stock: d.stock,
        category_id: d.category_id,
        sku: d.sku,
        createdAt: d.createdAt,
        imageUrl: `/products/draft/${d.tempId}/image`,
      } satisfies ProductDraftSeed;
    },
  });

  const draftErrorMessage = draftQ.isError ? unwrapError(draftQ.error) : null;

  const subtitle = draftTempId
    ? "Recuperando borrador"
    : "Carga un producto individual";

  return (
    <AdminShell
      title="Nuevo producto"
      subtitle={subtitle}
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
        {draftErrorMessage && (
          <div className="rounded-[10px] border border-[var(--color-warning)] bg-[color-mix(in_srgb,var(--color-warning)_12%,var(--color-bg-card))] px-3.5 py-2.5 text-[12px] font-medium text-[var(--color-warning)]">
            No se pudo recuperar el borrador: {draftErrorMessage}. Podés crear
            el producto desde cero.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-text-dim)]">
          <Link
            href="/admin/products"
            className="hover:text-[var(--color-text)]"
          >
            Productos
          </Link>
          <span>/</span>
          <span className="text-[var(--color-text)]">Nuevo</span>
          <div className="flex-1" />
          <Link
            href="/admin/products/new/bulk"
            className="text-[var(--color-accent)] hover:underline"
          >
            ¿Querés cargar varios a la vez? Usá carga masiva →
          </Link>
        </div>

        {(!draftTempId || draftQ.isSuccess) && (
          <ProductForm
            key={draftQ.data?.tempId ?? draftTempId ?? "new"}
            mode="create"
            categories={categoriesQ.data ?? []}
            initialDraft={draftQ.data ?? null}
            onSuccessRedirect="/admin/products"
          />
        )}

        {draftTempId && draftQ.isLoading && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center text-[13px] text-[var(--color-text-dim)]">
            Cargando borrador…
          </div>
        )}
      </div>
    </AdminShell>
  );
}