"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, unwrapError, storageUrl } from "@/lib/api";
import {
  ProductFormSchema,
  type ProductFormInput,
} from "@/lib/schemas/product";
import type { Product, Category } from "@/lib/types";
import { Icon } from "@/components/brand";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

export function ProductFormSheet({
  open,
  onClose,
  product,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
  categories: Category[];
}) {
  const qc = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const isEdit = !!product;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormInput>({
    resolver: zodResolver(ProductFormSchema),
    defaultValues: {
      title: "",
      description: "",
      price: "",
      stock: "",
      category_id: "",
      sku: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        title: product?.title ?? "",
        description: product?.description ?? "",
        price: product?.price != null ? String(product.price) : "",
        stock: product?.stock != null ? String(product.stock) : "",
        category_id: product?.category_id ? String(product.category_id) : "",
        sku: product?.sku ?? "",
      });
      setFiles([]);
      setPreviews(
        (product?.images ?? []).map((i) => storageUrl(i.url)).filter(Boolean)
      );
    }
  }, [open, product, reset]);

  const mutation = useMutation({
    mutationFn: async (values: ProductFormInput) => {
      const form = new FormData();
      form.append("title", String(values.title));
      if (values.description) form.append("description", values.description);
      form.append("price", String(values.price));
      form.append("stock", String(values.stock));
      form.append("category_id", String(values.category_id));
      if (values.sku) form.append("sku", values.sku);
      for (const f of files) form.append("productImages", f);

      if (isEdit && product) {
        const { data } = await api.put(`/products/${product.id}`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        return data;
      }
      const { data } = await api.post("/products/save-product", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: () => {
      toast.success(isEdit ? "Producto actualizado" : "Producto creado");
      qc.invalidateQueries({ queryKey: ["products"] });
      onClose();
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arr = Array.from(e.target.files ?? []);
    setFiles(arr);
    setPreviews(arr.map((f) => URL.createObjectURL(f)));
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-[520px] overflow-y-auto bg-[var(--color-bg-elev)] text-[var(--color-text)]">
        <SheetHeader>
          <SheetTitle className="font-grotesk text-[20px]">
            {isEdit ? "Editar producto" : "Nuevo producto"}
          </SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="flex flex-1 flex-col gap-3.5 px-4"
        >
          <Field label="Nombre" error={errors.title?.message}>
            <input
              {...register("title")}
              placeholder="Labial Matte Velvet"
              className={inputCls}
            />
          </Field>

          <Field label="Descripción">
            <textarea
              {...register("description")}
              rows={3}
              className={inputCls + " resize-none py-2.5"}
              placeholder="Descripción breve del producto"
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Categoría" error={errors.category_id?.message}>
              <select
                {...register("category_id")}
                className={inputCls + " appearance-none"}
              >
                <option value="">Elegir…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="SKU">
              <input
                {...register("sku")}
                placeholder="LMV-013"
                className={inputCls + " font-mono"}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Precio (ARS)" error={errors.price?.message}>
              <input
                {...register("price")}
                type="number"
                step="0.01"
                placeholder="8900"
                className={inputCls}
              />
            </Field>
            <Field label="Stock" error={errors.stock?.message}>
              <input
                {...register("stock")}
                type="number"
                placeholder="24"
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Imágenes">
            <div className="flex flex-col gap-2.5">
              <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-input)] px-3 text-[13px] text-[var(--color-text-dim)] hover:border-[var(--color-accent)]">
                <Icon name="upload" size={14} />
                {files.length > 0
                  ? `${files.length} archivo(s) seleccionados`
                  : "Subir imágenes"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onPick}
                  className="hidden"
                />
              </label>
              {previews.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {previews.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src}
                      alt=""
                      className="aspect-square w-full rounded-lg border border-[var(--color-border)] object-cover"
                    />
                  ))}
                </div>
              )}
            </div>
          </Field>

          <SheetFooter className="mt-4 flex-row gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3.5 py-2.5 text-[13px] font-medium text-[var(--color-text)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 rounded-[10px] bg-[var(--color-accent)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
            >
              {mutation.isPending
                ? "Guardando…"
                : isEdit
                  ? "Guardar cambios"
                  : "Crear producto"}
            </button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 text-[13px] text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
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
