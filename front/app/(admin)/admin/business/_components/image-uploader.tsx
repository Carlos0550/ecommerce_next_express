"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { storageUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/brand";

type Props = {
  label: string;
  hint?: string;
  url?: string;
  busy?: boolean;
  recommended?: string;
  onPick: (file: File) => void;
  onRemove?: () => void;
  previewClassName?: string;
};

const inputCls =
  "block w-full text-[12px] text-[var(--color-text-dim)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-bg-card)] file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-[var(--color-text)] hover:file:bg-[var(--color-bg-input)]";

export function ImageUploader({
  label,
  hint,
  url,
  busy,
  recommended,
  onPick,
  onRemove,
  previewClassName,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draftUrl, setDraftUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (draftUrl) URL.revokeObjectURL(draftUrl);
    };
  }, [draftUrl]);

  const handleFile = (file: File | null | undefined) => {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Tiene que ser una imagen.");
      return;
    }
    if (draftUrl) URL.revokeObjectURL(draftUrl);
    setDraftUrl(URL.createObjectURL(file));
    onPick(file);
  };

  const preview = draftUrl ?? storageUrl(url);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-dashed bg-[var(--color-bg-input)] p-2.5 transition",
        dragging
          ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_6%,transparent)]"
          : "border-[var(--color-border-strong)]"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
    >
      <div
        className={cn(
          "relative aspect-square w-full overflow-hidden rounded-lg bg-[var(--color-bg-card)]",
          previewClassName
        )}
      >
        {preview ? (
          <Image
            src={preview}
            alt={label}
            fill
            sizes="160px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-1 text-[var(--color-text-muted)] transition hover:text-[var(--color-accent)]"
            aria-label={`Subir ${label}`}
          >
            <Icon name="upload" size={22} />
            <span className="text-[10px] font-medium">Click o arrastrá</span>
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-semibold text-[var(--color-text)]">
            {label}
          </div>
          {(hint || recommended) && (
            <div className="truncate text-[10px] text-[var(--color-text-muted)]">
              {hint ?? recommended}
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 py-1 text-[10px] font-semibold text-[var(--color-text)] hover:bg-[var(--color-bg-input)] disabled:opacity-60"
          >
            {preview ? "Reemplazar" : "Subir"}
          </button>
          {preview && onRemove && (
            <button
              type="button"
              onClick={() => {
                if (draftUrl) {
                  URL.revokeObjectURL(draftUrl);
                  setDraftUrl(null);
                }
                onRemove();
              }}
              disabled={busy}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 py-1 text-[10px] font-semibold text-[var(--color-danger)] hover:bg-[var(--color-bg-input)] disabled:opacity-60"
            >
              {busy ? "…" : "Quitar"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="text-[10px] font-medium text-[var(--color-danger)]">
          {error}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

export { inputCls as imageInputCls };