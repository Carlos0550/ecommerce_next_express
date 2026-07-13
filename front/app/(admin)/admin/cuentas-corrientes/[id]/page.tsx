"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, unwrapError } from "@/lib/api";
import { cn, formatARS } from "@/lib/utils";
import { AdminShell } from "@/components/admin/admin-shell";
import { Icon } from "@/components/brand";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ClienteCCFormDialog } from "@/components/admin/cc-cliente-form-dialog";
import { CcDeudaFormDialog } from "@/components/admin/cc-deuda-form-dialog";
import { CcDeudaEditDialog } from "@/components/admin/cc-deuda-edit-dialog";
import { CcPagoFormDialog } from "@/components/admin/cc-pago-form-dialog";
import {
  CC_PAYMENT_LABELS,
  todayIso,
} from "@/lib/schemas/cuenta-corriente";
import type {
  ClienteCCDetail,
  Ciclo,
  DeudaCC,
  PagoCC,
} from "@/lib/types";

function formatDate(d: string | Date | undefined | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const DEUDA_GRID = "70px 1fr 110px 110px 110px 80px";
const PAGO_GRID = "110px 1fr 110px 110px 80px";

export default function ClienteCCDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const id = params.id;

  const [fromFilter, setFromFilter] = useState(todayIso());
  const [toFilter, setToFilter] = useState(todayIso());
  const [editingCliente, setEditingCliente] = useState(false);

  const [deudaFormOpen, setDeudaFormOpen] = useState(false);
  const [editingDeuda, setEditingDeuda] = useState<DeudaCC | null>(null);

  const [pagoFormOpen, setPagoFormOpen] = useState(false);
  const [editingPago, setEditingPago] = useState<PagoCC | null>(null);

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description?: React.ReactNode;
    onConfirm: () => void;
  } | null>(null);

  const detailQ = useQuery({
    queryKey: ["cc-cliente", id],
    queryFn: async () => {
      const { data } = await api.get<{ ok: true; item: ClienteCCDetail }>(
        `/cuentas-corrientes/clientes/${id}`,
      );
      return data.item;
    },
    enabled: !!id,
  });

  const ciclosQ = useQuery({
    queryKey: ["cc-ciclos", id, { from: fromFilter, to: toFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fromFilter) params.set("from", fromFilter);
      if (toFilter) params.set("to", toFilter);
      const { data } = await api.get<{ ok: true; items: Ciclo[] }>(
        `/cuentas-corrientes/clientes/${id}/ciclos?${params.toString()}`,
      );
      return data.items;
    },
    enabled: !!id,
  });

  const cliente = detailQ.data;
  const cicloActual = cliente?.ciclo_actual ?? null;

  const deleteDeudaMut = useMutation({
    mutationFn: async (deudaId: string) => {
      await api.delete(`/cuentas-corrientes/deudas/${deudaId}`);
    },
    onSuccess: () => {
      toast.success("Deuda eliminada");
      qc.invalidateQueries({ queryKey: ["cc-cliente", id] });
      qc.invalidateQueries({ queryKey: ["cc-clientes"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const deletePagoMut = useMutation({
    mutationFn: async (pagoId: string) => {
      await api.delete(`/cuentas-corrientes/pagos/${pagoId}`);
    },
    onSuccess: () => {
      toast.success("Pago eliminado");
      qc.invalidateQueries({ queryKey: ["cc-cliente", id] });
      qc.invalidateQueries({ queryKey: ["cc-clientes"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const closeConfirm = () =>
    setConfirmState((s) => (s ? { ...s, open: false } : s));

  const oldestDeudaFechaActual = useMemo(() => {
    const oldest = cicloActual?.deudas
      ?.map((d) => String(d.fecha).slice(0, 10))
      .sort()[0];
    return oldest ?? null;
  }, [cicloActual]);

  const ciclosHistorial = useMemo(() => {
    const list = ciclosQ.data ?? [];
    // Mostrar todos los ciclos con actividad en el rango (abiertos y cerrados)
    return list;
  }, [ciclosQ.data]);

  if (detailQ.isLoading || !cliente) {
    return (
      <AdminShell title="Cuenta corriente" subtitle="Cargando…">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-10 text-center text-sm text-[var(--color-text-dim)]">
          Cargando…
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={cliente.nombre}
      subtitle={cliente.telefono}
      actions={
        <>
          <button
            onClick={() => router.push("/admin/cuentas-corrientes")}
            className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2.5 text-[13px] font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-input)]"
          >
            <Icon name="back" size={14} /> Volver
          </button>
          <button
            onClick={() => setEditingCliente(true)}
            className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2.5 text-[13px] font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-input)]"
          >
            <Icon name="edit" size={14} /> Editar
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Datos cliente */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
            Datos del cliente
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DataField label="Nombre" value={cliente.nombre} />
            <DataField
              label="Teléfono"
              value={cliente.telefono}
              mono
            />
            <DataField label="Email" value={cliente.email ?? "—"} />
            <DataField label="Dirección" value={cliente.direccion ?? "—"} />
          </div>
          {cliente.notas && (
            <div className="mt-3">
              <div className="mb-1 text-[11px] font-semibold text-[var(--color-text-dim)]">
                Notas
              </div>
              <div className="rounded-md bg-[var(--color-bg-input)] p-2.5 text-[12px] text-[var(--color-text)]">
                {cliente.notas}
              </div>
            </div>
          )}
        </div>

        {/* Ciclo actual */}
        {cicloActual && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
                  Ciclo actual
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    cicloActual.vencido
                      ? "bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)] text-[var(--color-danger)]"
                      : "bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] text-[var(--color-accent)]",
                  )}
                >
                  {cicloActual.vencido ? "Vencido" : "Abierto"}
                </span>
                <span className="text-[11px] text-[var(--color-text-dim)]">
                  Apertura {formatDate(cicloActual.fecha_apertura)}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingDeuda(null);
                    setDeudaFormOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-[10px] bg-[var(--color-accent)] px-3 py-2 text-[12px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)]"
                >
                  <Icon name="plus" size={12} /> Deuda
                </button>
                <button
                  onClick={() => {
                    setEditingPago(null);
                    setPagoFormOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--color-accent)] bg-transparent px-3 py-2 text-[12px] font-semibold text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
                >
                  <Icon name="plus" size={12} /> Pago
                </button>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-3 text-[12px]">
              <SmallStat
                label="Adeudado"
                value={formatARS(cicloActual.total_adeudado)}
                tone="danger"
              />
              <SmallStat
                label="Entregado"
                value={formatARS(cicloActual.total_pagado)}
                tone="default"
              />
              <SmallStat
                label="Saldo"
                value={formatARS(cicloActual.saldo_pendiente)}
                tone="accent"
              />
            </div>

            {/* Tabla deudas */}
            <div className="mb-5">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
                Deudas
              </div>
              <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
                <div
                  className="grid gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]"
                  style={{ gridTemplateColumns: DEUDA_GRID }}
                >
                  <div>Cant.</div>
                  <div>Título</div>
                  <div>Precio</div>
                  <div>Total</div>
                  <div>Fecha</div>
                  <div className="text-right">Acciones</div>
                </div>
                {cicloActual.deudas.length === 0 && (
                  <div className="px-3 py-6 text-center text-[12px] text-[var(--color-text-dim)]">
                    Sin deudas en este ciclo.
                  </div>
                )}
                {cicloActual.deudas.map((d) => (
                  <div
                    key={d.id}
                    className="grid items-center gap-2 border-b border-[var(--color-border)] px-3 py-2.5 text-[12px] last:border-b-0"
                    style={{ gridTemplateColumns: DEUDA_GRID }}
                  >
                    <div className="font-mono text-[var(--color-text-dim)]">
                      ×{d.cantidad}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-[var(--color-text)]">
                        {d.titulo}
                      </div>
                      {d.notas && (
                        <div className="truncate text-[11px] text-[var(--color-text-dim)]">
                          {d.notas}
                        </div>
                      )}
                    </div>
                    <div className="font-mono text-[var(--color-text-dim)]">
                      {formatARS(Number(d.precio_unit))}
                    </div>
                    <div className="font-grotesk font-semibold text-[var(--color-danger)]">
                      {formatARS(Number(d.total))}
                    </div>
                    <div className="font-mono text-[11px] text-[var(--color-text-dim)]">
                      {formatDate(d.fecha)}
                    </div>
                    <div className="flex justify-end gap-1">
                      <RowBtn
                        title="Editar"
                        icon="edit"
                        onClick={() => {
                          setEditingDeuda(d);
                          setDeudaFormOpen(true);
                        }}
                      />
                      <RowBtn
                        title="Eliminar"
                        icon="trash"
                        tone="danger"
                        onClick={() => {
                          setConfirmState({
                            open: true,
                            title: "Eliminar deuda",
                            description: (
                              <>
                                ¿Eliminar <b>{d.titulo}</b>?
                              </>
                            ),
                            onConfirm: () => deleteDeudaMut.mutate(d.id),
                          });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabla pagos */}
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
                Pagos
              </div>
              <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
                <div
                  className="grid gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]"
                  style={{ gridTemplateColumns: PAGO_GRID }}
                >
                  <div>Fecha</div>
                  <div>Método</div>
                  <div>Notas</div>
                  <div>Monto</div>
                  <div className="text-right">Acciones</div>
                </div>
                {cicloActual.pagos.length === 0 && (
                  <div className="px-3 py-6 text-center text-[12px] text-[var(--color-text-dim)]">
                    Sin pagos registrados.
                  </div>
                )}
                {cicloActual.pagos.map((p) => (
                  <div
                    key={p.id}
                    className="grid items-center gap-2 border-b border-[var(--color-border)] px-3 py-2.5 text-[12px] last:border-b-0"
                    style={{ gridTemplateColumns: PAGO_GRID }}
                  >
                    <div className="font-mono text-[11px] text-[var(--color-text-dim)]">
                      {formatDate(p.fecha)}
                    </div>
                    <div className="text-[var(--color-text)]">
                      {CC_PAYMENT_LABELS[p.payment_method] ?? p.payment_method}
                    </div>
                    <div className="truncate text-[11px] text-[var(--color-text-dim)]">
                      {p.notas ?? "—"}
                    </div>
                    <div className="font-grotesk font-semibold text-[var(--color-text)]">
                      {formatARS(Number(p.monto))}
                    </div>
                    <div className="flex justify-end gap-1">
                      <RowBtn
                        title="Editar"
                        icon="edit"
                        onClick={() => {
                          setEditingPago(p);
                          setPagoFormOpen(true);
                        }}
                      />
                      <RowBtn
                        title="Eliminar"
                        icon="trash"
                        tone="danger"
                        onClick={() => {
                          setConfirmState({
                            open: true,
                            title: "Eliminar pago",
                            description: (
                              <>
                                ¿Eliminar pago de{" "}
                                <b>{formatARS(Number(p.monto))}</b>?
                              </>
                            ),
                            onConfirm: () => deletePagoMut.mutate(p.id),
                          });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!cicloActual && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-grotesk text-[15px] font-semibold text-[var(--color-text)]">
                  Sin ciclo abierto
                </div>
                <div className="mt-0.5 text-[12px] text-[var(--color-text-dim)]">
                  Añadí una deuda para abrir un nuevo ciclo.
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingDeuda(null);
                  setDeudaFormOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-[10px] bg-[var(--color-accent)] px-3 py-2 text-[12px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)]"
              >
                <Icon name="plus" size={12} /> Añadir deuda
              </button>
            </div>
          </div>
        )}

        {/* Historial */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
              Actividad por fecha
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={fromFilter}
                onChange={(e) => setFromFilter(e.target.value)}
                className="h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-input)] px-2 text-[11px] text-[var(--color-text)]"
              />
              <span className="text-[11px] text-[var(--color-text-dim)]">→</span>
              <input
                type="date"
                value={toFilter}
                onChange={(e) => setToFilter(e.target.value)}
                className="h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-input)] px-2 text-[11px] text-[var(--color-text)]"
              />
              <button
                onClick={() => {
                  setFromFilter(todayIso());
                  setToFilter(todayIso());
                }}
                className="text-[11px] text-[var(--color-accent)] hover:underline"
              >
                Hoy
              </button>
            </div>
          </div>

          {ciclosQ.isLoading && (
            <div className="px-3 py-6 text-center text-[12px] text-[var(--color-text-dim)]">
              Cargando ciclos…
            </div>
          )}
          {!ciclosQ.isLoading && ciclosHistorial.length === 0 && (
            <div className="px-3 py-6 text-center text-[12px] text-[var(--color-text-dim)]">
              Sin ciclos cerrados en este rango.
            </div>
          )}

          <div className="flex flex-col gap-2">
            {ciclosHistorial.map((c) => (
              <details
                key={c.id}
                className="overflow-hidden rounded-xl border border-[var(--color-border)]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-[var(--color-bg-input)] px-3 py-2.5 text-[12px]">
                  <div className="flex items-center gap-3">
                    <Icon name="chevronRight" size={12} className="text-[var(--color-text-dim)]" />
                    <span className="font-mono text-[var(--color-text-dim)]">
                      {formatDate(c.fecha_apertura)} → {formatDate(c.fecha_cierre)}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        c.estado === "ABIERTO"
                          ? c.vencido
                            ? "bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)] text-[var(--color-danger)]"
                            : "bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] text-[var(--color-accent)]"
                          : "bg-[color-mix(in_srgb,var(--color-text-dim)_14%,transparent)] text-[var(--color-text-dim)]",
                      )}
                    >
                      {c.estado === "ABIERTO"
                        ? c.vencido
                          ? "Vencido"
                          : "Abierto"
                        : "Cerrado"}
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-[var(--color-text-dim)]">
                      Deuda:{" "}
                      <b className="font-grotesk text-[var(--color-danger)]">
                        {formatARS(c.total_adeudado)}
                      </b>
                    </span>
                    <span className="text-[var(--color-text-dim)]">
                      Pagos:{" "}
                      <b className="font-grotesk text-[var(--color-text)]">
                        {formatARS(c.total_pagado)}
                      </b>
                    </span>
                  </div>
                </summary>
                <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-2">
                  <div>
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
                      Deudas
                    </div>
                    <div className="overflow-hidden rounded-md border border-[var(--color-border)]">
                      {c.deudas.map((d, idx) => (
                        <div
                          key={d.id}
                          className={cn(
                            "flex items-center justify-between gap-2 px-2.5 py-1.5 text-[11px]",
                            idx > 0 && "border-t border-[var(--color-border)]",
                          )}
                        >
                          <span className="min-w-0">
                            <span className="font-mono text-[var(--color-text-dim)]">
                              ×{d.cantidad}
                            </span>{" "}
                            <span className="truncate">{d.titulo}</span>
                          </span>
                          <span className="font-grotesk font-semibold text-[var(--color-danger)]">
                            {formatARS(Number(d.total))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
                      Pagos
                    </div>
                    <div className="overflow-hidden rounded-md border border-[var(--color-border)]">
                      {c.pagos.length === 0 && (
                        <div className="px-2.5 py-2 text-[11px] text-[var(--color-text-dim)]">
                          Sin pagos.
                        </div>
                      )}
                      {c.pagos.map((p, idx) => (
                        <div
                          key={p.id}
                          className={cn(
                            "flex items-center justify-between gap-2 px-2.5 py-1.5 text-[11px]",
                            idx > 0 && "border-t border-[var(--color-border)]",
                          )}
                        >
                          <span>
                            <span className="font-mono text-[var(--color-text-dim)]">
                              {formatDate(p.fecha)}
                            </span>{" "}
                            <span className="text-[var(--color-text)]">
                              {CC_PAYMENT_LABELS[p.payment_method] ?? p.payment_method}
                            </span>
                          </span>
                          <span className="font-grotesk font-semibold text-[var(--color-text)]">
                            {formatARS(Number(p.monto))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ClienteCCFormDialog
        open={editingCliente}
        onClose={() => setEditingCliente(false)}
        cliente={cliente}
      />

      <CcDeudaFormDialog
        open={deudaFormOpen && !editingDeuda}
        onClose={() => setDeudaFormOpen(false)}
        clienteId={id}
        oldestFecha={oldestDeudaFechaActual}
      />

      <CcDeudaEditDialog
        open={deudaFormOpen && !!editingDeuda}
        onClose={() => {
          setDeudaFormOpen(false);
          setEditingDeuda(null);
        }}
        deuda={editingDeuda}
        clienteId={id}
        oldestFecha={oldestDeudaFechaActual}
      />

      <CcPagoFormDialog
        open={pagoFormOpen}
        onClose={() => {
          setPagoFormOpen(false);
          setEditingPago(null);
        }}
        cicloId={cicloActual?.id ?? ""}
        clienteId={id}
        pago={editingPago}
        saldoPendiente={cicloActual?.saldo_pendiente}
        oldestFecha={oldestDeudaFechaActual}
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

function DataField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 text-[13px] text-[var(--color-text)]",
          mono && "font-mono",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function SmallStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "danger" | "default" | "accent";
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-grotesk text-[16px] font-semibold",
          tone === "danger" && "text-[var(--color-danger)]",
          tone === "accent" && "text-[var(--color-accent)]",
          tone === "default" && "text-[var(--color-text)]",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function RowBtn({
  title,
  icon,
  onClick,
  tone,
}: {
  title: string;
  icon: "edit" | "trash";
  onClick: () => void;
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
          : "text-[var(--color-text-dim)]",
      )}
    >
      <Icon name={icon} size={12} />
    </button>
  );
}
