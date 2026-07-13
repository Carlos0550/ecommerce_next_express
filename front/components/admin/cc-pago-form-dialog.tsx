"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, unwrapError } from "@/lib/api";
import {
  CC_PAYMENT_LABELS,
  CC_PAYMENT_METHODS,
  PagoFormSchema,
  todayIso,
  type PagoFormInput,
} from "@/lib/schemas/cuenta-corriente";
import type { PagoCC } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CcPagoFormDialog({
  open,
  onClose,
  cicloId,
  clienteId,
  pago,
  saldoPendiente,
  oldestFecha,
}: {
  open: boolean;
  onClose: () => void;
  cicloId: string;
  clienteId: string;
  pago?: PagoCC | null;
  saldoPendiente?: number;
  oldestFecha?: string | null;
}) {
  const qc = useQueryClient();
  const isEdit = !!pago;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PagoFormInput>({
    resolver: zodResolver(PagoFormSchema),
    defaultValues: {
      monto: 0,
      payment_method: "EFECTIVO",
      fecha: todayIso(),
      notas: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        monto: pago ? Number(pago.monto) : saldoPendiente ?? 0,
        payment_method: pago?.payment_method ?? "EFECTIVO",
        fecha: pago ? String(pago.fecha).slice(0, 10) : todayIso(),
        notas: pago?.notas ?? "",
      });
    }
  }, [open, pago, saldoPendiente, reset]);

  const monto = watch("monto");

  const mutation = useMutation({
    mutationFn: async (values: PagoFormInput) => {
      const payload = {
        monto: values.monto,
        payment_method: values.payment_method,
        fecha: values.fecha,
        notas: values.notas?.trim() || undefined,
      };
      if (isEdit && pago) {
        const { data } = await api.put(
          `/cuentas-corrientes/pagos/${pago.id}`,
          payload,
        );
        return data;
      }
      const { data } = await api.post(
        `/cuentas-corrientes/ciclos/${cicloId}/pagos`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      toast.success(isEdit ? "Pago actualizado" : "Pago registrado");
      qc.invalidateQueries({ queryKey: ["cc-cliente", clienteId] });
      qc.invalidateQueries({ queryKey: ["cc-clientes"] });
      onClose();
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const overSaldo = !isEdit && saldoPendiente != null && Number(monto) > saldoPendiente;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px] bg-[var(--color-bg-elev)] text-[var(--color-text)]">
        <DialogHeader>
          <DialogTitle className="font-grotesk text-[18px]">
            {isEdit ? "Editar pago" : "Registrar pago"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="flex flex-col gap-3.5"
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
                Monto
              </div>
              <input
                type="number"
                step="0.01"
                min={0}
                {...register("monto", { valueAsNumber: true })}
                className={inputCls}
              />
              {errors.monto && (
                <div className="mt-1 text-[11px] text-[var(--color-danger)]">
                  {errors.monto.message}
                </div>
              )}
              {overSaldo && (
                <div className="mt-1 text-[11px] text-[var(--color-danger)]">
                  Excede el saldo pendiente ({saldoPendiente?.toFixed(2)})
                </div>
              )}
            </label>

            <label className="block">
              <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
                Fecha de pago
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
          </div>

          <label className="block">
            <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
              Método de pago
            </div>
            <select {...register("payment_method")} className={inputCls}>
              {CC_PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {CC_PAYMENT_LABELS[m]}
                </option>
              ))}
            </select>
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
              disabled={mutation.isPending || overSaldo}
              className="flex-1 rounded-[10px] bg-[var(--color-accent)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
            >
              {mutation.isPending ? "Guardando…" : isEdit ? "Guardar" : "Registrar"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 text-[13px] text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]";
