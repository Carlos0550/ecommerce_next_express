"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function SalesModal({
  open,
  onClose,
  title,
  children,
  size = "wide",
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  size?: "narrow" | "wide";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          "flex max-h-full w-full flex-col overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg)] shadow-xl",
          "h-full sm:h-auto sm:max-h-[92vh] sm:rounded-2xl",
          size === "wide" ? "sm:max-w-5xl" : "sm:max-w-lg",
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3 md:px-5">
          <div className="text-[15px] font-semibold text-[var(--color-text)]">
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-dim)] hover:bg-[var(--color-bg-input)] hover:text-[var(--color-text)]"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-5">{children}</div>
      </div>
    </div>
  );
}
