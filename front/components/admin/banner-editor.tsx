"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, storageUrl, unwrapError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/brand";
import type {
  BannerConfig,
  BannerImageSource,
  BannerVariant,
  Product,
} from "@/lib/types";

const VARIANTS: {
  id: BannerVariant;
  label: string;
  hint: string;
  maxImages: number;
}[] = [
  { id: "none", label: "Ninguno", hint: "Oculta el banner", maxImages: 0 },
  {
    id: "split-grid",
    label: "Split + grilla 2×2",
    hint: "Texto izquierda, 4 imágenes",
    maxImages: 4,
  },
  {
    id: "split-single",
    label: "Split + imagen",
    hint: "Texto izquierda, 1 imagen grande",
    maxImages: 1,
  },
  {
    id: "centered",
    label: "Centrado",
    hint: "Solo texto centrado, sin imágenes",
    maxImages: 0,
  },
  {
    id: "overlay",
    label: "Overlay",
    hint: "Imagen full-width con texto encima",
    maxImages: 1,
  },
];

const SOURCES: { id: BannerImageSource; label: string; hint: string }[] = [
  {
    id: "auto-products",
    label: "Automático",
    hint: "Toma los primeros productos del catálogo",
  },
  {
    id: "products",
    label: "Productos",
    hint: "Elegí productos del catálogo manualmente",
  },
  {
    id: "custom",
    label: "Subir imágenes",
    hint: "Imágenes propias del banner",
  },
];

export const DEFAULT_BANNER: BannerConfig = {
  variant: "split-grid",
  eyebrow: "Nueva colección",
  title_main: "Glow noir,",
  title_accent: "muy tuyo.",
  subtitle:
    "Labiales, bases, skin care y accesorios pensados para romper la rutina.",
  cta_label: "Ver novedades",
  cta_href: "/categoria",
  image_source: "auto-products",
  product_ids: [],
  custom_images: [],
};

export function BannerEditor({
  value,
  onChange,
}: {
  value: BannerConfig;
  onChange: (next: BannerConfig) => void;
}) {
  const variantMeta = VARIANTS.find((v) => v.id === value.variant) ?? VARIANTS[1];
  const set = <K extends keyof BannerConfig>(k: K, v: BannerConfig[K]) =>
    onChange({ ...value, [k]: v });

  const showText = value.variant !== "none";
  const showImages = variantMeta.maxImages > 0;

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 lg:col-span-2">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
          Banner del shop
        </div>
        <span className="text-[11px] text-[var(--color-text-dim)]">
          Se muestra en la home pública
        </span>
      </div>

      {/* Variant picker */}
      <div className="mt-3 grid grid-cols-2 gap-2.5 md:grid-cols-5">
        {VARIANTS.map((v) => {
          const active = value.variant === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onChange({ ...value, variant: v.id })}
              className={cn(
                "flex flex-col gap-2 rounded-xl border p-3 text-left transition",
                active
                  ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)]"
                  : "border-[var(--color-border)] hover:bg-[var(--color-bg-input)]",
              )}
            >
              <VariantPreview id={v.id} active={active} />
              <div className="text-[12px] font-semibold text-[var(--color-text)]">
                {v.label}
              </div>
              <div className="text-[10px] leading-tight text-[var(--color-text-dim)]">
                {v.hint}
              </div>
            </button>
          );
        })}
      </div>

      {showText && (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <Field label="Pre-título (eyebrow)">
            <input
              value={value.eyebrow ?? ""}
              maxLength={80}
              onChange={(e) => set("eyebrow", e.target.value)}
              className={inputCls}
              placeholder="Nueva colección"
            />
          </Field>
          <Field label="Label del CTA">
            <input
              value={value.cta_label ?? ""}
              maxLength={40}
              onChange={(e) => set("cta_label", e.target.value)}
              className={inputCls}
              placeholder="Ver novedades"
            />
          </Field>
          <Field label="Título (línea 1)">
            <input
              value={value.title_main ?? ""}
              maxLength={80}
              onChange={(e) => set("title_main", e.target.value)}
              className={inputCls}
              placeholder="Glow noir,"
            />
          </Field>
          <Field label="Título (línea 2, en cursiva)">
            <input
              value={value.title_accent ?? ""}
              maxLength={80}
              onChange={(e) => set("title_accent", e.target.value)}
              className={inputCls + " italic"}
              placeholder="muy tuyo."
            />
          </Field>
          <Field label="Subtítulo / descripción" className="lg:col-span-2">
            <textarea
              value={value.subtitle ?? ""}
              maxLength={280}
              onChange={(e) => set("subtitle", e.target.value)}
              rows={2}
              className={inputCls + " resize-none py-2.5"}
              placeholder="Labiales, bases, skin care…"
            />
          </Field>
          <Field label="Link del CTA (relativo o absoluto)" className="lg:col-span-2">
            <input
              value={value.cta_href ?? ""}
              maxLength={240}
              onChange={(e) => set("cta_href", e.target.value)}
              className={inputCls + " font-mono text-[12px]"}
              placeholder="/categoria"
            />
          </Field>
        </div>
      )}

      {showText && showImages && (
        <div className="mt-5">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
            Origen de las imágenes
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {SOURCES.map((s) => {
              const active = value.image_source === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => set("image_source", s.id)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition",
                    active
                      ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)]"
                      : "border-[var(--color-border)] hover:bg-[var(--color-bg-input)]",
                  )}
                >
                  <div className="text-[12px] font-semibold text-[var(--color-text)]">
                    {s.label}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--color-text-dim)]">
                    {s.hint}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            {value.image_source === "auto-products" && (
              <div className="rounded-xl border border-dashed border-[var(--color-border)] p-4 text-center text-[12px] text-[var(--color-text-dim)]">
                Sin selección manual. El banner toma automáticamente los
                primeros {variantMeta.maxImages} productos del catálogo.
              </div>
            )}
            {value.image_source === "products" && (
              <ProductsPicker
                max={variantMeta.maxImages}
                selected={value.product_ids ?? []}
                onChange={(ids) => set("product_ids", ids)}
              />
            )}
            {value.image_source === "custom" && (
              <CustomImagesEditor
                max={variantMeta.maxImages}
                value={value.custom_images ?? []}
                onChange={(arr) => set("custom_images", arr)}
              />
            )}
          </div>
        </div>
      )}

      {value.variant === "none" && (
        <div className="mt-5 rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center text-[12px] text-[var(--color-text-dim)]">
          El banner está oculto en la home. Elegí otra variante para volver a
          mostrarlo.
        </div>
      )}
    </div>
  );
}

