"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, storageUrl, unwrapError } from "@/lib/api";
import { formatARS, cn } from "@/lib/utils";
import { AdminShell } from "@/components/admin/admin-shell";
import { ProductFormSheet } from "@/components/admin/product-form-sheet";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Icon } from "@/components/brand";
import type { Category, Product } from "@/lib/types";

type ProductsResponse = {
  ok: boolean;
  data: {
    products: Product[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
};

export default function AdminProductsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "all" | "active" | "inactive" | "draft" | "out_stock"
  >("all");
  const [trashView, setTrashView] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!filterOpen) return;
    const onClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [filterOpen]);

  const productsQ = useQuery({
    queryKey: ["products", { page, categoryId, status, search, trashView }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (categoryId) params.set("categoryId", categoryId);
      if (search) params.set("title", search);
      if (trashView) {
        params.set("state", "deleted");
      } else if (status !== "all") {
        params.set("state", status);
      }
      const { data } = await api.get<ProductsResponse>(
        `/products?${params.toString()}`
      );
      const list = data.data.products ?? [];
      const filtered = trashView
        ? list
        : list.filter((p) => p.state !== "deleted");
      return { ...data.data, products: filtered };
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

  const products = productsQ.data?.products ?? [];
  const categories = categoriesQ.data ?? [];
  const total = productsQ.data?.pagination?.total ?? 0;
  const totalPages = productsQ.data?.pagination?.totalPages ?? 1;

  const categoriesWithCount = useMemo(() => categories, [categories]);

  const deleteMut = useMutation({
    mutationFn: async (id: number | string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      toast.success("Producto eliminado");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description?: React.ReactNode;
    tone?: "default" | "danger";
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  const closeConfirm = () => setConfirmState((s) => (s ? { ...s, open: false } : s));

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const bulkMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!bulkMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(e.target as Node)) {
        setBulkMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [bulkMenuOpen]);

  const toggleOne = (id: string) =>
    setSelected((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const clearSelection = () => setSelected(new Set());

  const STATES = [
    { v: "active", label: "Activo" },
    { v: "inactive", label: "Inactivo" },
    { v: "draft", label: "Borrador" },
    { v: "out_stock", label: "Sin stock" },
    { v: "deleted", label: "Eliminado" },
  ] as const;

  const bulkStateMut = useMutation({
    mutationFn: async ({ ids, state }: { ids: string[]; state: string }) => {
      await Promise.all(
        ids.map((id) => api.patch(`/products/status/${id}/${state}`))
      );
    },
    onSuccess: (_d, v) => {
      toast.success(`${v.ids.length} productos actualizados`);
      clearSelection();
      setBulkMenuOpen(false);
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const wipeAllMut = useMutation({
    mutationFn: async () => {
      const { data } = await api.get<ProductsResponse>(
        `/products?page=1&limit=10000`
      );
      const ids = (data.data.products ?? []).map((p) => String(p.id));
      if (ids.length === 0) return 0;
      await Promise.all(
        ids.map((id) => api.patch(`/products/status/${id}/deleted`))
      );
      return ids.length;
    },
    onSuccess: (n) => {
      toast.success(`${n} productos eliminados (soft)`);
      clearSelection();
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const openNew = () => {
    setEditing(null);
    setSheetOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setSheetOpen(true);
  };

  return (
    <AdminShell
      title="Productos"
      subtitle={`${total} productos · ${categories.length} categorías`}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setConfirmState({
                open: true,
                title: "Enviar todos los productos a la papelera",
                description: (
                  <>
                    Todos los productos se van a mover a la papelera. Si no los
                    recuperás, se van a eliminar automáticamente después de{" "}
                    <b>30 días</b>. Podés restaurarlos desde la papelera en
                    cualquier momento.
                  </>
                ),
                tone: "danger",
                confirmLabel: "Enviar a la papelera",
                onConfirm: () => {
                  wipeAllMut.mutate();
                  closeConfirm();
                },
              });
            }}
            disabled={wipeAllMut.isPending}
            className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-danger)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--color-danger)] hover:bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)] disabled:opacity-60"
          >
            <Icon name="trash" size={14} />
            {wipeAllMut.isPending ? "Limpiando…" : "Limpieza total"}
          </button>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)]"
          >
            <Icon name="plus" size={14} /> Nuevo producto
          </button>
        </div>
      }
    >
      <div className="flex h-[calc(100vh-130px)] flex-col gap-3.5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[240px] flex-1">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por título…"
            className="h-10 w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] pl-9 pr-3 text-[13px] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
          />
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]">
            <Icon name="search" size={14} />
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-1">
          {(
            [
              { v: "all", label: "Todos" },
              { v: "active", label: "Activos" },
              { v: "inactive", label: "Inactivos" },
              { v: "draft", label: "Borradores" },
              { v: "out_stock", label: "Sin stock" },
            ] as const
          ).map((s) => (
            <button
              key={s.v}
              onClick={() => {
                setStatus(s.v);
                setTrashView(false);
                setPage(1);
              }}
              disabled={trashView}
              className={cn(
                "rounded-md px-3 py-1.5 text-[12px] font-semibold transition disabled:opacity-50",
                !trashView && status === s.v
                  ? "bg-[var(--color-text)] text-[var(--color-bg)]"
                  : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setTrashView((v) => !v);
            setPage(1);
            clearSelection();
          }}
          className={cn(
            "inline-flex items-center gap-2 rounded-[10px] border px-3.5 py-2.5 text-[13px] font-medium transition",
            trashView
              ? "border-[var(--color-danger)] bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] text-[var(--color-danger)]"
              : "border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text)] hover:bg-[var(--color-bg-input)]"
          )}
          title="Productos en la papelera"
        >
          <Icon name="trash" size={14} />
          {trashView ? "Ver todos" : "Papelera"}
        </button>

        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen((o) => !o)}
            className={cn(
              "inline-flex items-center gap-2 rounded-[10px] border px-3.5 py-2.5 text-[13px] font-medium transition",
              categoryId
                ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] text-[var(--color-accent)]"
                : "border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text)] hover:bg-[var(--color-bg-input)]"
            )}
          >
            <Icon name="filter" size={14} />
            {categoryId
              ? categoriesWithCount.find((c) => String(c.id) === categoryId)
                  ?.title ?? "Categoría"
              : "Filtros"}
            {categoryId && (
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCategoryId(null);
                  setPage(1);
                }}
                className="ml-0.5 rounded-full p-0.5 hover:bg-[color-mix(in_srgb,var(--color-accent)_20%,transparent)]"
              >
                <Icon name="close" size={11} />
              </span>
            )}
          </button>

          {filterOpen && (
            <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-[260px] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
                  Categoría
                </div>
                {categoryId && (
                  <button
                    onClick={() => {
                      setCategoryId(null);
                      setPage(1);
                    }}
                    className="text-[11px] text-[var(--color-accent)] hover:underline"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <div className="flex max-h-[240px] flex-col gap-1 overflow-y-auto">
                <button
                  onClick={() => {
                    setCategoryId(null);
                    setPage(1);
                    setFilterOpen(false);
                  }}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-left text-[12px]",
                    !categoryId
                      ? "bg-[var(--color-accent-soft)] font-semibold text-[var(--color-accent)]"
                      : "text-[var(--color-text)] hover:bg-[var(--color-bg-input)]"
                  )}
                >
                  Todas las categorías
                </button>
                {categoriesWithCount.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCategoryId(String(c.id));
                      setPage(1);
                      setFilterOpen(false);
                    }}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 text-left text-[12px]",
                      categoryId === String(c.id)
                        ? "bg-[var(--color-accent-soft)] font-semibold text-[var(--color-accent)]"
                        : "text-[var(--color-text)] hover:bg-[var(--color-bg-input)]"
                    )}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pagination (fixed above the scrolling table) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[12px] text-[var(--color-text-dim)]">
          <div>
            Página {page} de {totalPages} · {total} productos
          </div>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-[10px] border border-[var(--color-border)] px-3 py-1.5 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-[10px] border border-[var(--color-border)] px-3 py-1.5 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] px-3 py-2">
          <div className="text-[13px] font-semibold text-[var(--color-accent)]">
            {selected.size} seleccionados
          </div>
          <div className="flex-1" />
          <div className="relative" ref={bulkMenuRef}>
            <button
              onClick={() => setBulkMenuOpen((o) => !o)}
              disabled={bulkStateMut.isPending}
              className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
            >
              <Icon name="edit" size={12} />
              {bulkStateMut.isPending ? "Aplicando…" : "Cambiar estado"}
            </button>
            {bulkMenuOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-[200px] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-2 shadow-lg">
                {STATES.map((s) => (
                  <button
                    key={s.v}
                    onClick={() =>
                      bulkStateMut.mutate({
                        ids: Array.from(selected),
                        state: s.v,
                      })
                    }
                    className={cn(
                      "flex w-full rounded-md px-2.5 py-1.5 text-left text-[12px] text-[var(--color-text)] hover:bg-[var(--color-bg-input)]",
                      s.v === "deleted" && "text-[var(--color-danger)]"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={clearSelection}
            className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-[12px] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
          >
            Deseleccionar
          </button>
        </div>
      )}

      {/* Table */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
        <div
          className="grid shrink-0 gap-3 border-b border-[var(--color-border)] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]"
          style={{ gridTemplateColumns: GRID }}
        >
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={
                products.length > 0 &&
                products.every((p) => selected.has(String(p.id)))
              }
              onChange={(e) => {
                if (e.target.checked) {
                  setSelected((cur) => {
                    const n = new Set(cur);
                    products.forEach((p) => n.add(String(p.id)));
                    return n;
                  });
                } else {
                  setSelected((cur) => {
                    const n = new Set(cur);
                    products.forEach((p) => n.delete(String(p.id)));
                    return n;
                  });
                }
              }}
              className="h-3.5 w-3.5 accent-[var(--color-accent)]"
            />
          </div>
          <div>Producto</div>
          <div>Categoría</div>
          <div>SKU</div>
          <div>Precio</div>
          <div>Stock</div>
          <div>Estado</div>
          <div />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
        {productsQ.isLoading && (
          <div className="p-8 text-center text-sm text-[var(--color-text-dim)]">
            Cargando productos…
          </div>
        )}

        {!productsQ.isLoading && products.length === 0 && (
          <div className="p-12 text-center">
            <div className="font-grotesk text-[16px] font-semibold text-[var(--color-text)]">
              Sin productos
            </div>
            <div className="mt-1 text-[13px] text-[var(--color-text-dim)]">
              Empezá creando el primero.
            </div>
          </div>
        )}

        {products.map((p) => {
          const stock = Number(p.stock ?? 0);
          const stateTone =
            stock === 0
              ? { bg: "var(--color-danger)", fg: "var(--color-danger)", label: "Sin stock" }
              : stock < 10
                ? { bg: "var(--color-warn)", fg: "var(--color-warn)", label: "Stock bajo" }
                : { bg: "var(--color-success)", fg: "var(--color-success)", label: "Activo" };

          const thumb = storageUrl(p.images?.[0]?.url);

          return (
            <div
              key={p.id}
              className={cn(
                "grid items-center gap-3 border-b border-[var(--color-border)] px-4 py-3 text-[13px] last:border-b-0",
                selected.has(String(p.id)) &&
                  "bg-[color-mix(in_srgb,var(--color-accent)_6%,transparent)]"
              )}
              style={{ gridTemplateColumns: GRID }}
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selected.has(String(p.id))}
                  onChange={() => toggleOne(String(p.id))}
                  className="h-3.5 w-3.5 accent-[var(--color-accent)]"
                />
              </div>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--color-bg-input)]">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={p.title}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--color-text-muted)]">
                      —
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium text-[var(--color-text)]">
                    {p.title}
                  </div>
                </div>
              </div>
              <div className="text-[var(--color-text-dim)]">
                {p.category?.title ?? "—"}
              </div>
              <div className="font-mono text-[11px] text-[var(--color-text-dim)]">
                {p.sku ?? "—"}
              </div>
              <div className="font-grotesk font-semibold">
                {formatARS(Number(p.price))}
              </div>
              <div
                className="font-medium"
                style={{
                  color: stock < 10 ? "var(--color-danger)" : "var(--color-text)",
                }}
              >
                {stock}
              </div>
              <div>
                <span
                  className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    background: `color-mix(in srgb, ${stateTone.bg} 15%, transparent)`,
                    color: stateTone.fg,
                  }}
                >
                  {stateTone.label}
                </span>
              </div>
              <div className="flex gap-1 justify-end">
                <IconBtn onClick={() => openEdit(p)} title="Editar">
                  <Icon name="edit" size={13} />
                </IconBtn>
                <IconBtn
                  tone="danger"
                  onClick={() => {
                    setConfirmState({
                      open: true,
                      title: "Eliminar producto",
                      description: (
                        <>
                          ¿Seguro que querés eliminar <b>{p.title}</b>? Esta
                          acción no se puede deshacer.
                        </>
                      ),
                      tone: "danger",
                      confirmLabel: "Eliminar",
                      onConfirm: () => {
                        deleteMut.mutate(p.id);
                        closeConfirm();
                      },
                    });
                  }}
                  title="Eliminar"
                >
                  <Icon name="trash" size={13} />
                </IconBtn>
              </div>
            </div>
          );
        })}
        </div>
      </div>
      </div>

      <ProductFormSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        product={editing}
        categories={categories}
      />

      <ConfirmDialog
        open={!!confirmState?.open}
        title={confirmState?.title ?? ""}
        description={confirmState?.description}
        tone={confirmState?.tone}
        confirmLabel={confirmState?.confirmLabel}
        loading={wipeAllMut.isPending || deleteMut.isPending}
        onConfirm={() => confirmState?.onConfirm()}
        onCancel={closeConfirm}
      />
    </AdminShell>
  );
}

const GRID = "32px 2.5fr 1fr 1fr 1fr 0.8fr 0.9fr 70px";

function IconBtn({
  onClick,
  children,
  title,
  tone,
}: {
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  tone?: "danger";
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] bg-transparent transition hover:bg-[var(--color-bg-input)]",
        tone === "danger"
          ? "text-[var(--color-danger)]"
          : "text-[var(--color-text-dim)]"
      )}
    >
      {children}
    </button>
  );
}
