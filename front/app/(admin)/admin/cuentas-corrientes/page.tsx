"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, unwrapError } from "@/lib/api";
import { cn, formatARS } from "@/lib/utils";
import { AdminShell } from "@/components/admin/admin-shell";
import { Icon } from "@/components/brand";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ClienteCCFormDialog } from "@/components/admin/cc-cliente-form-dialog";
import type {
  ClienteCC,
  ClienteCCListResponse,
  ClienteCCListRow,
} from "@/lib/types";

type EstadoFilter = "todos" | "abierto" | "vencido" | "cerrado" | "sin_ciclos";

const ESTADO_LABEL: Record<ClienteCCListRow["estado_ciclo_actual"], string> = {
  abierto: "Abierto",
  vencido: "Vencido",
  cerrado: "Cerrado",
  sin_ciclos: "Sin ciclos",
};

const ESTADO_TONE: Record<ClienteCCListRow["estado_ciclo_actual"], string> = {
  abierto:
    "bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] text-[var(--color-accent)]",
  vencido:
    "bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)] text-[var(--color-danger)]",
  cerrado:
    "bg-[color-mix(in_srgb,var(--color-text-dim)_14%,transparent)] text-[var(--color-text-dim)]",
  sin_ciclos:
    "bg-[color-mix(in_srgb,var(--color-text-dim)_8%,transparent)] text-[var(--color-text-dim)]",
};

const GRID = "60px 1.4fr 1.2fr 1fr 1fr 1fr 90px 90px";

