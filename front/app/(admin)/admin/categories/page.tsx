"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, storageUrl, unwrapError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AdminShell } from "@/components/admin/admin-shell";
import { CategoryFormDialog } from "@/components/admin/category-form-dialog";
import { Icon } from "@/components/brand";
import type { Category } from "@/lib/types";

type ApiCategory = Category & {
  status?: number;
  products?: unknown[];
  _count?: { products?: number };
};

export default function AdminCategoriesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const categoriesQ = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await api.get<{
        ok: boolean;
        data?: ApiCategory[];
        categories?: ApiCategory[];
      }>("/products/categories");
      return data.data ?? data.categories ?? [];
    },
  });

  const categories = categoriesQ.data ?? [];

  const statusMut = useMutation({
    mutationFn: async ({ id, status }: { id: Category["id"]; status: number }) => {
      await api.patch(`/products/categories/status/${id}/${status}`);
    },
    onSuccess: () => {
      toast.success("Estado actualizado");
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    setDialogOpen(true);
  };

  return (
    <AdminShell
      title="Categorías"
      subtitle={`${categories.length} categorías · organización del catálogo`}
      actions={
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)]"
        >
          <Icon name="plus" size={14} /> Nueva categoría
        </button>
      }
    >
      {categoriesQ.isLoading && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-10 text-center text-sm text-[var(--color-text-dim)]">
          Cargando categorías…
        </div>
      )}

      {!categoriesQ.isLoading && categories.length === 0 && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center">
          <div className="font-grotesk text-[16px] font-semibold text-[var(--color-text)]">
            Sin categorías
          </div>
          <div className="mt-1 text-[13px] text-[var(--color-text-dim)]">
            Creá la primera para empezar a organizar tus productos.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {categories.map((c) => {
          const thumb = storageUrl(c.image);
          const productCount =
            c._count?.products ?? (Array.isArray(c.products) ? c.products.length : 0);
          const active = c.status ? c.status === 1 : c.is_active !== false;

          return (
            <div
              key={c.id}
              className="group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] transition hover:border-[var(--color-border-strong)]"
            >
              <div className="relative aspect-[4/3] w-full bg-[var(--color-bg-input)]">
                {thumb ? (
                  <Image
                    src={thumb}
                    alt={c.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 320px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[var(--color-text-muted)]">
                    <Icon name="tag" size={28} />
                  </div>
                )}
                <span
                  className={cn(
                    "absolute right-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-semibold",
                    active
                      ? "bg-[color-mix(in_srgb,var(--color-success)_18%,transparent)] text-[var(--color-success)]"
                      : "bg-[color-mix(in_srgb,var(--color-warn)_18%,transparent)] text-[var(--color-warn)]"
                  )}
                >
                  {active ? "Activa" : "Inactiva"}
                </span>
              </div>

              <div className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-grotesk text-[15px] font-semibold text-[var(--color-text)] capitalize">
                      {c.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--color-text-dim)]">
                      {productCount} {productCount === 1 ? "producto" : "productos"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex gap-1.5">
                  <button
                    onClick={() => openEdit(c)}
                    className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-[var(--color-border)] bg-transparent text-[12px] font-medium text-[var(--color-text)] transition hover:bg-[var(--color-bg-input)]"
                  >
                    <Icon name="edit" size={12} /> Editar
                  </button>
                  <button
                    onClick={() =>
                      statusMut.mutate({ id: c.id, status: active ? 2 : 1 })
                    }
                    className="flex h-8 items-center justify-center rounded-md border border-[var(--color-border)] px-2.5 text-[12px] font-medium text-[var(--color-text-dim)] transition hover:bg-[var(--color-bg-input)]"
                    title={active ? "Desactivar" : "Activar"}
                  >
                    {active ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Eliminar categoría "${c.title}"?`)) {
                        statusMut.mutate({ id: c.id, status: 3 });
                      }
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-danger)] transition hover:bg-[var(--color-bg-input)]"
                    title="Eliminar"
                  >
                    <Icon name="trash" size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <CategoryFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        category={editing}
      />
    </AdminShell>
  );
}