function CustomImagesEditor({
  max,
  value,
  onChange,
}: {
  max: number;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post<{ success: boolean; url?: string }>(
        "/business/upload-banner-image",
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      if (!data.url) throw new Error("upload_failed");
      return data.url;
    },
    onSuccess: (url) => {
      onChange([...value, url].slice(0, max));
      toast.success("Imagen subida");
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const onPick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) uploadMut.mutate(f);
    };
    input.click();
  };

  const remove = (i: number) =>
    onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {value.map((url, i) => (
          <div
            key={url + i}
            className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)]"
          >
            <Image
              src={storageUrl(url)}
              alt={`Banner ${i + 1}`}
              fill
              sizes="160px"
              className="object-cover"
              unoptimized
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute right-1.5 top-1.5 rounded-full bg-[var(--color-text)] p-1.5 text-[var(--color-bg)] opacity-0 transition group-hover:opacity-100"
              aria-label="Eliminar"
            >
              <Icon name="close" size={11} />
            </button>
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            onClick={onPick}
            disabled={uploadMut.isPending}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-input)] text-[11px] font-semibold text-[var(--color-text-dim)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50"
          >
            <Icon name="upload" size={18} />
            {uploadMut.isPending ? "Subiendo…" : "Subir imagen"}
          </button>
        )}
      </div>
      <div className="mt-2 text-[11px] text-[var(--color-text-dim)]">
        {value.length}/{max} imágenes — JPG, PNG, WEBP
      </div>
    </div>
  );
}

