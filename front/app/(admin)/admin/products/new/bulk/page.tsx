"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { BulkProductForm } from "@/components/admin/product-form-bulk";

export default function BulkNewProductPage() {
  return (
    <AdminShell
      title="Carga masiva"
      subtitle="Subí varios productos en una sola pasada"
      actions={
        <Link
          href="/admin/products/new"
          className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-[12px] font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-input)]"
        >
          <ArrowLeft size={14} />
          Carga individual
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
          <Link
            href="/admin/products/new"
            className="hover:text-[var(--color-text)]"
          >
            Nuevo
          </Link>
          <span>/</span>
          <span className="text-[var(--color-text)]">Carga masiva</span>
        </div>

        <div className="rounded-2xl border border-[var(--color-accent)]/30 bg-[color-mix(in_srgb,var(--color-accent)_6%,var(--color-bg-card))] p-3.5 text-[12px] text-[var(--color-text-dim)]">
          <span className="font-semibold text-[var(--color-text)]">Cómo funciona: </span>
          cada slot es un producto. Solo necesitás imagen, título, precio y
          stock (default 1). Agregá tantos slots como quieras y al final
          subilos todos juntos.
        </div>

        <BulkProductForm />
      </div>
    </AdminShell>
  );
}