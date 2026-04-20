"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/brand";
import type { BankData } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  accounts: BankData[] | null | undefined;
};

export function BankDataDisplay({ accounts }: Props) {
  const list = (accounts ?? []).filter(
    (a) => a.bank_name || a.account_holder || a.account_number || a.cbu || a.alias
  );

  if (list.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-input)] p-4 text-[12px] text-[var(--color-text-dim)]">
        El negocio aún no cargó datos bancarios. Elegí otro método o contactanos.
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
        Datos para transferencia
      </div>
      {list.map((a, i) => (
        <div
          key={a.id ?? i}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] p-4"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[13px] font-semibold text-[var(--color-text)]">
              {a.bank_name || "Banco"}
            </div>
            {a.account_holder && (
              <div className="text-[11px] text-[var(--color-text-dim)]">
                {a.account_holder}
              </div>
            )}
          </div>
          <div className="grid gap-2">
            {a.cbu && <BankRow label="CBU" value={a.cbu} mono />}
            {a.alias && <BankRow label="Alias" value={a.alias} mono />}
            {a.account_number && (
              <BankRow label="Nº cuenta" value={a.account_number} mono />
            )}
          </div>
        </div>
      ))}
      <p className="text-[11px] leading-relaxed text-[var(--color-text-dim)]">
        Realizá la transferencia y confirmá tu pedido. Te contactaremos para
        verificar el comprobante.
      </p>
    </div>
  );
}

function BankRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copiado`);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("No pudimos copiar al portapapeles");
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--color-bg-card)] px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[var(--color-text-dim)]">
          {label}
        </div>
        <div
          className={cn(
            "truncate text-[13px] text-[var(--color-text)]",
            mono && "font-mono"
          )}
        >
          {value}
        </div>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 text-[11px] font-semibold text-[var(--color-text-dim)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      >
        <Icon name={copied ? "check" : "copy"} size={12} />
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