export default function AdminCuentasCorrientesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<EstadoFilter>("todos");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClienteCC | null>(null);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description?: React.ReactNode;
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

  const listQ = useQuery({
    queryKey: ["cc-clientes", "list", { page, search, estado }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (search) params.set("search", search);
      if (estado !== "todos") params.set("estado", estado);
      const { data } = await api.get<ClienteCCListResponse>(
        `/cuentas-corrientes/clientes?${params.toString()}`,
      );
      return data;
    },
  });

  const items = useMemo(
    () => listQ.data?.data?.items ?? [],
    [listQ.data],
  );
  const total = listQ.data?.data?.pagination?.total ?? 0;
  const totalPages = listQ.data?.data?.pagination?.totalPages ?? 1;

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/cuentas-corrientes/clientes/${id}`);
    },
    onSuccess: () => {
      toast.success("Cliente eliminado");
      qc.invalidateQueries({ queryKey: ["cc-clientes"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (c: ClienteCCListRow) => {
    setEditing({
      id: c.id,
      nombre: c.nombre,
      telefono: c.telefono,
      email: c.email,
      direccion: c.direccion,
      notas: c.notas,
      is_active: c.is_active,
      created_at: c.created_at,
      updated_at: c.updated_at,
    });
    setFormOpen(true);
  };

  const closeConfirm = () =>
    setConfirmState((s) => (s ? { ...s, open: false } : s));

  const clearFilters = () => {
    setEstado("todos");
    setPage(1);
  };

  const actions = (
    <button
      onClick={openNew}
      className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)]"
    >
      <Icon name="plus" size={14} /> Nuevo cliente
    </button>
  );

  return (
    <AdminShell
      title="Cuentas corrientes"
      subtitle={`${total} ${total === 1 ? "cliente" : "clientes"}`}
      actions={actions}
    >
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <div className="relative w-full min-w-[200px] sm:flex-1">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre, teléfono o email…"
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
              estado !== "todos"
                ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] text-[var(--color-accent)]"
                : "border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text)] hover:bg-[var(--color-bg-input)]",
            )}
          >
            <Icon name="filter" size={14} />
            Estado
            {estado !== "todos" && (
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
            <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-[220px] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-2 shadow-lg">
              {(
                [
                  { id: "todos", label: "Todos" },
                  { id: "abierto", label: "Ciclo abierto" },
                  { id: "vencido", label: "Vencido" },
                  { id: "cerrado", label: "Ciclo cerrado" },
                  { id: "sin_ciclos", label: "Sin ciclos" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setEstado(opt.id);
                    setPage(1);
                    setFilterOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-[12px] font-medium transition",
                    estado === opt.id
                      ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                      : "text-[var(--color-text)] hover:bg-[var(--color-bg-input)]",
                  )}
                >
                  {opt.label}
                  {estado === opt.id && <Icon name="check" size={12} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mb-3 flex items-center justify-between text-[12px] text-[var(--color-text-dim)]">
          <div>
            Página {page} de {totalPages}
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
          <div />
          <div>Cliente</div>
          <div>Teléfono</div>
          <div>Adeudado</div>
          <div>Entregado</div>
          <div>Saldo</div>
          <div className="text-center">Estado</div>
          <div className="text-right">Acciones</div>
        </div>

        {listQ.isLoading && (
          <div className="p-8 text-center text-sm text-[var(--color-text-dim)]">
            Cargando…
          </div>
        )}

        {!listQ.isLoading && items.length === 0 && (
          <div className="p-12 text-center">
            <div className="font-grotesk text-[16px] font-semibold text-[var(--color-text)]">
              Sin clientes
            </div>
            <div className="mt-1 text-[13px] text-[var(--color-text-dim)]">
              Empezá creando el primero.
            </div>
          </div>
        )}

        {items.map((c) => {
          const saldo = Math.max(
            0,
            Number(c.total_adeudado) - Number(c.total_entregado),
          );
          return (
            <div
              key={c.id}
              className="grid cursor-pointer items-center gap-3 border-b border-[var(--color-border)] px-4 py-3 text-[13px] transition last:border-b-0 hover:bg-[var(--color-bg-input)]"
              style={{ gridTemplateColumns: GRID }}
              onClick={() => router.push(`/admin/cuentas-corrientes/${c.id}`)}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[11px] font-semibold text-[var(--color-accent)]">
                {c.nombre.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate font-medium text-[var(--color-text)]">
                  {c.nombre}
                </div>
                {c.email && (
                  <div className="truncate text-[11px] text-[var(--color-text-dim)]">
                    {c.email}
                  </div>
                )}
              </div>
              <div className="truncate font-mono text-[12px] text-[var(--color-text-dim)]">
                {c.telefono}
              </div>
              <div className="font-grotesk font-semibold text-[var(--color-danger)]">
                {formatARS(c.total_adeudado)}
              </div>
              <div className="font-grotesk font-semibold text-[var(--color-text)]">
                {formatARS(c.total_entregado)}
              </div>
              <div className="font-grotesk font-bold text-[var(--color-text)]">
                {formatARS(saldo)}
              </div>
              <div className="flex items-center justify-center">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    ESTADO_TONE[c.estado_ciclo_actual],
                  )}
                >
                  {ESTADO_LABEL[c.estado_ciclo_actual]}
                </span>
              </div>
              <div className="flex justify-end gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(c);
                  }}
                  title="Editar"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] bg-transparent text-[var(--color-text-dim)] transition hover:bg-[var(--color-bg-input)]"
                >
                  <Icon name="edit" size={13} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmState({
                      open: true,
                      title: "Eliminar cliente",
                      description: (
                        <>
                          ¿Seguro que querés eliminar a <b>{c.nombre}</b>? Se
                          conservará el historial de ciclos pero el cliente
                          quedará inactivo.
                        </>
                      ),
                      onConfirm: () => deleteMut.mutate(c.id),
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
        {listQ.isLoading && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 text-center text-sm text-[var(--color-text-dim)]">
            Cargando…
          </div>
        )}
        {!listQ.isLoading && items.length === 0 && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 text-center">
            <div className="font-grotesk text-[15px] font-semibold text-[var(--color-text)]">
              Sin clientes
            </div>
            <div className="mt-1 text-[12px] text-[var(--color-text-dim)]">
              Empezá creando el primero.
            </div>
          </div>
        )}
        {items.map((c) => {
          const saldo = Math.max(
            0,
            Number(c.total_adeudado) - Number(c.total_entregado),
          );
          return (
            <button
              key={c.id}
              onClick={() => router.push(`/admin/cuentas-corrientes/${c.id}`)}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3.5 text-left transition hover:bg-[var(--color-bg-input)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-[13px] text-[var(--color-text)]">
                    {c.nombre}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-[var(--color-text-dim)]">
                    {c.telefono}
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    ESTADO_TONE[c.estado_ciclo_actual],
                  )}
                >
                  {ESTADO_LABEL[c.estado_ciclo_actual]}
                </span>
              </div>
              <div className="mt-2.5 grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <div className="text-[var(--color-text-dim)]">Adeudado</div>
                  <div className="font-grotesk font-semibold text-[var(--color-danger)]">
                    {formatARS(c.total_adeudado)}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--color-text-dim)]">Entregado</div>
                  <div className="font-grotesk font-semibold text-[var(--color-text)]">
                    {formatARS(c.total_entregado)}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--color-text-dim)]">Saldo</div>
                  <div className="font-grotesk font-bold text-[var(--color-text)]">
                    {formatARS(saldo)}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Edit button floating on header row hidden: edit/delete están en detail page */}

      <ClienteCCFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        cliente={editing}
      />

      <ConfirmDialog
        open={confirmState?.open ?? false}
        title={confirmState?.title ?? ""}
        description={confirmState?.description}
        confirmLabel="Eliminar"
        tone="danger"
        onConfirm={() => {
          confirmState?.onConfirm();
          closeConfirm();
        }}
        onCancel={closeConfirm}
      />
    </AdminShell>
  );
}
