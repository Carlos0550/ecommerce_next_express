"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCartStore } from "@/stores/cart.store";
import { useAuthStore } from "@/stores/auth.store";
import { CinnamonLogo, Icon } from "@/components/brand";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

export function ShopHeader({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const user = useAuthStore((s) => s.user);

  const links: { href: string; label: string }[] = [
    { href: "/", label: "Inicio" },
    ...categories.slice(0, 4).map((c) => ({
      href: `/categoria/${c.slug ?? c.id}`,
      label: c.title,
    })),
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 hidden border-b border-[var(--color-border)] bg-[var(--color-bg-elev)]/95 backdrop-blur-md md:block">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-8 px-10">
        <Link href="/" className="shrink-0">
          <CinnamonLogo size={17} />
        </Link>
        <nav className="flex flex-1 items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.href + l.label}
              href={l.href}
              className={cn(
                "text-[13px] font-medium transition",
                isActive(l.href)
                  ? "text-[var(--color-text)]"
                  : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden h-9 w-[240px] items-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 lg:flex">
          <Icon name="search" size={14} className="text-[var(--color-text-dim)]" />
          <span className="text-[12px] text-[var(--color-text-muted)]">
            Buscar productos…
          </span>
        </div>
        <Link
          href={user ? "/account" : "/login"}
          className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text)] hover:bg-[var(--color-bg-input)]"
        >
          <Icon name="user" size={15} />
        </Link>
        <Link
          href="/cart"
          className="relative flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text)] hover:bg-[var(--color-bg-input)]"
        >
          <Icon name="cart" size={15} />
          {count > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-semibold text-[var(--color-button-text)]">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
