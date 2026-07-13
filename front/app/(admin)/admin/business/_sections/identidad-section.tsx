"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, unwrapError } from "@/lib/api";
import type { Business } from "@/lib/types";
import { ImageUploader } from "../_components/image-uploader";
import { Icon } from "@/components/brand";

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

function isDirtyIdentidad(data: Business, initial: Business) {
  const keys: (keyof Business)[] = [
    "name",
    "type",
    "email",
    "phone",
    "address",
    "city",
    "state",
    "description",
    "business_image",
    "favicon",
    "hero_image",
  ];
  return keys.some((k) => data[k] !== initial[k]);
}

export function IdentidadSection({
  data,
  initial,
  onChange,
  onSaved,
  saving,
  setSaving,
}: Props) {
  const qc = useQueryClient();

  const generateMut = useMutation({
    mutationFn: async () => {
      const { data: res } = await api.post<{ description?: string }>(
        "/business/generate-description",
        {
          name: data.name,
          city: data.city,
          province: data.state,
          type: data.type,
          description: data.description,
        }
      );
      return res;
    },
    onSuccess: (res) => {
      if (res.description) {
        onChange({ description: res.description });
        toast.success("Descripción generada");
      }
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const uploadMut = useMutation({
    mutationFn: async ({
      file,
      field,
    }: {
      file: File;
      field: "business_image" | "favicon" | "hero_image";
    }) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("field", field);
      const { data: res } = await api.post<{
        success: boolean;
        url?: string;
        path?: string;
      }>("/business/upload-image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return { ...res, field };
    },
    onSuccess: (res) => {
      if (res.url) onChange({ [res.field]: res.url } as Partial<Business>);
      toast.success("Imagen subida");
      qc.invalidateQueries({ queryKey: ["business"] });
      if (res.field === "favicon" || res.field === "business_image") {
        fetch("/api/revalidate-business", { method: "POST" }).catch(() => {});
      }
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const removeImageMut = useMutation({
    mutationFn: async (field: "business_image" | "favicon" | "hero_image") => {
      if (!data.id) throw new Error("missing_business_id");
      await api.put(`/business/${data.id}`, {
        ...data,
        [field]: "",
        bankData: data.bankData ?? [],
      });
      return field;
    },
    onSuccess: (field) => {
      onChange({ [field]: "" } as Partial<Business>);
      toast.success("Imagen removida");
      qc.invalidateQueries({ queryKey: ["business"] });
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const dirty = isDirtyIdentidad(data, initial);

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Datos del negocio"
        hint="Lo que se muestra públicamente en tu tienda."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nombre">
            <input
              value={data.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Tipo (ej: maquillaje)">
            <input
              value={data.type ?? ""}
              onChange={(e) => onChange({ type: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={data.email}
              onChange={(e) => onChange({ email: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Teléfono">
            <input
              value={data.phone ?? ""}
              onChange={(e) => onChange({ phone: e.target.value })}
              className={inputCls + " font-mono"}
            />
          </Field>
          <Field label="Dirección" full>
            <input
              value={data.address ?? ""}
              onChange={(e) => onChange({ address: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Ciudad">
            <input
              value={data.city ?? ""}
              onChange={(e) => onChange({ city: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Provincia">
            <input
              value={data.state ?? ""}
              onChange={(e) => onChange({ state: e.target.value })}
              className={inputCls}
            />
          </Field>
          <div className="sm:col-span-2">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="text-[11px] font-semibold text-[var(--color-text-dim)]">
                Descripción
              </div>
              <button
                type="button"
                onClick={() => generateMut.mutate()}
                disabled={generateMut.isPending || !data.name}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 py-1 text-[11px] font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-bg-input)] disabled:opacity-60"
              >
                <Icon name="star" size={11} />
                {generateMut.isPending ? "Generando…" : "Generar con IA"}
              </button>
            </div>
            <textarea
              value={data.description ?? ""}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={4}
              className={inputCls + " resize-none py-2.5"}
              placeholder="Contale a tus clientes qué encontrarán en tu tienda."
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Imágenes"
        hint="El logo se usa también como favicon en la pestaña del navegador."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ImageUploader
            label="Logo"
            hint="PNG/SVG"
            recommended="Recomendado 512×512"
            url={data.business_image}
            busy={uploadMut.isPending || removeImageMut.isPending}
            onPick={(file) =>
              uploadMut.mutate({ file, field: "business_image" })
            }
            onRemove={() => removeImageMut.mutate("business_image")}
          />
          <ImageUploader
            label="Favicon"
            hint="ICO/PNG"
            recommended="Recomendado 64×64"
            url={data.favicon}
            busy={uploadMut.isPending || removeImageMut.isPending}
            onPick={(file) => uploadMut.mutate({ file, field: "favicon" })}
            onRemove={() => removeImageMut.mutate("favicon")}
          />
          <ImageUploader
            label="Portada"
            hint="JPG/PNG"
            recommended="Recomendado 1200×630"
            url={data.hero_image}
            busy={uploadMut.isPending || removeImageMut.isPending}
            onPick={(file) => uploadMut.mutate({ file, field: "hero_image" })}
            onRemove={() => removeImageMut.mutate("hero_image")}
          />
        </div>
      </SectionCard>

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

function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
          {title}
        </div>
        {hint && (
          <div className="text-[11px] text-[var(--color-text-muted)]">
            {hint}
          </div>
        )}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={full ? "sm:col-span-2" : ""}>
      <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
        {label}
      </div>
      {children}
    </label>
  );
}

export function SaveBar({
  dirty,
  saving,
  onSave,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)]/95 px-4 py-3 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur">
      <div className="text-[12px] text-[var(--color-text-dim)]">
        {dirty ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
            Tenés cambios sin guardar
          </span>
        ) : (
          <span>Todo guardado</span>
        )}
      </div>
      <button
        type="button"
        onClick={onSave}
        disabled={!dirty || saving}
        className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-3.5 text-[13px] font-semibold text-[var(--color-button-text)] transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon name="check" size={14} />
        {saving ? "Guardando…" : "Guardar"}
      </button>
    </div>
  );
}