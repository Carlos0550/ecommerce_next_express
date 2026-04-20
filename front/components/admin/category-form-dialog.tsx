"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, unwrapError, storageUrl } from "@/lib/api";
import { CategoryFormSchema, type CategoryFormInput } from "@/lib/schemas/product";
import type { Category } from "@/lib/types";
import { Icon } from "@/components/brand";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CategoryFormDialog({
  open,
  onClose,
  category,
}: {
  open: boolean;
  onClose: () => void;
  category?: Category | null;
}) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const isEdit = !!category;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormInput>({
    resolver: zodResolver(CategoryFormSchema),
    defaultValues: { title: "", slug: "" },
  });

  useEffect(() => {
    if (open) {
      reset({
        title: category?.title ?? "",
        slug: category?.slug ?? "",
      });
      setFile(null);
      setPreview(storageUrl(category?.image));
    }
  }, [open, category, reset]);

  const mutation = useMutation({
    mutationFn: async (values: CategoryFormInput) => {
      const form = new FormData();
      form.append("title", values.title);
      if (values.slug) form.append("slug", values.slug);
      if (file) form.append("image", file);

      if (isEdit && category) {
        const { data } = await api.put(
          `/products/categories/${category.id}`,
          form,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        return data;
      }
      const { data } = await api.post("/products/categories", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: () => {
      toast.success(isEdit ? "Categoría actualizada" : "Categoría creada");
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      onClose();
    },
    onError: (err) => toast.error(unwrapError(err)),
  });

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px] bg-[var(--color-bg-elev)] text-[var(--color-text)]">
        <DialogHeader>
          <DialogTitle className="font-grotesk text-[20px]">
            {isEdit ? "Editar categoría" : "Nueva categoría"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="flex flex-col gap-3.5"
        >
          <label className="block">
            <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
              Nombre
            </div>
            <input
              {...register("title")}
              placeholder="Labiales"
              className={inputCls}
            />
            {errors.title && (
              <div className="mt-1 text-[11px] text-[var(--color-danger)]">
                {errors.title.message}
              </div>
            )}
          </label>

          <label className="block">
            <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
              Slug <span className="opacity-50">(opcional)</span>
            </div>
            <input
              {...register("slug")}
              placeholder="labiales"
              className={inputCls + " font-mono"}
            />
          </label>

          <div className="block">
            <div className="mb-1.5 text-[11px] font-semibold text-[var(--color-text-dim)]">
              Imagen
            </div>
            <div className="flex items-center gap-3">
              <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)]">
                {preview ? (
                  <Image
                    src={preview}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[var(--color-text-muted)]">
                    <Icon name="image" size={22} />
                  </div>
                )}
              </div>
              <label className="flex h-11 flex-1 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-input)] px-3 text-[13px] text-[var(--color-text-dim)] hover:border-[var(--color-accent)]">
                <Icon name="upload" size={14} />
                {file ? file.name : "Subir imagen"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={onPick}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <DialogFooter className="mt-2 flex-row gap-2">
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
                  ? "Guardar"
                  : "Crear"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 text-[13px] text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]";
