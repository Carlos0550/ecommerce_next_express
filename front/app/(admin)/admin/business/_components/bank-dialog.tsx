"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BankData } from "@/lib/types";

const Schema = z.object({
  bank_name: z.string().min(1, "Requerido"),
  account_holder: z.string().min(1, "Requerido"),
  account_number: z.string().min(1, "Requerido"),
  alias: z.string().optional().or(z.literal("")),
  cbu: z.string().optional().or(z.literal("")),
});
type Form = z.input<typeof Schema>;

const inputCls =
  "h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 text-[13px] text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bank?: BankData | null;
  onSave: (values: Form) => void;
  busy?: boolean;
};

export function BankDialog({ open, onOpenChange, bank, onSave, busy }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(Schema),
    defaultValues: {
      bank_name: "",
      account_holder: "",
      account_number: "",
      alias: "",
      cbu: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        bank_name: bank?.bank_name ?? "",
        account_holder: bank?.account_holder ?? "",
        account_number: bank?.account_number ?? "",
        alias: bank?.alias ?? "",
        cbu: bank?.cbu ?? "",
      });
    }
  }, [open, bank, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--color-bg-elev)] text-[var(--color-text)] sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="font-grotesk text-[18px]">
            {bank?.id ? "Editar cuenta" : "Nueva cuenta"}
          </DialogTitle>
        </DialogHeader>

        <form
          id="bank-form"
          onSubmit={handleSubmit((d) => onSave(d))}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <Field label="Banco" error={errors.bank_name?.message} full>
            <input
              {...register("bank_name")}
              placeholder="Ej: Galicia"
              className={inputCls}
            />
          </Field>
          <Field label="Titular" error={errors.account_holder?.message} full>
            <input
              {...register("account_holder")}
              placeholder="Nombre completo"
              className={inputCls}
            />
          </Field>
          <Field label="Nº cuenta" error={errors.account_number?.message}>
            <input
              {...register("account_number")}
              placeholder="0000-0000-0000"
              className={inputCls + " font-mono"}
            />
          </Field>
          <Field label="CBU" error={errors.cbu?.message}>
            <input
              {...register("cbu")}
              placeholder="22 dígitos"
              maxLength={22}
              className={inputCls + " font-mono"}
            />
          </Field>
          <Field label="Alias" error={errors.alias?.message} full>
            <input
              {...register("alias")}
              placeholder="ej: rosa.luna.perro"
              className={inputCls + " font-mono"}
            />
          </Field>
        </form>

        <DialogFooter className="mt-2 flex-row gap-2 [&>*]:flex-1">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3.5 py-2.5 text-[13px] font-medium text-[var(--color-text)]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="bank-form"
            disabled={busy}
            className="rounded-[10px] bg-[var(--color-accent)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
          >
            {busy ? "Guardando…" : bank?.id ? "Guardar" : "Agregar"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  error,
  full,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  full?: boolean;
}) {
  return (
    <label className={full ? "sm:col-span-2" : ""}>
      <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
        {label}
      </div>
      {children}
      {error && (
        <div className="mt-1 text-[11px] text-[var(--color-danger)]">
          {error}
        </div>
      )}
    </label>
  );
}