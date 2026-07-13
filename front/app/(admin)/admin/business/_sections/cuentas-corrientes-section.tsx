"use client";

import type { Business } from "@/lib/types";
import { Icon } from "@/components/brand";
import { SaveBar } from "./identidad-section";

type Props = {
  data: Business;
  initial: Business;
  onChange: (patch: Partial<Business>) => void;
  onSaved: () => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
};

const inputCls =
  "h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 text-[13px] text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]";

export function CuentasCorrientesSection({
  data,
  initial,
  onChange,
  onSaved,
  saving,
  setSaving,
}: Props) {
  const dirty = (data.cc_vencimiento_dias ?? 30) !== (initial.cc_vencimiento_dias ?? 30);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
            Vencimiento de ciclos
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)]">
            Días sin pago para marcar un ciclo como vencido
          </div>
        </div>
        <div className="mt-3 max-w-[320px]">
          <label>
            <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
              Días de vencimiento
            </div>
            <input
              type="number"
              min={1}
              max={365}
              value={data.cc_vencimiento_dias ?? 30}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                onChange({
                  cc_vencimiento_dias: Number.isFinite(v) && v > 0 ? v : 30,
                });
              }}
              className={inputCls}
            />
          </label>
          <div className="mt-2 text-[12px] leading-snug text-[var(--color-text-dim)]">
            Un ciclo abierto se marca como <b>vencido</b> cuando pasan más de{" "}
            <b>{data.cc_vencimiento_dias ?? 30}</b> días desde el último pago
            registrado (o desde la apertura, si no hay pagos). Cualquier pago
            nuevo resetea el contador.
          </div>
        </div>
      </div>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={() => {
          setSaving(true);
          onSaved();
        }}
      />
    </div>
  );
}

export { Icon };
