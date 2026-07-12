"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { Icon } from "@/components/brand";

export type BulkSlot = {
  id: string;
  file?: File;
  previewUrl?: string;
  title: string;
  price: string;
  error?: string;
};

export type BulkSubmitResult = {
  ok: boolean;
  created: number;
  failed: number;
  results: Array<{
    index: number;
    status: "ok" | "error";
    productId?: string;
    message?: string;
  }>;
};

export function BulkProductForm() {
  const router = useRouter();
  const [slots, setSlots] = useState<BulkSlot[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<BulkSubmitResult | null>(null);
  const counterRef = useRef(0);

  useEffect(() => {
    setSlots((cur) => (cur.length === 0 ? [makeSlot(counterRef)] : cur));
    return () => {
      slots.forEach((s) => {
        if (s.previewUrl) URL.revokeObjectURL(s.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validCount = slots.filter((s) => s.file && s.title.trim() && parseFloat(s.price) >= 0).length;

  const addSlot = () => {
    setSlots((cur) => [...cur, makeSlot(counterRef)]);
  };

  const removeSlot = (id: string) => {
    setSlots((cur) => {
      const target = cur.find((s) => s.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return cur.filter((s) => s.id !== id);
    });
  };

  const updateSlot = (id: string, patch: Partial<BulkSlot>) => {
    setSlots((cur) =>
      cur.map((s) => (s.id === id ? { ...s, ...patch, error: undefined } : s)),
    );
  };

  const onPickFile = (id: string, file: File | undefined) => {
    if (!file) return;
    setSlots((cur) => {
      const target = cur.find((s) => s.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return cur.map((s) =>
        s.id === id
          ? {
              ...s,
              file,
              previewUrl: URL.createObjectURL(file),
              error: undefined,
            }
          : s,
      );
    });
  };

  const clearFile = (id: string) => {
    setSlots((cur) => {
      const target = cur.find((s) => s.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return cur.map((s) =>
        s.id === id ? { ...s, file: undefined, previewUrl: undefined } : s,
      );
    });
  };

  const submit = async () => {
    setGlobalError(null);
    setFinalResult(null);

    const ready = slots.filter(
      (s) => s.file && s.title.trim().length > 0 && Number.isFinite(parseFloat(s.price)) && parseFloat(s.price) >= 0,
    );
    if (ready.length === 0) {
      setGlobalError("Agregá al menos un slot con imagen, título y precio.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const form = new FormData();
    form.append(
      "slots",
      JSON.stringify(
        ready.map((s) => ({
          title: s.title.trim(),
          price: parseFloat(s.price),
        })),
      ),
    );
    for (const s of ready) {
      if (s.file) form.append("productImages", s.file);
    }

    setSubmitting(true);
    try {
      const { default: api } = await import("@/lib/api").then((m) => ({ default: m.api }));
      const { data } = await api.post<BulkSubmitResult>(
        "/products/bulk",
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setFinalResult(data);

      const failedIndices = new Set(
        data.results.filter((r) => r.status === "error").map((r) => r.index),
      );
      const readyIds = ready.map((s) => s.id);
      const failedIds = new Set(
        Array.from(failedIndices).map((i) => readyIds[i]).filter((x): x is string => !!x),
      );
      setSlots((cur) =>
        cur.map((s) =>
          failedIds.has(s.id)
            ? {
                ...s,
                error:
                  data.results.find((r) => r.status === "error")?.message ??
                  "Error al crear",
              }
            : s,
        ),
      );

      if (data.created > 0) {
        setTimeout(() => router.push("/admin/products"), 1500);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
          : undefined;
      setGlobalError(typeof msg === "string" ? msg : "No se pudo procesar la carga masiva");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  if (finalResult && finalResult.created > 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_8%,var(--color-bg-card))] p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-success)]/20 text-[var(--color-success)]">
          <Icon name="check" size={26} />
        </div>
        <div className="font-grotesk text-[18px] font-semibold">
          ¡{finalResult.created} producto(s) creado(s)!
        </div>
        {finalResult.failed > 0 && (
          <div className="text-[12px] text-[var(--color-warning)]">
            {finalResult.failed} no pudieron crearse. Quedan marcados en el
            formulario para que los corrijas.
          </div>
        )}
        <div className="text-[11px] text-[var(--color-text-dim)]">
          Redirigiendo al listado…
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {globalError && (
        <div className="flex items-center gap-2 rounded-[10px] border border-[var(--color-danger)] bg-[color-mix(in_srgb,var(--color-danger)_10%,var(--color-bg-card))] px-3.5 py-2.5 text-[12px] font-medium text-[var(--color-danger)]">
          <Icon name="alert" size={14} />
          {globalError}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
        <div className="text-[12px] font-semibold text-[var(--color-text-dim)]">
          {slots.length} slot(s) · {validCount} listo(s) para subir
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={addSlot}
          disabled={submitting || slots.length >= 100}
          className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 text-[12px] font-semibold text-[var(--color-text)] hover:bg-[var(--color-bg-card)] disabled:opacity-60"
        >
          <Plus size={14} />
          Agregar slot
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {slots.map((slot, idx) => (
          <SlotCard
            key={slot.id}
            slot={slot}
            index={idx}
            disabled={submitting}
            onPickFile={(f) => onPickFile(slot.id, f)}
            onClearFile={() => clearFile(slot.id)}
            onUpdate={(patch) => updateSlot(slot.id, patch)}
            onRemove={() => removeSlot(slot.id)}
          />
        ))}
      </div>

      <div className="sticky bottom-0 -mx-4 mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 md:-mx-6 md:px-6 lg:-mx-7 lg:px-7">
        <div className="text-[12px] text-[var(--color-text-dim)]">
          {validCount === 0
            ? "Cargá al menos un slot para continuar"
            : `Se crearán ${validCount} producto(s)`}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={submitting}
            className="h-10 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 text-[13px] font-medium text-[var(--color-text)] disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || validCount === 0}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-5 text-[13px] font-semibold text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)] disabled:opacity-60"
          >
            {submitting && (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-button-text)] border-t-transparent" />
            )}
            {submitting ? "Subiendo…" : `Subir ${validCount} producto(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}

function SlotCard({
  slot,
  index,
  disabled,
  onPickFile,
  onClearFile,
  onUpdate,
  onRemove,
}: {
  slot: BulkSlot;
  index: number;
  disabled: boolean;
  onPickFile: (file?: File) => void;
  onClearFile: () => void;
  onUpdate: (patch: Partial<BulkSlot>) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const priceValid = Number.isFinite(parseFloat(slot.price)) && parseFloat(slot.price) >= 0;
  const titleValid = slot.title.trim().length > 0;
  const fileValid = !!slot.file;
  const isReady = fileValid && titleValid && priceValid;

  return (
    <div
      className={cnCard(!!slot.error, isReady)}
    >
      <div className="flex items-center justify-between px-3 pt-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-bg-input)] font-mono text-[10px] font-semibold text-[var(--color-text-dim)]">
            {index + 1}
          </span>
          {isReady && (
            <span className="rounded-full bg-[var(--color-success)]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-success)]">
              Listo
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-dim)] hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)] disabled:opacity-40"
          title="Eliminar slot"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="p-3 pt-2">
        {slot.previewUrl ? (
          <div className="relative aspect-square overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slot.previewUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={onClearFile}
              disabled={disabled}
              className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-bg-card)] text-[var(--color-danger)] shadow"
              title="Quitar imagen"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-input)] text-[var(--color-text-dim)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)] disabled:opacity-60"
          >
            <Upload size={22} />
            <span className="text-[11px] font-semibold">Subí una imagen</span>
            <span className="text-[10px]">PNG · JPG · WEBP</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              onPickFile(f);
              setTimeout(() => titleRef.current?.focus(), 50);
            }
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex flex-col gap-2.5 px-3 pb-3">
        <div>
          <input
            ref={titleRef}
            type="text"
            value={slot.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            disabled={disabled}
            placeholder="Título del producto"
            className="h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 text-[13px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] disabled:opacity-60"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[var(--color-text-dim)]">
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={slot.price}
              onChange={(e) => onUpdate({ price: e.target.value })}
              disabled={disabled}
              placeholder="Precio"
              className="h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] pl-6 pr-2 text-[13px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] disabled:opacity-60"
            />
          </div>
          <div className="flex h-9 items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] px-2.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-dim)]">
            Stock: 1
          </div>
        </div>
        {slot.error && (
          <div className="flex items-start gap-1.5 rounded-md bg-[var(--color-danger)]/10 px-2 py-1.5 text-[11px] font-medium text-[var(--color-danger)]">
            <Icon name="alert" size={11} />
            <span>{slot.error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function cnCard(hasError: boolean, ready: boolean) {
  return [
    "flex flex-col rounded-2xl border bg-[var(--color-bg-card)] transition",
    hasError
      ? "border-[var(--color-danger)]"
      : ready
        ? "border-[var(--color-success)]/60"
        : "border-[var(--color-border)]",
  ].join(" ");
}

function makeSlot(counterRef: React.MutableRefObject<number>) {
  counterRef.current += 1;
  return {
    id: `slot-${Date.now()}-${counterRef.current}`,
    title: "",
    price: "",
  };
}