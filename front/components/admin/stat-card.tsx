import { Icon, type IconName } from "@/components/brand";

export function StatCard({
  label,
  value,
  delta,
  positive,
  icon,
}: {
  label: string;
  value: string | number;
  delta?: string;
  positive?: boolean;
  icon: IconName;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 md:p-[18px]">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1 truncate text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)] md:text-[11px]">
          {label}
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-accent-soft)]">
          <Icon
            name={icon}
            size={14}
            className="text-[var(--color-accent)]"
          />
        </div>
      </div>
      <div className="truncate font-grotesk text-[20px] font-semibold leading-none tracking-[-0.6px] text-[var(--color-text)] md:text-[24px] lg:text-[28px]">
        {value}
      </div>
      {delta && (
        <div className="inline-flex items-center gap-1 text-[11px] font-medium">
          <span
            style={{
              color: positive
                ? "var(--color-success)"
                : "var(--color-danger)",
            }}
          >
            {positive ? "↑" : "↓"} {delta}
          </span>
          <span className="ml-1 text-[var(--color-text-dim)]">
            vs. mes pasado
          </span>
        </div>
      )}
    </div>
  );
}
