import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

export function CategoryChips({
  categories,
  activeId,
}: {
  categories: Category[];
  activeId?: number | string | null;
}) {
  const items = [{ id: "all", title: "Todo", slug: "" }, ...categories];
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 md:mx-auto md:max-w-[1280px] md:px-10 md:py-3 [&::-webkit-scrollbar]:hidden">
      {items.map((c) => {
        const isAll = c.id === "all";
        const href = isAll ? "/" : `/categoria/${c.slug ?? c.id}`;
        const active = isAll ? !activeId : String(activeId) === String(c.id);
        return (
          <Link
            key={String(c.id)}
            href={href}
            className={cn(
              "whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-medium transition",
              active
                ? "border-[var(--color-text)] bg-[var(--color-text)] text-[var(--color-bg)]"
                : "border-[var(--color-border)] bg-transparent text-[var(--color-text)] hover:border-[var(--color-border-strong)]"
            )}
          >
            {c.title}
          </Link>
        );
      })}
    </div>
  );
}
