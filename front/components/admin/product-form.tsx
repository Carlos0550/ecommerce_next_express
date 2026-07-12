"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { api, storageUrl } from "@/lib/api";
import {
  ProductFormSchema,
  type ProductFormInput,
} from "@/lib/schemas/product";
import type { Product, Category } from "@/lib/types";
import { Icon } from "@/components/brand";

export type ProductDraftSeed = {
  tempId: string;
  title: string;
  description?: string;
  price: string | number;
  stock: string | number;
  category_id?: string;
  sku?: string;
  imageUrl: string;
  createdAt?: number;
};

function extractImageUrls(
  images: Product["images"],
): string[] {
  const raw = images as unknown as Array<string | { url?: string }> | undefined;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((im) => (typeof im === "string" ? im : im?.url ?? ""))
    .filter((u): u is string => !!u);
}

export type ProductFormMode = "create" | "edit";

export function ProductForm({
  mode,
  product,
  categories,
  initialDraft,
  onSuccessRedirect = "/admin/products",
}: {
  mode: ProductFormMode;
  product?: Product | null;
  categories: Category[];
  initialDraft?: ProductDraftSeed | null;
  onSuccessRedirect?: string;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const initFromProduct = product
    ? {
        title: product.title ?? "",
        description: product.description ?? "",
        price: product.price != null ? String(product.price) : "",
        stock: product.stock != null ? String(product.stock) : "",
        category_id: product.category_id ? String(product.category_id) : "",
        sku: product.sku ?? "",
      }
    : {
        title: "",
        description: "",
        price: "",
        stock: "",
        category_id: "",
        sku: "",
      };

  const initFromDraft = initialDraft
    ? {
        title: initialDraft.title ?? "",
        description: initialDraft.description ?? "",
        price: initialDraft.price != null ? String(initialDraft.price) : "",
        stock: initialDraft.stock != null ? String(initialDraft.stock) : "",
        category_id: initialDraft.category_id ?? "",
        sku: initialDraft.sku ?? "",
      }
    : null;

  const defaults = initFromDraft ?? initFromProduct;
  const initialExisting = initialDraft ? [] : extractImageUrls(product?.images);
  const initialDraftPreviewSrc = initialDraft?.imageUrl;

  const [files, setFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [existingUrls, setExistingUrls] = useState<string[]>(initialExisting);
  const [draftImagePreview, setDraftImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormInput>({
    resolver: zodResolver(ProductFormSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!initialDraftPreviewSrc) return;
    let cancelled = false;
    let previewUrl: string | null = null;
    (async () => {
      try {
        const { data } = await api.get<Blob>(initialDraftPreviewSrc, {
          responseType: "blob",
        });
        if (cancelled) return;
        previewUrl = URL.createObjectURL(data);
        setDraftImagePreview(previewUrl);
      } catch {
        if (!cancelled) setDraftImagePreview(null);
      }
    })();
    return () => {
      cancelled = true;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [initialDraftPreviewSrc]);

  const submit = async (values: ProductFormInput) => {
    setServerError(null);

    if (!isEdit && !initialDraft && files.length === 0) {
      setServerError("Subí al menos una imagen para crear el producto");
      return;
    }
    if (isEdit && existingUrls.length === 0 && files.length === 0) {
      setServerError("Subí al menos una imagen");
      return;
    }

    const form = new FormData();
    form.append("title", String(values.title));
    form.append("description", values.description ?? "");
    form.append("price", String(values.price));
    form.append("stock", String(values.stock));
    if (values.category_id) form.append("category_id", values.category_id);
    if (values.sku) form.append("sku", values.sku);
    for (const f of files) form.append("productImages", f);

    if (isEdit && product) {
      const originalUrls = extractImageUrls(product.images);
      const deletedUrls = originalUrls.filter((u) => !existingUrls.includes(u));
      form.append("existingImageUrls", JSON.stringify(existingUrls));
      form.append("deletedImageUrls", JSON.stringify(deletedUrls));
    }

    setSubmitting(true);
    try {
      if (isEdit && product) {
        await api.put(`/products/${product.id}`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/products/save-product", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      if (initialDraft?.tempId) {
        await api.delete(`/products/draft/${initialDraft.tempId}`).catch(() => undefined);
      }
      router.push(onSuccessRedirect);
      router.refresh();
    } catch (err) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: unknown } } }).response?.data
              ?.message
          : undefined;
      setServerError(
        typeof msg === "string" ? msg : "No se pudo guardar el producto",
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arr = Array.from(e.target.files ?? []);
    setFiles(arr);
    setNewPreviews(arr.map((f) => URL.createObjectURL(f)));
  };

  const removeExisting = (url: string) =>
    setExistingUrls((cur) => cur.filter((u) => u !== url));

  const hasAnyImage =
    files.length > 0 || existingUrls.length > 0 || !!draftImagePreview;

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]"
    >
      {serverError && (
        <div className="lg:col-span-2 rounded-[10px] border border-[var(--color-danger)] bg-[color-mix(in_srgb,var(--color-danger)_10%,var(--color-bg-card))] px-3.5 py-2.5 text-[12px] font-medium text-[var(--color-danger)]">
          {serverError}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
          Imagen principal
        </div>
        <label
          className={cnDropzone(
            !hasAnyImage,
            !isEdit && !initialDraft && files.length === 0,
          )}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onPick}
            className="hidden"
          />
          {draftImagePreview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={draftImagePreview}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : existingUrls.length === 0 && newPreviews.length === 0 ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--color-text-dim)]">
              <Icon name="upload" size={28} />
              <div className="text-[13px] font-medium">
                {isEdit ? "Subí una nueva imagen" : "Subí la imagen del producto"}
              </div>
              <div className="text-[11px]">PNG, JPG, WEBP hasta 30MB</div>
            </div>
          ) : (
            <div className="grid h-full w-full grid-cols-2 gap-1.5 p-1.5">
              {[...existingUrls.map((u) => ({ kind: "existing" as const, src: storageUrl(u), url: u })),
                ...newPreviews.map((src, i) => ({ kind: "new" as const, src, key: i }))]
                .slice(0, 4)
                .map((entry, idx) => {
                  if (entry.kind === "existing") {
                    return (
                      <div key={`e-${entry.url}-${idx}`} className="group relative overflow-hidden rounded-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={entry.src ?? ""}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            removeExisting(entry.url);
                          }}
                          title="Quitar"
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-bg-card)] text-[var(--color-danger)] opacity-0 transition group-hover:opacity-100"
                        >
                          <Icon name="close" size={11} />
                        </button>
                      </div>
                    );
                  }
                  return (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={`n-${entry.key}`}
                      src={entry.src ?? ""}
                      alt=""
                      className="h-full w-full rounded-md object-cover ring-2 ring-[var(--color-accent)]"
                    />
                  );
                })}
            </div>
          )}
        </label>
        {files.length > 0 && (
          <div className="text-[11px] text-[var(--color-text-dim)]">
            {files.length} archivo(s) nuevo(s) listo(s) para subir
          </div>
        )}
        {initialDraft && draftImagePreview && (
          <div className="rounded-md bg-[var(--color-warning)]/10 px-2 py-1 text-[11px] text-[var(--color-warning)]">
            Estas recuperando un borrador. La imagen expira en 30 min.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <Field label="Nombre del producto" required error={errors.title?.message}>
          <input
            {...register("title")}
            placeholder="Labial Matte Velvet"
            className={inputCls}
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Categoría">
            <select
              {...register("category_id")}
              className={inputCls + " appearance-none"}
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="SKU" hint="Opcional, para control interno">
            <input
              {...register("sku")}
              placeholder="LMV-013"
              className={inputCls + " font-mono"}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Precio (ARS)" required error={errors.price?.message}>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[var(--color-text-dim)]">
                $
              </span>
              <input
                {...register("price")}
                type="number"
                step="0.01"
                min="0"
                placeholder="8900"
                className={inputCls + " pl-7"}
              />
            </div>
          </Field>
          <Field label="Stock" required error={errors.stock?.message}>
            <input
              {...register("stock")}
              type="number"
              min="0"
              step="1"
              placeholder="24"
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Descripción" hint="Opcional. Si la dejás vacía, la IA la genera.">
          <textarea
            {...register("description")}
            rows={4}
            className={inputCls + " resize-none py-2.5"}
            placeholder="Una breve descripción del producto…"
          />
        </Field>
      </div>

      <div className="lg:col-span-2 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--color-border)] pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={submitting}
          className="h-10 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 text-[13px] font-medium text-[var(--color-text)] disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-5 text-[13px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
        >
          {submitting && (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-button-text)] border-t-transparent" />
          )}
          {submitting
            ? isEdit
              ? "Guardando…"
              : "Creando…"
            : isEdit
              ? "Guardar cambios"
              : "Crear producto"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 text-[13px] text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] disabled:opacity-60";

function cnDropzone(empty: boolean, required: boolean) {
  return [
    "relative flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition",
    empty && required
      ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_4%,var(--color-bg-input))]"
      : "border-[var(--color-border-strong)] bg-[var(--color-bg-input)] hover:border-[var(--color-accent)]",
  ].join(" ");
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
          {label}
        </span>
        {required && (
          <span className="text-[11px] font-semibold text-[var(--color-danger)]">
            *
          </span>
        )}
        {hint && (
          <span className="text-[10px] font-normal normal-case text-[var(--color-text-muted)]">
            · {hint}
          </span>
        )}
      </div>
      {children}
      {error && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-[var(--color-danger)]">
          <Icon name="alert" size={11} />
          {error}
        </div>
      )}
    </label>
  );
}