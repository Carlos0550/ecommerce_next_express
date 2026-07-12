"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, unwrapError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { BannerEditor, DEFAULT_BANNER } from "@/components/admin/banner-editor";
import { Icon } from "@/components/brand";
import { usePaletteStore, type PaletteName } from "@/stores/palette.store";
import type { Business } from "@/lib/types";
import { SaveBar } from "./identidad-section";

type Props = {
  data: Business;
  initial: Business;
  onChange: (patch: Partial<Business>) => void;
  onSaved: () => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
};

const PALETTES: { id: PaletteName; label: string; swatch: string[] }[] = [
  { id: "kuromi", label: "Kuromi", swatch: ["#0a0a0a", "#b694ff", "#e0c3fc"] },
  { id: "mono", label: "Mono", swatch: ["#ffffff", "#000000", "#d4d4d4"] },
  { id: "blush", label: "Blush", swatch: ["#fff4f3", "#ff6b6b", "#ffc4bd"] },
  { id: "sage", label: "Sage", swatch: ["#edf1e9", "#6f8e5a", "#c9a961"] },
  { id: "ocean", label: "Ocean", swatch: ["#e8eff3", "#1f87a6", "#4fb3cf"] },
  { id: "sunset", label: "Sunset", swatch: ["#fbedde", "#e16b3b", "#f0a35e"] },
  {
    id: "midnight",
    label: "Midnight",
    swatch: ["#07090f", "#6fa4ff", "#4fe3d6"],
  },
  {
    id: "argentina",
    label: "Mundial Argentina",
    swatch: ["#e8f1f9", "#3a7cb8", "#f6b40e"],
  },
];

function isDirtyApariencia(data: Business, initial: Business) {
  return JSON.stringify(data.banner_config ?? null) !== JSON.stringify(initial.banner_config ?? null);
}

export function AparienciaSection({
  data,
  initial,
  onChange,
  onSaved,
  saving,
  setSaving,
}: Props) {
  const qc = useQueryClient();
  const { palette, setPalette } = usePaletteStore();

  const paletteMut = useMutation({
    mutationFn: async (p: PaletteName) => {
      await api.patch("/business/palette", { palette: p });
      return p;
    },
    onMutate: (p) => {
      const prev = palette;
      setPalette(p);
      return { prev };
    },
    onError: (err, _p, ctx) => {
      if (ctx?.prev) setPalette(ctx.prev);
      toast.error(unwrapError(err));
    },
    onSuccess: (p) => {
      toast.success(`Paleta "${p}" activada`);
      qc.invalidateQueries({ queryKey: ["business"] });
    },
  });

  const dirty = isDirtyApariencia(data, initial);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
            Paleta activa
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)]">
            Se aplica al cambiar. No requiere guardar.
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {PALETTES.map((p) => {
            const active = palette === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => paletteMut.mutate(p.id)}
                disabled={paletteMut.isPending}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border p-3 text-left transition",
                  active
                    ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)]"
                    : "border-[var(--color-border)] hover:bg-[var(--color-bg-input)]"
                )}
              >
                <div className="flex gap-1">
                  {p.swatch.map((c, i) => (
                    <span
                      key={i}
                      className="h-5 w-5 rounded-full border border-[var(--color-border)]"
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <div className="text-[12px] font-semibold text-[var(--color-text)]">
                  {p.label}
                </div>
                {active && (
                  <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--color-accent)]">
                    <Icon name="check" size={10} />
                    Activa
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
            Banner del shop
          </div>
          <div className="text-[11px] text-[var(--color-text-muted)]">
            Se muestra en la home pública.
          </div>
        </div>
        <div className="mt-3">
          <BannerEditor
            value={data.banner_config ?? DEFAULT_BANNER}
            onChange={(next) => onChange({ banner_config: next })}
          />
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