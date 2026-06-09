"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, unwrapError } from "@/lib/api";
import { cn, formatARS } from "@/lib/utils";
import { AdminShell } from "@/components/admin/admin-shell";
import { Icon } from "@/components/brand";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EgresoFormDialog } from "@/components/admin/egreso-form-dialog";
import { EgresoCategoryFormDialog } from "@/components/admin/egreso-category-form-dialog";
import type {
  Egreso,
  EgresoCategory,
  EgresoListResponse,
  EgresoPaymentMethod,
} from "@/lib/types";

type Tab = "egresos" | "categorias";

const PAYMENT_LABELS: Record<EgresoPaymentMethod, string> = {
  TARJETA: "Tarjeta",
  EFECTIVO: "Efectivo",
  QR: "QR",
  NINGUNO: "Ninguno",
  TRANSFERENCIA: "Transferencia",
};

export default function AdminEgresosPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("egresos");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);

  const [egresoFormOpen, setEgresoFormOpen] = useState(false);
  const [editingEgreso, setEditingEgreso] = useState<Egreso | null>(null);

  const [catFormOpen, setCatFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EgresoCategory | null>(
    null,
  );

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description?: React.ReactNode;
    tone?: "default" | "danger";
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

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

  const categoriesQ = useQuery({
    queryKey: ["egreso-categories"],
    queryFn: async () => {
      const { data } = await api.get<{ ok: boolean; items: EgresoCategory[] }>(
        "/egresos/categories",
      );
      return data.items ?? [];
    },
  });

  const categories = useMemo(
    () => categoriesQ.data ?? [],
    [categoriesQ.data],
  );
  const activeCategories = useMemo(
    () => categories.filter((c) => c.is_active && c.status !== "deleted"),
    [categories],
  );

  const egresosQ = useQuery({
    queryKey: [
      "egresos",
      "list",
      { page, search, categoryId, startDate, endDate },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (search) params.set("search", search);
      if (categoryId) params.set("category_id", categoryId);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      const { data } = await api.get<EgresoListResponse>(
        `/egresos?${params.toString()}`,
      );
      return data;
    },
  });

  const egresos = useMemo(
    () => egresosQ.data?.data?.items ?? [],
    [egresosQ.data],
  );
  const total = egresosQ.data?.data?.pagination?.total ?? 0;
  const totalPages = egresosQ.data?.data?.pagination?.totalPages ?? 1;

  const totalAmount = useMemo(
    () => egresos.reduce((acc, e) => acc + Number(e.amount ?? 0), 0),
    [egresos],
  );

  const monthRange = useMemo(() => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const toIso = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };
    return { start: toIso(first), end: toIso(last) };
  }, []);

  const monthEgresosQ = useQuery({
    queryKey: ["egresos", "month-total", monthRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: monthRange.start,
        end_date: monthRange.end,
      });
      const { data } = await api.get<{
        ok: boolean;
        data: { total: number; count: number };
      }>(`/egresos/total?${params.toString()}`);
      return data.data;
    },
  });

  const monthTotal = monthEgresosQ.data?.total ?? 0;
  const monthCount = monthEgresosQ.data?.count ?? 0;
  const monthLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("es-AR", {
      month: "long",
      year: "numeric",
    });
  }, []);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/egresos/${id}`);
    },
    onSuccess: () => {
      toast.success("Egreso eliminado");
      qc.invalidateQueries({ queryKey: ["egresos"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const deleteCatMut = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/egresos/categories/${id}`);
    },
    onSuccess: () => {
      toast.success("Categoría eliminada");
      qc.invalidateQueries({ queryKey: ["egreso-categories"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const openNewEgreso = () => {
    setEditingEgreso(null);
    setEgresoFormOpen(true);
  };
  const openEditEgreso = (e: Egreso) => {
    setEditingEgreso(e);
    setEgresoFormOpen(true);
  };
  const openNewCategory = () => {
    setEditingCategory(null);
    setCatFormOpen(true);
  };
  const openEditCategory = (c: EgresoCategory) => {
    setEditingCategory(c);
    setCatFormOpen(true);
  };

  const clearFilters = () => {
    setCategoryId("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const closeConfirm = () =>
    setConfirmState((s) => (s ? { ...s, open: false } : s));

  const actions =
    tab === "egresos" ? (
      <button
        onClick={openNewEgreso}
        disabled={activeCategories.length === 0}
        title={
          activeCategories.length === 0
            ? "Creá primero una categoría"
            : "Nuevo egreso"
        }
        className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
      >
        <Icon name="plus" size={14} /> Nuevo egreso
      </button>
    ) : (
      <button
        onClick={openNewCategory}
        className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)]"
      >
        <Icon name="plus" size={14} /> Nueva categoría
      </button>
    );

  return (
    <AdminShell
      title="Egresos"
      subtitle={
        tab === "egresos"
          ? `${total} egresos · ${activeCategories.length} categorías`
          : `${categories.length} categorías`
      }
      actions={actions}
    >
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <div className="inline-flex shrink-0 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-1">
          {(
            [
              { id: "egresos", label: "Egresos" },
              { id: "categorias", label: "Categorías" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-[8px] px-3 py-1.5 text-[12px] font-semibold transition",
                tab === t.id
                  ? "bg-[var(--color-text)] text-[var(--color-bg)]"
                  : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "egresos" && (
        <div className="mb-3.5 flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)] text-[var(--color-danger)]">
              <Icon name="wallet" size={18} />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
                Total de egresos de este mes
              </div>
              <div className="font-grotesk text-[22px] font-semibold leading-tight text-[var(--color-text)]">
                {monthEgresosQ.isLoading
                  ? "…"
                  : formatARS(monthTotal)}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-text-dim)]">
            <span className="rounded-md bg-[var(--color-bg-input)] px-2 py-1 font-mono text-[11px]">
              {monthRange.start} → {monthRange.end}
            </span>
            <span className="capitalize">{monthLabel}</span>
            <span className="rounded-md bg-[var(--color-bg-input)] px-2 py-1">
              {monthCount} {monthCount === 1 ? "egreso" : "egresos"}
            </span>
          </div>
        </div>
      )}

      {tab === "egresos" && (
        <>
          <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
            <div className="relative w-full min-w-[200px] sm:w-auto sm:flex-1">
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar por título o descripción…"
                className="h-10 w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] pl-9 pr-3 text-[13px] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
              />
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]">
                <Icon name="search" size={14} />
              </div>
            </div>

            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setFilterOpen((o) => !o)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-[10px] border px-3.5 py-2.5 text-[13px] font-medium transition",
                  categoryId || startDate || endDate
                    ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] text-[var(--color-accent)]"
                    : "border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text)] hover:bg-[var(--color-bg-input)]",
                )}
              >
                <Icon name="filter" size={14} />
                Filtros
                {(categoryId || startDate || endDate) && (
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFilters();
                    }}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-[color-mix(in_srgb,var(--color-accent)_20%,transparent)]"
                  >
                    <Icon name="close" size={11} />
                  </span>
                )}
              </button>

              {filterOpen && (
                <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-[300px] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 shadow-lg">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
                      Filtros
                    </div>
                    {(categoryId || startDate || endDate) && (
                      <button
                        onClick={clearFilters}
                        className="text-[11px] text-[var(--color-accent)] hover:underline"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>

                  <div className="mb-2.5">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
                      Categoría
                    </div>
                    <select
                      value={categoryId}
                      onChange={(e) => {
                        setCategoryId(e.target.value);
                        setPage(1);
                      }}
                      className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-input)] px-2.5 text-[12px] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
                    >
                      <option value="">Todas</option>
                      {activeCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
                    Rango de fechas
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <div className="mb-1 text-[10px] text-[var(--color-text-dim)]">
                        Desde
                      </div>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setPage(1);
                        }}
                        className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-input)] px-2.5 text-[12px] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
                      />
                    </label>
                    <label className="block">
                      <div className="mb-1 text-[10px] text-[var(--color-text-dim)]">
                        Hasta
                      </div>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          setPage(1);
                        }}
                        className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-input)] px-2.5 text-[12px] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="mb-3 flex items-center justify-between text-[12px] text-[var(--color-text-dim)]">
              <div>
                Página {page} de {totalPages} · {total} egresos ·{" "}
                <span className="font-grotesk font-semibold text-[var(--color-text)]">
                  {formatARS(totalAmount)}
                </span>{" "}
                en esta página
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

          <div className="hidden overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] md:block">
            <div
              className="grid gap-3 border-b border-[var(--color-border)] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]"
              style={{ gridTemplateColumns: GRID }}
            >
              <div>Fecha</div>
              <div>Título</div>
              <div>Categoría</div>
              <div>Monto</div>
              <div>Método</div>
              <div className="text-right">Acciones</div>
            </div>

            {egresosQ.isLoading && (
              <div className="p-8 text-center text-sm text-[var(--color-text-dim)]">
                Cargando egresos…
              </div>
            )}

            {!egresosQ.isLoading && egresos.length === 0 && (
              <div className="p-12 text-center">
                <div className="font-grotesk text-[16px] font-semibold text-[var(--color-text)]">
                  Sin egresos
                </div>
                <div className="mt-1 text-[13px] text-[var(--color-text-dim)]">
                  {activeCategories.length === 0
                    ? "Creá primero una categoría para empezar a registrar egresos."
                    : "Empezá creando el primero."}
                </div>
              </div>
            )}

            {egresos.map((e) => {
              const catColor = e.category?.color;
              return (
                <div
                  key={e.id}
                  className="grid items-center gap-3 border-b border-[var(--color-border)] px-4 py-3 text-[13px] last:border-b-0"
                  style={{ gridTemplateColumns: GRID }}
                >
                  <div className="font-mono text-[11px] text-[var(--color-text-dim)]">
                    {formatDate(e.egreso_date)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-[var(--color-text)]">
                      {e.title}
                    </div>
                    {e.description && (
                      <div className="mt-0.5 truncate text-[11px] text-[var(--color-text-dim)]">
                        {e.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    {catColor && (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: catColor }}
                      />
                    )}
                    <span className="truncate text-[var(--color-text-dim)]">
                      {e.category?.title ?? "—"}
                    </span>
                  </div>
                  <div className="font-grotesk font-semibold text-[var(--color-danger)]">
                    −{formatARS(Number(e.amount))}
                  </div>
                  <div className="text-[12px] text-[var(--color-text-dim)]">
                    {PAYMENT_LABELS[e.payment_method] ?? e.payment_method}
                  </div>
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => openEditEgreso(e)}
                      title="Editar"
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] bg-transparent text-[var(--color-text-dim)] transition hover:bg-[var(--color-bg-input)]"
                    >
                      <Icon name="edit" size={13} />
                    </button>
                    <button
                      onClick={() => {
                        setConfirmState({
                          open: true,
                          title: "Eliminar egreso",
                          description: (
                            <>
                              ¿Seguro que querés eliminar <b>{e.title}</b>?
                            </>
                          ),
                          tone: "danger",
                          confirmLabel: "Eliminar",
                          onConfirm: () => {
                            deleteMut.mutate(e.id);
                            closeConfirm();
                          },
                        });
                      }}
                      title="Eliminar"
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] bg-transparent text-[var(--color-danger)] transition hover:bg-[var(--color-bg-input)]"
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-2.5 md:hidden">
            {egresosQ.isLoading && (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 text-center text-sm text-[var(--color-text-dim)]">
                Cargando egresos…
              </div>
            )}
            {!egresosQ.isLoading && egresos.length === 0 && (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 text-center">
                <div className="font-grotesk text-[15px] font-semibold text-[var(--color-text)]">
                  Sin egresos
                </div>
                <div className="mt-1 text-[12px] text-[var(--color-text-dim)]">
                  {activeCategories.length === 0
                    ? "Creá primero una categoría."
                    : "Empezá creando el primero."}
                </div>
              </div>
            )}
            {egresos.map((e) => {
              const catColor = e.category?.color;
              return (
                <div
                  key={e.id}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-[13px] text-[var(--color-text)]">
                        {e.title}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--color-text-dim)]">
                        <span className="font-mono">
                          {formatDate(e.egreso_date)}
                        </span>
                        <span>·</span>
                        {catColor && (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: catColor }}
                          />
                        )}
                        <span className="truncate">
                          {e.category?.title ?? "—"}
                        </span>
                      </div>
                    </div>
                    <div className="font-grotesk text-[15px] font-semibold text-[var(--color-danger)]">
                      −{formatARS(Number(e.amount))}
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="rounded-md bg-[var(--color-bg-input)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-dim)]">
                      {PAYMENT_LABELS[e.payment_method] ?? e.payment_method}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => openEditEgreso(e)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text-dim)]"
                      >
                        <Icon name="edit" size={13} />
                      </button>
                      <button
                        onClick={() => {
                          setConfirmState({
                            open: true,
                            title: "Eliminar egreso",
                            description: (
                              <>
                                ¿Seguro que querés eliminar <b>{e.title}</b>?
                              </>
                            ),
                            tone: "danger",
                            confirmLabel: "Eliminar",
                            onConfirm: () => {
                              deleteMut.mutate(e.id);
                              closeConfirm();
                            },
                          });
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-danger)]"
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "categorias" && (
        <>
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
                Creá la primera para empezar a registrar egresos.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((c) => {
              const isActive = c.is_active && c.status !== "deleted";
              const headerColor =
                c.color && /^#([0-9a-fA-F]{3}){1,2}$/.test(c.color)
                  ? c.color
                  : "#d4d4d4";
              return (
                <div
                  key={c.id}
                  className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] transition hover:border-[var(--color-border-strong)]"
                >
                  <div
                    className="relative h-2 w-full"
                    style={{ background: headerColor }}
                  />
                  <div className="p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-grotesk text-[15px] font-semibold text-[var(--color-text)]">
                          {c.title}
                        </div>
                        {c.description && (
                          <div className="mt-1 line-clamp-2 text-[11px] text-[var(--color-text-dim)]">
                            {c.description}
                          </div>
                        )}
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold",
                          isActive
                            ? "bg-[color-mix(in_srgb,var(--color-success)_18%,transparent)] text-[var(--color-success)]"
                            : "bg-[color-mix(in_srgb,var(--color-danger)_18%,transparent)] text-[var(--color-danger)]",
                        )}
                      >
                        {isActive ? "Activa" : "Inactiva"}
                      </span>
                    </div>

                    <div className="mt-3 flex gap-1.5">
                      <button
                        onClick={() => openEditCategory(c)}
                        className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-[var(--color-border)] bg-transparent text-[12px] font-medium text-[var(--color-text)] transition hover:bg-[var(--color-bg-input)]"
                      >
                        <Icon name="edit" size={12} /> Editar
                      </button>
                      <button
                        onClick={() => {
                          setConfirmState({
                            open: true,
                            title: "Eliminar categoría",
                            description: (
                              <>
                                ¿Eliminar la categoría <b>{c.title}</b>? Si
                                tiene egresos activos, no se va a poder
                                eliminar.
                              </>
                            ),
                            tone: "danger",
                            confirmLabel: "Eliminar",
                            onConfirm: () => {
                              deleteCatMut.mutate(c.id);
                              closeConfirm();
                            },
                          });
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
        </>
      )}

      <EgresoFormDialog
        open={egresoFormOpen}
        onClose={() => setEgresoFormOpen(false)}
        egreso={editingEgreso}
        categories={activeCategories}
      />

      <EgresoCategoryFormDialog
        open={catFormOpen}
        onClose={() => setCatFormOpen(false)}
        category={editingCategory}
      />

      <ConfirmDialog
        open={!!confirmState?.open}
        title={confirmState?.title ?? ""}
        description={confirmState?.description}
        tone={confirmState?.tone}
        confirmLabel={confirmState?.confirmLabel}
        loading={deleteMut.isPending || deleteCatMut.isPending}
        onConfirm={() => confirmState?.onConfirm()}
        onCancel={closeConfirm}
      />
    </AdminShell>
  );
}

const GRID = "100px 1.6fr 1fr 1fr 1fr 90px";

function formatDate(input: string | Date): string {
  if (!input) return "—";
  const raw = typeof input === "string" ? input : input.toISOString();
  const ymd = raw.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return ymd;
  const yyyy = match[1] ?? "";
  const mm = match[2] ?? "";
  const dd = match[3] ?? "";
  return `${dd}/${mm}/${yyyy}`;
}
