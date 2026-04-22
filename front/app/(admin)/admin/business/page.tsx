"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, storageUrl, unwrapError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AdminShell } from "@/components/admin/admin-shell";
import { BannerEditor, DEFAULT_BANNER } from "@/components/admin/banner-editor";
import {
  AdminLayoutToggle,
  DEFAULT_ADMIN_LAYOUT,
} from "@/components/admin/admin-layout-toggle";
import { Icon } from "@/components/brand";
import { usePaletteStore, type PaletteName } from "@/stores/palette.store";
import type { AdminLayoutConfig, BannerConfig } from "@/lib/types";

type BankEntry = {
  id?: number | string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  alias?: string;
  cbu?: string;
};

type BusinessData = {
  id?: number | string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  type?: string;
  description?: string;
  business_image?: string;
  favicon?: string;
  hero_image?: string;
  active_palette?: PaletteName;
  banner_config?: BannerConfig | null;
  admin_layout_config?: AdminLayoutConfig | null;
  bankData?: BankEntry[];
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
];

export default function AdminBusinessPage() {
  const qc = useQueryClient();
  const { palette, setPalette } = usePaletteStore();

  const businessQ = useQuery({
    queryKey: ["business"],
    queryFn: async () => {
      const { data } = await api.get<BusinessData>("/business");
      return data;
    },
  });

  const [form, setForm] = useState<BusinessData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    type: "",
    description: "",
    bankData: [],
  });

  useEffect(() => {
    if (businessQ.data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync server state to local form
      setForm({
        ...businessQ.data,
        bankData: businessQ.data.bankData ?? [],
        banner_config: businessQ.data.banner_config ?? DEFAULT_BANNER,
        admin_layout_config:
          businessQ.data.admin_layout_config ?? DEFAULT_ADMIN_LAYOUT,
      });
    }
  }, [businessQ.data]);

  const set = <K extends keyof BusinessData>(key: K, value: BusinessData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form.id) throw new Error("missing_business_id");
      const { data } = await api.put(`/business/${form.id}`, {
        ...form,
        bankData: form.bankData ?? [],
      });
      return data;
    },
    onSuccess: () => {
      toast.success("Datos guardados");
      qc.invalidateQueries({ queryKey: ["business"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const uploadMut = useMutation({
    mutationFn: async ({
      file,
      field,
    }: {
      file: File;
      field: "business_image" | "hero_image";
    }) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("field", field);
      const { data } = await api.post<{ success: boolean; url?: string; path?: string }>(
        "/business/upload-image",
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return { ...data, field };
    },
    onSuccess: (res) => {
      toast.success("Imagen subida");
      qc.invalidateQueries({ queryKey: ["business"] });
      if (res.url) set(res.field, res.url);
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const removeImageMut = useMutation({
    mutationFn: async (field: "business_image" | "hero_image") => {
      if (!form.id) throw new Error("missing_business_id");
      await api.put(`/business/${form.id}`, {
        ...form,
        [field]: "",
        bankData: form.bankData ?? [],
      });
      return field;
    },
    onSuccess: (field) => {
      toast.success("Imagen removida");
      set(field, undefined);
      qc.invalidateQueries({ queryKey: ["business"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const generateMut = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ success?: boolean; description?: string }>(
        "/business/generate-description",
        {
          name: form.name,
          city: form.city,
          province: form.state,
          type: form.type,
          description: form.description,
        }
      );
      return data;
    },
    onSuccess: (data) => {
      if (data.description) {
        set("description", data.description);
        toast.success("Descripción generada");
      }
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const paletteMut = useMutation({
    mutationFn: async (p: PaletteName) => {
      await api.patch("/business/palette", { palette: p });
    },
    onSuccess: (_d, p) => {
      toast.success(`Paleta "${p}" activada`);
      setPalette(p);
      qc.invalidateQueries({ queryKey: ["business"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const addBank = () =>
    set("bankData", [
      ...(form.bankData ?? []),
      { bank_name: "", account_number: "", account_holder: "", alias: "", cbu: "" },
    ]);
  const removeBank = (i: number) =>
    set(
      "bankData",
      (form.bankData ?? []).filter((_, idx) => idx !== i)
    );
  const updateBank = (i: number, patch: Partial<BankEntry>) =>
    set(
      "bankData",
      (form.bankData ?? []).map((b, idx) => (idx === i ? { ...b, ...patch } : b))
    );

  const onPickImage = (field: "business_image" | "hero_image") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) uploadMut.mutate({ file: f, field });
    };
    input.click();
  };

  return (
    <AdminShell
      title="Negocio"
      subtitle="Datos públicos, imágenes, paleta y datos bancarios"
      actions={
        <button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending || !form.id}
          className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-3 text-[12px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)] disabled:opacity-60 md:h-auto md:px-3.5 md:py-2.5 md:text-[13px]"
        >
          <Icon name="check" size={14} />
          <span className="hidden sm:inline">
            {saveMut.isPending ? "Guardando…" : "Guardar cambios"}
          </span>
          <span className="sm:hidden">
            {saveMut.isPending ? "…" : "Guardar"}
          </span>
        </button>
      }
    >
      {businessQ.isLoading && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-10 text-center text-sm text-[var(--color-text-dim)]">
          Cargando…
        </div>
      )}

      {!businessQ.isLoading && (
        <div className="grid gap-3.5 lg:grid-cols-[1.2fr_1fr]">
          {/* Datos */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
              Datos del negocio
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nombre">
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Tipo (ej: maquillaje)">
                <input
                  value={form.type ?? ""}
                  onChange={(e) => set("type", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Teléfono">
                <input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  className={inputCls + " font-mono"}
                />
              </Field>
              <Field label="Dirección" className="sm:col-span-2">
                <input
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Ciudad">
                <input
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Provincia">
                <input
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold text-[var(--color-text-dim)]">
                    Descripción
                  </div>
                  <button
                    onClick={() => generateMut.mutate()}
                    disabled={generateMut.isPending || !form.name}
                    className="text-[11px] font-semibold text-[var(--color-accent)] hover:underline disabled:opacity-60"
                  >
                    {generateMut.isPending ? "Generando…" : "✨ Generar con IA"}
                  </button>
                </div>
                <textarea
                  value={form.description ?? ""}
                  onChange={(e) => set("description", e.target.value)}
                  rows={4}
                  className={inputCls + " mt-1.5 resize-none py-2.5"}
                />
              </div>
            </div>
          </div>

          {/* Paleta + imágenes */}
          <div className="flex flex-col gap-3.5">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
                Paleta activa
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                {PALETTES.map((p) => {
                  const active = palette === p.id;
                  return (
                    <button
                      key={p.id}
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
                        <div className="text-[10px] font-semibold text-[var(--color-accent)]">
                          Activa
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
                Imágenes
              </div>
              <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                El logo también se usa como favicon. La portada se muestra al
                compartir el link de la tienda.
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <ImageSlot
                  label="Logo"
                  url={form.business_image}
                  onPick={() => onPickImage("business_image")}
                  onRemove={() => removeImageMut.mutate("business_image")}
                  busy={removeImageMut.isPending}
                />
                <ImageSlot
                  label="Portada del negocio"
                  url={form.hero_image}
                  onPick={() => onPickImage("hero_image")}
                  onRemove={() => removeImageMut.mutate("hero_image")}
                  busy={removeImageMut.isPending}
                />
              </div>
            </div>
          </div>

          {/* Banner del shop */}
          <BannerEditor
            value={form.banner_config ?? DEFAULT_BANNER}
            onChange={(next) => set("banner_config", next)}
          />

          {/* Diseño del panel admin */}
          <AdminLayoutToggle
            value={form.admin_layout_config ?? DEFAULT_ADMIN_LAYOUT}
            onChange={(next) => set("admin_layout_config", next)}
          />

          {/* Datos bancarios */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
                Datos bancarios (para transferencias)
              </div>
              <button
                onClick={addBank}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-input)]"
              >
                <Icon name="plus" size={11} /> Agregar cuenta
              </button>
            </div>

            {(form.bankData ?? []).length === 0 && (
              <div className="mt-3 rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center text-[12px] text-[var(--color-text-dim)]">
                Sin cuentas cargadas.
              </div>
            )}

            <div className="mt-3 flex flex-col gap-3">
              {(form.bankData ?? []).map((b, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] p-3 sm:grid-cols-2 lg:grid-cols-5"
                >
                  <Field label="Banco">
                    <input
                      value={b.bank_name}
                      onChange={(e) => updateBank(i, { bank_name: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Titular">
                    <input
                      value={b.account_holder}
                      onChange={(e) =>
                        updateBank(i, { account_holder: e.target.value })
                      }
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Nº cuenta">
                    <input
                      value={b.account_number}
                      onChange={(e) =>
                        updateBank(i, { account_number: e.target.value })
                      }
                      className={inputCls + " font-mono"}
                    />
                  </Field>
                  <Field label="CBU">
                    <input
                      value={b.cbu ?? ""}
                      onChange={(e) => updateBank(i, { cbu: e.target.value })}
                      className={inputCls + " font-mono"}
                    />
                  </Field>
                  <div className="flex flex-col">
                    <Field label="Alias">
                      <input
                        value={b.alias ?? ""}
                        onChange={(e) => updateBank(i, { alias: e.target.value })}
                        className={inputCls + " font-mono"}
                      />
                    </Field>
                    <button
                      onClick={() => removeBank(i)}
                      className="mt-1.5 text-[11px] font-semibold text-[var(--color-danger)] hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
        {label}
      </div>
      {children}
    </label>
  );
}

function ImageSlot({
  label,
  url,
  onPick,
  onRemove,
  busy,
}: {
  label: string;
  url?: string;
  onPick: () => void;
  onRemove: () => void;
  busy?: boolean;
}) {
  const src = storageUrl(url);
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-input)] p-2.5">
      {src ? (
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-[var(--color-bg-card)]">
          <Image
            src={src}
            alt={label}
            fill
            sizes="160px"
            className="object-cover"
            unoptimized
          />
        </div>
      ) : (
        <button
          onClick={onPick}
          className="flex aspect-square w-full items-center justify-center rounded-lg bg-[var(--color-bg-card)] text-[var(--color-text-muted)] transition hover:text-[var(--color-accent)]"
        >
          <Icon name="upload" size={22} />
        </button>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold text-[var(--color-text)]">
          {label}
        </div>
        {src ? (
          <div className="flex gap-1.5">
            <button
              onClick={onPick}
              className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[10px] font-semibold text-[var(--color-text)] hover:bg-[var(--color-bg-card)]"
            >
              Reemplazar
            </button>
            <button
              onClick={onRemove}
              disabled={busy}
              className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[10px] font-semibold text-[var(--color-danger)] hover:bg-[var(--color-bg-card)] disabled:opacity-60"
            >
              {busy ? "…" : "Quitar"}
            </button>
          </div>
        ) : (
          <button
            onClick={onPick}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[10px] font-semibold text-[var(--color-accent)] hover:bg-[var(--color-bg-card)]"
          >
            Subir
          </button>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 text-[13px] text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]";
