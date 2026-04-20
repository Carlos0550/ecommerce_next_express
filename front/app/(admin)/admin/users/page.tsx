"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, unwrapError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AdminShell } from "@/components/admin/admin-shell";
import { Icon } from "@/components/brand";
import type { User } from "@/lib/types";

type UsersResp = {
  ok: boolean;
  users: User[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

type Tab = "customer" | "admin";

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("customer");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const usersQ = useQuery({
    queryKey: ["users", { tab, page, debounced }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        type: tab === "admin" ? "admin" : "user",
      });
      if (debounced) params.set("search", debounced);
      const { data } = await api.get<UsersResp>(`/auth/users?${params}`);
      return data;
    },
  });

  const users = usersQ.data?.users ?? [];
  const total = usersQ.data?.pagination?.total ?? 0;
  const totalPages = usersQ.data?.pagination?.totalPages ?? 1;

  const toggleMut = useMutation({
    mutationFn: async ({ id, active }: { id: User["id"]; active: boolean }) => {
      const verb = active ? "disable" : "enable";
      await api.put(`/auth/users/${id}/${verb}`);
    },
    onSuccess: () => {
      toast.success("Estado actualizado");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: User["id"]) => {
      await api.delete(`/auth/users/${id}`);
    },
    onSuccess: () => {
      toast.success("Usuario eliminado");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const setTabAndReset = (t: Tab) => {
    setTab(t);
    setPage(1);
  };

  return (
    <AdminShell
      title="Clientes"
      subtitle={`${total} ${tab === "admin" ? "administradores" : "clientes"} registrados`}
    >
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <div className="inline-flex rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-1">
          {(
            [
              { id: "customer", label: "Clientes" },
              { id: "admin", label: "Administradores" },
            ] as const
          ).map((o) => (
            <button
              key={o.id}
              onClick={() => setTabAndReset(o.id)}
              className={cn(
                "rounded-[8px] px-3 py-1.5 text-[12px] font-semibold transition",
                tab === o.id
                  ? "bg-[var(--color-bg-elev)] text-[var(--color-text)] shadow-sm"
                  : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <div className="flex h-10 items-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3">
          <Icon
            name="search"
            size={13}
            className="text-[var(--color-text-dim)]"
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nombre o email"
            className="w-[220px] bg-transparent text-[13px] outline-none placeholder:text-[var(--color-text-muted)]"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
        <div
          className="grid gap-3 border-b border-[var(--color-border)] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]"
          style={{ gridTemplateColumns: GRID }}
        >
          <div>Usuario</div>
          <div>Email</div>
          <div>Teléfono</div>
          <div>Rol</div>
          <div>Estado</div>
          <div />
        </div>

        {usersQ.isLoading && (
          <div className="p-8 text-center text-sm text-[var(--color-text-dim)]">
            Cargando…
          </div>
        )}

        {!usersQ.isLoading && users.length === 0 && (
          <div className="p-12 text-center">
            <div className="font-grotesk text-[16px] font-semibold text-[var(--color-text)]">
              Sin resultados
            </div>
            <div className="mt-1 text-[13px] text-[var(--color-text-dim)]">
              {debounced
                ? "Probá con otro término."
                : "Todavía no hay usuarios en esta categoría."}
            </div>
          </div>
        )}

        {users.map((u) => {
          const active = u.is_active !== false;
          return (
            <div
              key={u.id}
              className="grid items-center gap-3 border-b border-[var(--color-border)] px-4 py-3 text-[13px] last:border-b-0"
              style={{ gridTemplateColumns: GRID }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[12px] font-semibold text-[var(--color-accent)]">
                  {initials(u.name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium text-[var(--color-text)]">
                    {u.name || "—"}
                  </div>
                </div>
              </div>
              <div className="truncate text-[var(--color-text-dim)]">
                {u.email}
              </div>
              <div className="text-[var(--color-text-dim)]">
                {u.phone ?? "—"}
              </div>
              <div>
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                    u.role === "ADMIN"
                      ? "bg-[color-mix(in_srgb,var(--color-accent)_18%,transparent)] text-[var(--color-accent)]"
                      : "bg-[var(--color-bg-input)] text-[var(--color-text-dim)]"
                  )}
                >
                  {u.role === "ADMIN" ? "Admin" : "Cliente"}
                </span>
              </div>
              <div>
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                    active
                      ? "bg-[color-mix(in_srgb,var(--color-success)_18%,transparent)] text-[var(--color-success)]"
                      : "bg-[color-mix(in_srgb,var(--color-warn)_18%,transparent)] text-[var(--color-warn)]"
                  )}
                >
                  {active ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="flex justify-end gap-1">
                <IconBtn
                  onClick={() => toggleMut.mutate({ id: u.id, active })}
                  title={active ? "Desactivar" : "Activar"}
                >
                  <Icon name={active ? "close" : "check"} size={13} />
                </IconBtn>
                <IconBtn
                  tone="danger"
                  onClick={() => {
                    if (confirm(`Eliminar a ${u.name || u.email}?`)) {
                      deleteMut.mutate(u.id);
                    }
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

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-[12px] text-[var(--color-text-dim)]">
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
    </AdminShell>
  );
}

const GRID = "2fr 2.2fr 1.3fr 0.8fr 0.8fr 80px";

function initials(name: string | undefined) {
  if (!name) return "—";
  return (
    name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "—"
  );
}

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