function ProductsPicker({
  max,
  selected,
  onChange,
}: {
  max: number;
  selected: number[];
  onChange: (next: number[]) => void;
}) {
  const [search, setSearch] = useState("");

  const productsQ = useQuery({
    queryKey: ["banner-products-picker", search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", limit: "30" });
      if (search) params.set("title", search);
      const { data } = await api.get<{
        data: { products: Product[] };
      }>(`/products?${params.toString()}`);
      return data.data.products ?? [];
    },
  });

  const products = useMemo(() => productsQ.data ?? [], [productsQ.data]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (id: number) => {
    if (selectedSet.has(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      if (selected.length >= max) {
        toast.warning(`Solo podés elegir ${max} producto${max === 1 ? "" : "s"}`);
        return;
      }
      onChange([...selected, id]);
    }
  };

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= selected.length) return;
    const arr = [...selected];
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    onChange(arr);
  };

  const selectedDetailed = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    return selected.map((id) => byId.get(id) ?? { id, title: `#${id}` });
  }, [products, selected]);

  return (
    <div>
      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedDetailed.map((p, i) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] py-1 pl-2 pr-1 text-[11px] font-semibold text-[var(--color-text)]"
            >
              <span className="text-[10px] text-[var(--color-text-dim)]">
                {i + 1}.
              </span>
              {p.title}
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="ml-1 disabled:opacity-30"
                aria-label="Subir"
              >
                <Icon name="chevronUp" size={10} />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === selected.length - 1}
                className="disabled:opacity-30"
                aria-label="Bajar"
              >
                <Icon name="chevronDown" size={10} />
              </button>
              <button
                type="button"
                onClick={() => toggle(p.id)}
                className="ml-0.5 rounded-full p-1 hover:bg-[var(--color-bg-card)]"
                aria-label="Quitar"
              >
                <Icon name="close" size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mb-2 flex h-9 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3">
        <Icon name="search" size={13} className="text-[var(--color-text-dim)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar productos…"
          className="h-full w-full bg-transparent text-[12px] outline-none placeholder:text-[var(--color-text-muted)]"
        />
      </div>

      <div className="max-h-[280px] overflow-y-auto rounded-xl border border-[var(--color-border)]">
        {productsQ.isLoading && (
          <div className="p-4 text-center text-[12px] text-[var(--color-text-dim)]">
            Cargando…
          </div>
        )}
        {!productsQ.isLoading && products.length === 0 && (
          <div className="p-4 text-center text-[12px] text-[var(--color-text-dim)]">
            Sin resultados.
          </div>
        )}
        <ul className="divide-y divide-[var(--color-border)]">
          {products.map((p) => {
            const checked = selectedSet.has(p.id);
            const img = p.images?.[0]?.url;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-left text-[12px] transition",
                    checked
                      ? "bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)]"
                      : "hover:bg-[var(--color-bg-input)]",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border",
                      checked
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-button-text)]"
                        : "border-[var(--color-border-strong)]",
                    )}
                  >
                    {checked && <Icon name="check" size={10} />}
                  </span>
                  <div className="relative h-9 w-9 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-bg-input)]">
                    {img && (
                      <Image
                        src={storageUrl(img)}
                        alt={p.title}
                        fill
                        sizes="36px"
                        className="object-cover"
                        unoptimized
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-[var(--color-text)]">
                      {p.title}
                    </div>
                    {p.category?.title && (
                      <div className="truncate text-[10px] text-[var(--color-text-dim)]">
                        {p.category.title}
                      </div>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-2 text-[11px] text-[var(--color-text-dim)]">
        {selected.length}/{max} productos seleccionados
      </div>
    </div>
  );
}

function VariantPreview({
  id,
  active,
}: {
  id: BannerVariant;
  active: boolean;
}) {
  const stroke = active ? "var(--color-accent)" : "var(--color-text-dim)";
  const fill = active
    ? "color-mix(in srgb, var(--color-accent) 18%, transparent)"
    : "color-mix(in srgb, var(--color-text) 8%, transparent)";

  if (id === "none") {
    return (
      <svg viewBox="0 0 80 36" className="h-[36px] w-full">
        <rect
          x="2"
          y="2"
          width="76"
          height="32"
          rx="6"
          fill="none"
          stroke={stroke}
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <line x1="6" y1="6" x2="74" y2="30" stroke={stroke} strokeWidth="1" />
      </svg>
    );
  }
  if (id === "split-grid") {
    return (
      <svg viewBox="0 0 80 36" className="h-[36px] w-full">
        <rect x="2" y="2" width="76" height="32" rx="6" fill={fill} />
        <rect x="6" y="8" width="22" height="3" rx="1.5" fill={stroke} />
        <rect x="6" y="14" width="30" height="6" rx="2" fill={stroke} />
        <rect x="6" y="24" width="14" height="4" rx="2" fill={stroke} />
        <rect x="44" y="6" width="14" height="11" rx="2" fill={stroke} />
        <rect x="60" y="6" width="14" height="11" rx="2" fill={stroke} />
        <rect x="44" y="19" width="14" height="11" rx="2" fill={stroke} />
        <rect x="60" y="19" width="14" height="11" rx="2" fill={stroke} />
      </svg>
    );
  }
  if (id === "split-single") {
    return (
      <svg viewBox="0 0 80 36" className="h-[36px] w-full">
        <rect x="2" y="2" width="76" height="32" rx="6" fill={fill} />
        <rect x="6" y="8" width="22" height="3" rx="1.5" fill={stroke} />
        <rect x="6" y="14" width="30" height="6" rx="2" fill={stroke} />
        <rect x="6" y="24" width="14" height="4" rx="2" fill={stroke} />
        <rect x="44" y="6" width="30" height="24" rx="3" fill={stroke} />
      </svg>
    );
  }
  if (id === "centered") {
    return (
      <svg viewBox="0 0 80 36" className="h-[36px] w-full">
        <rect x="2" y="2" width="76" height="32" rx="6" fill={fill} />
        <rect x="22" y="9" width="36" height="3" rx="1.5" fill={stroke} />
        <rect x="14" y="15" width="52" height="7" rx="2" fill={stroke} />
        <rect x="32" y="26" width="16" height="4" rx="2" fill={stroke} />
      </svg>
    );
  }
  // overlay
  return (
    <svg viewBox="0 0 80 36" className="h-[36px] w-full">
      <rect x="2" y="2" width="76" height="32" rx="6" fill={stroke} opacity="0.55" />
      <rect x="2" y="2" width="40" height="32" rx="6" fill={fill} />
      <rect x="6" y="8" width="22" height="3" rx="1.5" fill={stroke} />
      <rect x="6" y="14" width="30" height="6" rx="2" fill={stroke} />
      <rect x="6" y="24" width="14" height="4" rx="2" fill={stroke} />
    </svg>
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

const inputCls =
  "h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 text-[13px] text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]";
