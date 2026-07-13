"use client";

import { useState } from "react";
import { Icon } from "@/components/brand";
import { BankDialog } from "../_components/bank-dialog";
import type { BankData, Business } from "@/lib/types";
import { SaveBar } from "./identidad-section";

type Props = {
  data: Business;
  initial: Business;
  onChange: (patch: Partial<Business>) => void;
  onSaved: () => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
};

function banksEqual(a: BankData[] = [], b: BankData[] = []) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function PagosSection({
  data,
  initial,
  onChange,
  onSaved,
  saving,
  setSaving,
}: Props) {
  const [editing, setEditing] = useState<BankData | null>(null);
  const [open, setOpen] = useState(false);

  const banks = data.bankData ?? [];
  const initialBanks = initial.bankData ?? [];

  const dirty = !banksEqual(banks, initialBanks);

  const openNew = () => {
    setEditing({
      bank_name: "",
      account_holder: "",
      account_number: "",
      alias: "",
      cbu: "",
    });
    setOpen(true);
  };

  const openEdit = (bank: BankData) => {
    setEditing(bank);
    setOpen(true);
  };

  const handleSave = (values: {
    bank_name: string;
    account_holder: string;
    account_number: string;
    alias?: string;
    cbu?: string;
  }) => {
    const next: BankData = {
      ...(editing ?? {}),
      ...values,
      alias: values.alias || null,
      cbu: values.cbu || null,
    };
    let newBanks: BankData[];
    if (editing?.id && banks.some((b) => b.id === editing.id)) {
      newBanks = banks.map((b) => (b.id === editing.id ? next : b));
    } else {
      newBanks = [...banks, next];
    }
    onChange({ bankData: newBanks });
    setOpen(false);
    setEditing(null);
  };

  const handleRemove = (bank: BankData) => {
    onChange({
      bankData: banks.filter((b) => b.id !== bank.id),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
              Cuentas bancarias
            </div>
            <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">
              Se muestran al cliente al elegir transferencia.
            </div>
          </div>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text)] hover:bg-[var(--color-bg-input)]"
          >
            <Icon name="plus" size={12} />
            Agregar cuenta
          </button>
        </div>

        {banks.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center">
            <div className="font-grotesk text-[14px] font-semibold text-[var(--color-text)]">
              Sin cuentas cargadas
            </div>
            <div className="mt-1 text-[12px] text-[var(--color-text-dim)]">
              Sumá al menos una para recibir transferencias.
            </div>
            <button
              type="button"
              onClick={openNew}
              className="mt-3 inline-flex items-center gap-1.5 rounded-[10px] bg-[var(--color-accent)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)]"
            >
              <Icon name="plus" size={12} />
              Agregar primera cuenta
            </button>
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {banks.map((b, i) => (
              <li
                key={b.id ?? i}
                className="group flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 py-2.5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-card)] text-[var(--color-accent)]">
                  <Icon name="wallet" size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <div className="truncate text-[13px] font-semibold text-[var(--color-text)]">
                      {b.bank_name || "Sin banco"}
                    </div>
                    <div className="truncate text-[11px] text-[var(--color-text-dim)]">
                      {b.account_holder || "—"}
                    </div>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] text-[var(--color-text-dim)]">
                    {b.alias && <span>{b.alias}</span>}
                    {b.cbu && <span>CBU {b.cbu}</span>}
                    {b.account_number && (
                      <span>Cta {b.account_number}</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => openEdit(b)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-dim)] hover:bg-[var(--color-bg-input)]"
                    title="Editar"
                  >
                    <Icon name="edit" size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(b)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-danger)] hover:bg-[var(--color-bg-input)]"
                    title="Eliminar"
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={() => {
          setSaving(true);
          onSaved();
        }}
      />

      <BankDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditing(null);
        }}
        bank={editing}
        onSave={handleSave}
      />
    </div>
  );
}