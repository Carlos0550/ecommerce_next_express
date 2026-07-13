"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, unwrapError } from "@/lib/api";
import {
  DeudaEditSchema,
  todayIso,
  type DeudaEditInput,
} from "@/lib/schemas/cuenta-corriente";
import type { DeudaCC } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CcDeudaEditDialog({
  open,
  onClose,
  deuda,
  clienteId,
  oldestFecha,
}: {
  open: boolean;
  onClose: () => void;
  deuda: DeudaCC | null;
  clienteId: string;
  oldestFecha?: string | null;
}) {
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DeudaEditInput>({
    resolver: zodResolver(DeudaEditSchema),
    defaultValues: {
      cantidad: 1,
      titulo: "",
      precio_unit: 0,
      fecha: todayIso(),
      notas: "",
    },
  });

  useEffect(() => {
    if (open && deuda) {
      reset({
        cantidad: Number(deuda.cantidad),
        titulo: deuda.titulo,
        precio_unit: Number(deuda.precio_unit),
        fecha: String(deuda.fecha).slice(0, 10),
        notas: deuda.notas ?? "",
      });
    }
  }, [open, deuda, reset]);

  const mutation = useMutation({
    mutationFn: async (values: DeudaEditInput) => {
      const payload = {
        cantidad: values.cantidad,
        titulo: values.titulo.trim(),
        precio_unit: values.precio_unit,
        fecha: values.fecha,
        notas: values.notas?.trim() || undefined,
      };
      const { data } = await api.put(
        `/cuentas-corrientes/deudas/${deuda!.id}`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      toast.success("Deuda actualizada");
      qc.invalidateQueries({ queryKey: ["cc-cliente", clienteId] });
      qc.invalidateQueries({ queryKey: ["cc-clientes"] });
      onClose();
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px] bg-[var(--color-bg-elev)] text-[var(--color-text)]">
        <DialogHeader>
          <DialogTitle className="font-grotesk text-[18px]">
            Editar deuda
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="flex flex-col gap-3.5"
        >
          <label className="block">
            <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
              Título
            </div>
            <input {...register("titulo")} className={inputCls} />
            {errors.titulo && (
              <div className="mt-1 text-[11px] text-[var(--color-danger)]">
                {errors.titulo.message}
              </div>
            )}
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
                Cantidad
              </div>
              <input
                type="number"
                step={1}
                min={1}
                {...register("cantidad", { valueAsNumber: true })}
                className={inputCls}
              />
              {errors.cantidad && (
                <div className="mt-1 text-[11px] text-[var(--color-danger)]">
                  {errors.cantidad.message}
                </div>
              )}
            </label>

            <label className="block">
              <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
                Precio unitario
              </div>
              <input
                type="number"
                step="0.01"
                min={0}
                {...register("precio_unit", { valueAsNumber: true })}
                className={inputCls}
              />
              {errors.precio_unit && (
                <div className="mt-1 text-[11px] text-[var(--color-danger)]">
                  {errors.precio_unit.message}
                </div>
              )}
            </label>
          </div>

          <label className="block">
            <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
              Fecha
            </div>
            <input
              type="date"
              {...register("fecha")}
              max={todayIso()}
              min={oldestFecha ?? undefined}
              className={inputCls}
            />
            {errors.fecha && (
              <div className="mt-1 text-[11px] text-[var(--color-danger)]">
                {errors.fecha.message}
              </div>
            )}
          </label>

          <label className="block">
            <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
              Notas <span className="opacity-50">(opcional)</span>
            </div>
            <textarea
              {...register("notas")}
              rows={2}
              className={inputCls + " min-h-[60px] py-2 leading-snug"}
            />
          </label>

          <DialogFooter className="mt-2 flex-row gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3.5 py-2.5 text-[13px] font-medium text-[var(--color-text)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 rounded-[10px] bg-[var(--color-accent)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
            >
              {mutation.isPending ? "Guardando…" : "Guardar"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 text-[13px] text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]";
