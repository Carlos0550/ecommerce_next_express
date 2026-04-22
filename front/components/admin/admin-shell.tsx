"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import { BrandLogo, Icon, type IconName } from "@/components/brand";
import { useBusiness } from "@/components/business-provider";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Bell, Menu, Search, X } from "lucide-react";
import type { Business } from "@/lib/types";

type NavItem = { href: string; label: string; icon: IconName };

const PRINCIPAL_MODERN: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "chart" },
  { href: "/admin/pos", label: "POS / Caja", icon: "cash" },
  { href: "/admin/sales", label: "Historial ventas", icon: "receipt" },
  { href: "/admin/orders", label: "Órdenes", icon: "package" },
  { href: "/admin/products", label: "Productos", icon: "box" },
  { href: "/admin/categories", label: "Categorías", icon: "tag" },
  { href: "/admin/users", label: "Clientes", icon: "users" },
];

const PRINCIPAL_LEGACY: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "chart" },
  { href: "/admin/ventas", label: "Ventas", icon: "cash" },
  { href: "/admin/orders", label: "Órdenes", icon: "package" },
  { href: "/admin/products", label: "Productos", icon: "box" },
  { href: "/admin/categories", label: "Categorías", icon: "tag" },
  { href: "/admin/users", label: "Clientes", icon: "users" },
];

const CONFIG: NavItem[] = [
  { href: "/admin/business", label: "Negocio", icon: "settings" },
  { href: "/admin/whatsapp", label: "WhatsApp", icon: "whatsapp" },
  { href: "/admin/faq", label: "FAQ", icon: "bell" },
];

export function AdminShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const ssrBusiness = useBusiness();
  const businessQ = useQuery<Business | null>({
    queryKey: ["business"],
    queryFn: async () => {
      const { data } = await api.get<Business>("/business");
      return data;
    },
    staleTime: 30_000,
  });
  const salesMode =
    businessQ.data?.admin_layout_config?.sales ??
    ssrBusiness?.admin_layout_config?.sales ??
    "modern";
  const PRINCIPAL = useMemo(
    () => (salesMode === "legacy" ? PRINCIPAL_LEGACY : PRINCIPAL_MODERN),
    [salesMode],
  );

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const initials =
    user?.name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "AM";

  const sidebar = (
    <aside className="flex h-full flex-col gap-0.5 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3.5 py-5">
      <div className="flex items-center justify-between px-2.5 pb-4 pt-1">
        <BrandLogo size={16} />
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-dim)] hover:bg-[var(--color-bg-input)] hover:text-[var(--color-text)] lg:hidden"
          aria-label="Cerrar menú"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <SidebarGroup label="Principal">
        {PRINCIPAL.map((i) => (
          <SidebarLink key={i.href} item={i} active={isActive(i.href)} />
        ))}
      </SidebarGroup>

      <SidebarGroup label="Configuración">
        {CONFIG.map((i) => (
          <SidebarLink key={i.href} item={i} active={isActive(i.href)} />
        ))}
      </SidebarGroup>

      <div className="flex-1" />

      <div className="mt-2.5 flex items-center gap-2.5 border-t border-[var(--color-border)] px-3 py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-[11px] font-semibold text-[var(--color-button-text)]">
          {initials}
        </div>
        <div className="min-w-0 text-[11px] leading-tight">
          <div className="truncate font-semibold text-[var(--color-text)]">
            {user?.name ?? "—"}
          </div>
          <div className="text-[var(--color-text-dim)]">Administradora</div>
        </div>
        <button
          onClick={() => {
            logout();
            router.replace("/admin/login");
          }}
          className="ml-auto shrink-0 text-[var(--color-text-dim)] hover:text-[var(--color-accent)]"
          title="Salir"
        >
          <Icon name="logout" size={16} />
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] lg:grid lg:h-screen lg:grid-cols-[232px_1fr] lg:overflow-hidden">
      <div className="hidden lg:block lg:h-screen">{sidebar}</div>

      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-y-0 left-0 z-50 w-[260px] max-w-[85vw] lg:hidden">
            {sidebar}
          </div>
        </>
      )}

      <main className="flex min-h-screen min-w-0 flex-col lg:h-screen">
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 md:px-6 md:py-4 lg:px-7 lg:py-[18px]">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text)] hover:bg-[var(--color-bg-input)] lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-grotesk text-[17px] font-semibold tracking-[-0.3px] text-[var(--color-text)] md:text-[20px]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--color-text-dim)] md:text-[12px]">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 md:gap-2.5">
            <div className="hidden h-9 w-[240px] items-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 xl:flex">
              <Search className="h-3.5 w-3.5 text-[var(--color-text-dim)]" />
              <span className="text-[12px] text-[var(--color-text-muted)]">
                Buscar…
              </span>
              <span className="ml-auto rounded border border-[var(--color-border)] bg-[var(--color-bg-card)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-dim)]">
                ⌘K
              </span>
            </div>
            <button className="hidden h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text)] hover:bg-[var(--color-bg-input)] md:flex">
              <Bell className="h-4 w-4" />
            </button>
            {actions && (
              <div className="flex items-center gap-2 [&>*]:shrink-0">
                {actions}
              </div>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-7">{children}</div>
      </main>
    </div>
  );
}

function SidebarGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-text-dim)]">
        {label}
      </div>
      {children}
    </>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px]",
        active
          ? "bg-[var(--color-accent-soft)] font-semibold text-[var(--color-accent)]"
          : "font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-input)]"
      )}
    >
      <Icon
        name={item.icon}
        size={16}
        className={
          active ? "text-[var(--color-accent)]" : "text-[var(--color-text-dim)]"
        }
      />
      <span>{item.label}</span>
    </Link>
  );
}
