"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useCartStore } from "@/stores/cart.store";
import { useAuthStore, isAdmin } from "@/stores/auth.store";
import { BrandLogo, Icon } from "@/components/brand";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

export function ShopHeader({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const user = useAuthStore((s) => s.user);
  const [q, setQ] = useState("");

  useEffect(() => {
    setQ(searchParams?.get("q") ?? "");
  }, [searchParams]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/categoria?q=${encodeURIComponent(term)}` : "/categoria");
  };

  const accountHref = user ? (isAdmin(user) ? "/admin" : "/account") : "/login";

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
          <BrandLogo size={17} />
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
        <form
          onSubmit={onSearch}
          className="hidden h-9 w-[240px] items-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 focus-within:border-[var(--color-accent)] lg:flex"
        >
          <Icon name="search" size={14} className="text-[var(--color-text-dim)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar productos…"
            className="w-full bg-transparent text-[12px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
          />
        </form>
        <Link
          href={accountHref}
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
