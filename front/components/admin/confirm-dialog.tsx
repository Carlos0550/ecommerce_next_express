"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Tone = "default" | "danger";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "default",
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-[440px] bg-[var(--color-bg-elev)] text-[var(--color-text)]">
        <DialogHeader>
          <DialogTitle className="font-grotesk text-[17px]">{title}</DialogTitle>
        </DialogHeader>
        {description && (
          <div className="text-[13px] leading-relaxed text-[var(--color-text-dim)]">
            {description}
          </div>
        )}
        <DialogFooter className="mt-2 flex-row gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3.5 py-2.5 text-[13px] font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-input)] disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "flex-1 rounded-[10px] px-3.5 py-2.5 text-[13px] font-semibold disabled:opacity-60",
              tone === "danger"
                ? "bg-[var(--color-danger)] text-white hover:opacity-90"
                : "bg-[var(--color-accent)] text-[var(--color-button-text)] hover:bg-[var(--color-accent-strong)]"
            )}
          >
            {loading ? "Procesando…" : confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
