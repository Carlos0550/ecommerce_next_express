"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, unwrapError } from "@/lib/api";
import {
  DeudaBulkFormSchema,
  parseProductosPreview,
  todayIso,
  type DeudaBulkFormInput,
} from "@/lib/schemas/cuenta-corriente";
import { formatARS } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CcDeudaFormDialog({
  open,
  onClose,
  clienteId,
  oldestFecha,
}: {
  open: boolean;
  onClose: () => void;
  clienteId: string;
  oldestFecha?: string | null;
}) {
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<DeudaBulkFormInput>({
    resolver: zodResolver(DeudaBulkFormSchema),
    defaultValues: {
      productos: "",
      fecha_default: todayIso(),
    },
  });

  useEffect(() => {
    if (open) {
      reset({ productos: "", fecha_default: todayIso() });
    }
  }, [open, reset]);

  const productosText = watch("productos");

  const preview = useMemo(
    () => parseProductosPreview(productosText ?? ""),
    [productosText],
  );
  const totalLote = preview.reduce((acc, l) => acc + l.total, 0);
  const hasErrors = preview.some((l) => l.error);

  const minFecha = oldestFecha ?? null;

  const mutation = useMutation({
    mutationFn: async (values: DeudaBulkFormInput) => {
      const { data } = await api.post(
        `/cuentas-corrientes/clientes/${clienteId}/deudas`,
        {
          productos: values.productos,
          fecha_default: values.fecha_default,
        },
      );
      return data;
    },
    onSuccess: () => {
      toast.success("Deudas añadidas");
      qc.invalidateQueries({ queryKey: ["cc-cliente", clienteId] });
      qc.invalidateQueries({ queryKey: ["cc-clientes"] });
      onClose();
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[620px] bg-[var(--color-bg-elev)] text-[var(--color-text)]">
        <DialogHeader>
          <DialogTitle className="font-grotesk text-[20px]">
            Añadir deudas
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="flex flex-col gap-3.5"
        >
          <label className="block">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="text-[11px] font-semibold text-[var(--color-text-dim)]">
                Productos
              </div>
              <div className="text-[10px] text-[var(--color-text-muted)]">
                Formato: CANTIDAD TITULO PRECIO · una línea por producto
              </div>
            </div>
            <textarea
              {...register("productos")}
              rows={6}
              placeholder={
                "2 Remera 5.000,00\n1 Parlanita 12.300\n3 Gorra 1.200,50"
              }
              className={inputCls + " min-h-[140px] resize-y py-2.5 font-mono text-[12px] leading-relaxed"}
            />
            <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">
              Precio unitario en ARS · <b>.</b> miles · <b>,</b> decimales · total = cantidad × precio
            </div>
            {errors.productos && (
              <div className="mt-1 text-[11px] text-[var(--color-danger)]">
                {errors.productos.message}
              </div>
            )}
          </label>

          <label className="block">
            <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
              Fecha del lote
            </div>
            <input
              type="date"
              {...register("fecha_default")}
              max={todayIso()}
              min={minFecha ?? undefined}
              className={inputCls}
            />
            <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">
              Aplica a todas las líneas. No puede ser futura
              {minFecha && <> ni anterior a {minFecha}</>}.
            </div>
            {errors.fecha_default && (
              <div className="mt-1 text-[11px] text-[var(--color-danger)]">
                {errors.fecha_default.message}
              </div>
            )}
          </label>

          {preview.length > 0 && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
                  Preview
                </div>
                <div className="text-[11px] text-[var(--color-text-dim)]">
                  {preview.length} {preview.length === 1 ? "producto" : "productos"} ·{" "}
                  <span className="font-grotesk font-semibold text-[var(--color-text)]">
                    {formatARS(totalLote)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                {preview.map((l, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 text-[12px]"
                  >
                    <span className="w-8 shrink-0 text-right font-mono text-[var(--color-text-dim)]">
                      {l.cantidad > 0 ? `×${l.cantidad}` : "—"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[var(--color-text)]">
                      {l.titulo}
                    </span>
                    <span className="shrink-0 font-mono text-[var(--color-text-dim)]">
                      {l.error ? (
                        <span className="text-[var(--color-danger)]">{l.error}</span>
                      ) : (
                        <>
                          {formatARS(l.precio_unit)} ·{" "}
                          <span className="font-semibold text-[var(--color-text)]">
                            {formatARS(l.total)}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
              disabled={mutation.isPending || hasErrors || preview.length === 0}
              className="flex-1 rounded-[10px] bg-[var(--color-accent)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
            >
              {mutation.isPending ? "Guardando…" : "Añadir"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 text-[13px] text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]";
