"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, unwrapError } from "@/lib/api";
import {
  EgresoFormSchema,
  EGRESO_PAYMENT_METHODS,
  type EgresoFormInput,
} from "@/lib/schemas/egreso";
import type { Egreso, EgresoCategory } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PAYMENT_LABELS: Record<(typeof EGRESO_PAYMENT_METHODS)[number], string> =
  {
    TARJETA: "Tarjeta",
    EFECTIVO: "Efectivo",
    QR: "QR",
    NINGUNO: "Ninguno",
    TRANSFERENCIA: "Transferencia",
  };

const todayIso = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export function EgresoFormDialog({
  open,
  onClose,
  egreso,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  egreso?: Egreso | null;
  categories: EgresoCategory[];
}) {
  const qc = useQueryClient();
  const isEdit = !!egreso;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EgresoFormInput>({
    resolver: zodResolver(EgresoFormSchema),
    defaultValues: {
      title: "",
      description: "",
      amount: 0,
      payment_method: "EFECTIVO",
      category_id: "",
      egreso_date: todayIso(),
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        title: egreso?.title ?? "",
        description: egreso?.description ?? "",
        amount: egreso ? Number(egreso.amount) : 0,
        payment_method: egreso?.payment_method ?? "EFECTIVO",
        category_id: egreso?.categoryId ?? "",
        egreso_date: egreso?.egreso_date
          ? String(egreso.egreso_date).slice(0, 10)
          : todayIso(),
      });
    }
  }, [open, egreso, reset]);

  const mutation = useMutation({
    mutationFn: async (values: EgresoFormInput) => {
      const payload = {
        title: values.title,
        description: values.description?.trim() || undefined,
        amount: values.amount,
        payment_method: values.payment_method,
        category_id: values.category_id,
        egreso_date: values.egreso_date,
      };
      if (isEdit && egreso) {
        const { data } = await api.put(`/egresos/${egreso.id}`, payload);
        return data;
      }
      const { data } = await api.post("/egresos/save", payload);
      return data;
    },
    onSuccess: () => {
      toast.success(isEdit ? "Egreso actualizado" : "Egreso creado");
      qc.invalidateQueries({ queryKey: ["egresos"] });
      qc.invalidateQueries({ queryKey: ["egreso-categories"] });
      onClose();
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px] bg-[var(--color-bg-elev)] text-[var(--color-text)]">
        <DialogHeader>
          <DialogTitle className="font-grotesk text-[20px]">
            {isEdit ? "Editar egreso" : "Nuevo egreso"}
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
            <input
              {...register("title")}
              placeholder="Pago de alquiler, Sueldo Ana, etc."
              className={inputCls}
            />
            {errors.title && (
              <div className="mt-1 text-[11px] text-[var(--color-danger)]">
                {errors.title.message}
              </div>
            )}
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
                Monto
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register("amount", { valueAsNumber: true })}
                placeholder="0.00"
                className={inputCls}
              />
              {errors.amount && (
                <div className="mt-1 text-[11px] text-[var(--color-danger)]">
                  {errors.amount.message}
                </div>
              )}
            </label>

            <label className="block">
              <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
                Fecha
              </div>
              <input
                type="date"
                {...register("egreso_date")}
                className={inputCls}
              />
              {errors.egreso_date && (
                <div className="mt-1 text-[11px] text-[var(--color-danger)]">
                  {errors.egreso_date.message}
                </div>
              )}
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
                Categoría
              </div>
              <select
                {...register("category_id")}
                className={inputCls}
                disabled={categories.length === 0}
              >
                <option value="">
                  {categories.length === 0
                    ? "Creá una categoría primero"
                    : "Seleccionar…"}
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              {errors.category_id && (
                <div className="mt-1 text-[11px] text-[var(--color-danger)]">
                  {errors.category_id.message}
                </div>
              )}
            </label>

            <label className="block">
              <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
                Método de pago
              </div>
              <select {...register("payment_method")} className={inputCls}>
                {EGRESO_PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_LABELS[m]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
              Descripción <span className="opacity-50">(opcional)</span>
            </div>
            <textarea
              {...register("description")}
              rows={2}
              placeholder="Notas adicionales"
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
              {mutation.isPending
                ? "Guardando…"
                : isEdit
                  ? "Guardar"
                  : "Crear"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 text-[13px] text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]";
