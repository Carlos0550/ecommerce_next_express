"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, unwrapError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AdminShell } from "@/components/admin/admin-shell";
import { Icon } from "@/components/brand";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FAQ } from "@/lib/types";

const FaqSchema = z.object({
  question: z.string().min(1, "Requerido"),
  answer: z.string().min(1, "Requerido"),
  position: z.coerce.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});
type FaqForm = z.input<typeof FaqSchema>;

type FaqListResp = {
  ok?: boolean;
  faqs?: FAQ[];
  data?: FAQ[];
};

export default function AdminFaqPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FAQ | null>(null);

  const listQ = useQuery({
    queryKey: ["faqs", "admin"],
    queryFn: async () => {
      const { data } = await api.get<FaqListResp>("/faq/admin?page=1&limit=100");
      return data.faqs ?? data.data ?? [];
    },
  });

  const faqs = listQ.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FaqForm>({
    resolver: zodResolver(FaqSchema),
    defaultValues: { question: "", answer: "", position: 0, is_active: true },
  });

  useEffect(() => {
    if (open) {
      reset({
        question: editing?.question ?? "",
        answer: editing?.answer ?? "",
        position: editing?.position ?? 0,
        is_active: editing?.is_active ?? true,
      });
    }
  }, [open, editing, reset]);

  const saveMut = useMutation({
    mutationFn: async (values: FaqForm) => {
      const body = {
        ...values,
        position: Number(values.position) || 0,
        is_active: !!values.is_active,
      };
      if (editing) {
        const { data } = await api.put(`/faq/${editing.id}`, body);
        return data;
      }
      const { data } = await api.post(`/faq`, body);
      return data;
    },
    onSuccess: () => {
      toast.success(editing ? "FAQ actualizada" : "FAQ creada");
      qc.invalidateQueries({ queryKey: ["faqs"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: FAQ["id"]) => {
      await api.delete(`/faq/${id}`);
    },
    onSuccess: () => {
      toast.success("FAQ eliminada");
      qc.invalidateQueries({ queryKey: ["faqs"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };

  return (
    <AdminShell
      title="FAQ"
      subtitle={`${faqs.length} preguntas frecuentes`}
      actions={
        <button
          onClick={openNew}
          className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-3 text-[12px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)] md:h-auto md:px-3.5 md:py-2.5 md:text-[13px]"
        >
          <Icon name="plus" size={14} />
          <span className="hidden sm:inline">Nueva pregunta</span>
          <span className="sm:hidden">Nueva</span>
        </button>
      }
    >
      {listQ.isLoading && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-10 text-center text-sm text-[var(--color-text-dim)]">
          Cargando…
        </div>
      )}

      {!listQ.isLoading && faqs.length === 0 && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-12 text-center">
          <div className="font-grotesk text-[16px] font-semibold text-[var(--color-text)]">
            Sin preguntas cargadas
          </div>
          <div className="mt-1 text-[13px] text-[var(--color-text-dim)]">
            Armá la primera para acompañar a tus clientes.
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {faqs.map((f) => (
          <div
            key={f.id}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-[var(--color-bg-input)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-dim)]">
                    #{f.position}
                  </span>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                      f.is_active
                        ? "bg-[color-mix(in_srgb,var(--color-success)_18%,transparent)] text-[var(--color-success)]"
                        : "bg-[color-mix(in_srgb,var(--color-warn)_18%,transparent)] text-[var(--color-warn)]"
                    )}
                  >
                    {f.is_active ? "Visible" : "Oculta"}
                  </span>
                </div>
                <div className="mt-1.5 font-grotesk text-[15px] font-semibold text-[var(--color-text)]">
                  {f.question}
                </div>
                <div className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--color-text-dim)]">
                  {f.answer}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => {
                    setEditing(f);
                    setOpen(true);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text-dim)] hover:bg-[var(--color-bg-input)]"
                  title="Editar"
                >
                  <Icon name="edit" size={13} />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Eliminar "${f.question}"?`)) deleteMut.mutate(f.id);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-danger)] hover:bg-[var(--color-bg-input)]"
                  title="Eliminar"
                >
                  <Icon name="trash" size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent className="sm:max-w-[520px] bg-[var(--color-bg-elev)] text-[var(--color-text)]">
          <DialogHeader>
            <DialogTitle className="font-grotesk text-[18px]">
              {editing ? "Editar pregunta" : "Nueva pregunta"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((d) => saveMut.mutate(d))}
            className="flex flex-col gap-3"
          >
            <label className="block">
              <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
                Pregunta
              </div>
              <input
                {...register("question")}
                placeholder="¿Hacen envíos a todo el país?"
                className={inputCls}
              />
              {errors.question && (
                <div className="mt-1 text-[11px] text-[var(--color-danger)]">
                  {errors.question.message}
                </div>
              )}
            </label>
            <label className="block">
              <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
                Respuesta
              </div>
              <textarea
                {...register("answer")}
                rows={4}
                className={inputCls + " resize-none py-2.5"}
                placeholder="Sí, despachamos con Correo Argentino y privados…"
              />
              {errors.answer && (
                <div className="mt-1 text-[11px] text-[var(--color-danger)]">
                  {errors.answer.message}
                </div>
              )}
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
                  Posición
                </div>
                <input
                  type="number"
                  {...register("position")}
                  className={inputCls}
                />
              </label>
              <label className="mt-6 flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  {...register("is_active")}
                  className="h-4 w-4 accent-[var(--color-accent)]"
                />
                Visible en el shop
              </label>
            </div>
            <DialogFooter className="mt-2 flex-row gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3.5 py-2.5 text-[13px] font-medium text-[var(--color-text)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saveMut.isPending}
                className="flex-1 rounded-[10px] bg-[var(--color-accent)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
              >
                {saveMut.isPending ? "Guardando…" : editing ? "Guardar" : "Crear"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 text-[13px] text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]";
