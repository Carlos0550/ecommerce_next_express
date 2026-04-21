"use client";

import { AdminShell } from "./admin-shell";
import { Icon, type IconName } from "@/components/brand";

export function PlaceholderView({
  title,
  subtitle,
  icon,
  note,
}: {
  title: string;
  subtitle?: string;
  icon: IconName;
  note?: string;
}) {
  return (
    <AdminShell title={title} subtitle={subtitle}>
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-card)] p-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)]">
          <Icon
            name={icon}
            size={22}
            className="text-[var(--color-accent)]"
          />
        </div>
        <div>
          <div className="font-grotesk text-[20px] font-semibold text-[var(--color-text)]">
            {title}
          </div>
          <div className="mt-1 max-w-md text-[13px] text-[var(--color-text-dim)]">
            {note ??
              "Vista en construcción. Se implementará como parte del Paso 2 — vistas admin."}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
