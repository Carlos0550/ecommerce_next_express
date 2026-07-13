"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, unwrapError } from "@/lib/api";
import {
  ClienteCCFormSchema,
  type ClienteCCFormInput,
} from "@/lib/schemas/cuenta-corriente";
import type { ClienteCC } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ClienteCCFormDialog({
  open,
  onClose,
  cliente,
}: {
  open: boolean;
  onClose: () => void;
  cliente?: ClienteCC | null;
}) {
  const qc = useQueryClient();
  const isEdit = !!cliente;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClienteCCFormInput>({
    resolver: zodResolver(ClienteCCFormSchema),
    defaultValues: {
      nombre: "",
      telefono: "",
      email: "",
      direccion: "",
      notas: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        nombre: cliente?.nombre ?? "",
        telefono: cliente?.telefono ?? "",
        email: cliente?.email ?? "",
        direccion: cliente?.direccion ?? "",
        notas: cliente?.notas ?? "",
      });
    }
  }, [open, cliente, reset]);

  const mutation = useMutation({
    mutationFn: async (values: ClienteCCFormInput) => {
      const payload = {
        nombre: values.nombre.trim(),
        telefono: values.telefono.trim(),
        email: values.email?.trim() || undefined,
        direccion: values.direccion?.trim() || undefined,
        notas: values.notas?.trim() || undefined,
      };
      if (isEdit && cliente) {
        const { data } = await api.put(
          `/cuentas-corrientes/clientes/${cliente.id}`,
          payload,
        );
        return data;
      }
      const { data } = await api.post(
        "/cuentas-corrientes/clientes",
        payload,
      );
      return data;
    },
    onSuccess: () => {
      toast.success(isEdit ? "Cliente actualizado" : "Cliente creado");
      qc.invalidateQueries({ queryKey: ["cc-clientes"] });
      onClose();
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px] bg-[var(--color-bg-elev)] text-[var(--color-text)]">
        <DialogHeader>
          <DialogTitle className="font-grotesk text-[20px]">
            {isEdit ? "Editar cliente" : "Nuevo cliente"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="flex flex-col gap-3.5"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
                Nombre completo
              </div>
              <input
                {...register("nombre")}
                placeholder="Nombre y apellido"
                className={inputCls}
              />
              {errors.nombre && (
                <div className="mt-1 text-[11px] text-[var(--color-danger)]">
                  {errors.nombre.message}
                </div>
              )}
            </label>

            <label className="block">
              <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
                Teléfono
              </div>
              <input
                {...register("telefono")}
                placeholder="+54 9 11 1234-5678"
                className={inputCls + " font-mono"}
              />
              {errors.telefono && (
                <div className="mt-1 text-[11px] text-[var(--color-danger)]">
                  {errors.telefono.message}
                </div>
              )}
            </label>
          </div>

          <label className="block">
            <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
              Email <span className="opacity-50">(opcional)</span>
            </div>
            <input
              type="email"
              {...register("email")}
              placeholder="cliente@email.com"
              className={inputCls}
            />
            {errors.email && (
              <div className="mt-1 text-[11px] text-[var(--color-danger)]">
                {errors.email.message}
              </div>
            )}
          </label>

          <label className="block">
            <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
              Dirección <span className="opacity-50">(opcional)</span>
            </div>
            <input
              {...register("direccion")}
              placeholder="Calle, número, ciudad"
              className={inputCls}
            />
          </label>

          <label className="block">
            <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
              Notas <span className="opacity-50">(opcional)</span>
            </div>
            <textarea
              {...register("notas")}
              rows={2}
              placeholder="Observaciones internas"
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
