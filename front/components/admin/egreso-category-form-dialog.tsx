"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, unwrapError } from "@/lib/api";
import {
  EgresoCategoryFormSchema,
  type EgresoCategoryFormInput,
} from "@/lib/schemas/egreso";
import type { EgresoCategory } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function EgresoCategoryFormDialog({
  open,
  onClose,
  category,
}: {
  open: boolean;
  onClose: () => void;
  category?: EgresoCategory | null;
}) {
  const qc = useQueryClient();
  const isEdit = !!category;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EgresoCategoryFormInput>({
    resolver: zodResolver(EgresoCategoryFormSchema),
    defaultValues: { title: "", description: "", color: "" },
  });

  useEffect(() => {
    if (open) {
      reset({
        title: category?.title ?? "",
        description: category?.description ?? "",
        color: category?.color ?? "",
      });
    }
  }, [open, category, reset]);

  const mutation = useMutation({
    mutationFn: async (values: EgresoCategoryFormInput) => {
      const payload: Record<string, unknown> = {
        title: values.title,
      };
      if (values.description && values.description.trim()) {
        payload.description = values.description.trim();
      }
      if (values.color && /^#/.test(values.color)) {
        payload.color = values.color;
      }
      if (isEdit && category) {
        const { data } = await api.put(
          `/egresos/categories/${category.id}`,
          payload,
        );
        return data;
      }
      const { data } = await api.post("/egresos/categories", payload);
      return data;
    },
    onSuccess: () => {
      toast.success(isEdit ? "Categoría actualizada" : "Categoría creada");
      qc.invalidateQueries({ queryKey: ["egreso-categories"] });
      onClose();
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px] bg-[var(--color-bg-elev)] text-[var(--color-text)]">
        <DialogHeader>
          <DialogTitle className="font-grotesk text-[20px]">
            {isEdit ? "Editar categoría" : "Nueva categoría de egreso"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="flex flex-col gap-3.5"
        >
          <label className="block">
            <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
              Nombre
            </div>
            <input
              {...register("title")}
              placeholder="Alquiler, Sueldos, Insumos…"
              className={inputCls}
            />
            {errors.title && (
              <div className="mt-1 text-[11px] text-[var(--color-danger)]">
                {errors.title.message}
              </div>
            )}
          </label>

          <label className="block">
            <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
              Descripción <span className="opacity-50">(opcional)</span>
            </div>
            <textarea
              {...register("description")}
              rows={2}
              placeholder="Detalle breve"
              className={inputCls + " min-h-[60px] py-2 leading-snug"}
            />
          </label>

          <div className="block">
            <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
              Color <span className="opacity-50">(opcional)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <input
                type="color"
                {...register("color")}
                className="h-10 w-12 cursor-pointer rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-input)] p-1"
              />
              <input
                type="text"
                {...register("color")}
                placeholder="#ff5577"
                className={inputCls + " font-mono"}
              />
            </div>
            {errors.color && (
              <div className="mt-1 text-[11px] text-[var(--color-danger)]">
                {errors.color.message}
              </div>
            )}
          </div>

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
