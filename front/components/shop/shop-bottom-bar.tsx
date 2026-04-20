"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCartStore } from "@/stores/cart.store";
import { Icon, type IconName } from "@/components/brand";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Inicio", icon: "home" },
  { href: "/categoria", label: "Catálogo", icon: "grid" },
  { href: "/cart", label: "Carrito", icon: "cart" },
  { href: "/orders", label: "Órdenes", icon: "receipt" },
  { href: "/account", label: "Cuenta", icon: "user" },
];

export function ShopBottomBar() {
  const pathname = usePathname();
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-[var(--color-border)] bg-[var(--color-bg-elev)]/95 px-2 pb-[max(env(safe-area-inset-bottom),10px)] pt-2 backdrop-blur-md md:hidden">
      {ITEMS.map((i) => {
        const active = isActive(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-medium",
              active
                ? "text-[var(--color-accent)]"
                : "text-[var(--color-text-dim)]"
            )}
          >
            <span className="relative">
              <Icon name={i.icon} size={20} />
              {i.icon === "cart" && count > 0 && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[9px] font-semibold text-[var(--color-button-text)]">
                  {count}
                </span>
              )}
            </span>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
