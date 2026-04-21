"use client";

import { useState } from "react";
import { Icon } from "@/components/brand";
import { cn } from "@/lib/utils";
import type { FAQ } from "@/lib/types";

export function FaqAccordion({ items }: { items: FAQ[] }) {
  const [open, setOpen] = useState<number | null>(items[0]?.id ?? null);
  return (
    <div className="flex flex-col gap-2">
      {items.map((f) => {
        const isOpen = open === f.id;
        return (
          <div
            key={f.id}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)]"
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : f.id)}
              className="flex w-full items-center justify-between gap-4 p-4 text-left"
            >
              <span className="text-[14px] font-medium">{f.question}</span>
              <Icon
                name="chevronRight"
                size={15}
                className={cn(
                  "shrink-0 text-[var(--color-text-dim)] transition-transform",
                  isOpen && "rotate-90"
                )}
              />
            </button>
            {isOpen && (
              <div className="px-4 pb-4 text-[13px] leading-relaxed text-[var(--color-text-dim)]">
                {f.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
