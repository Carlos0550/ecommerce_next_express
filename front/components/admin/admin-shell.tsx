"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { BrandLogo, Icon, type IconName } from "@/components/brand";
import { cn } from "@/lib/utils";
import { Bell, Search } from "lucide-react";

type NavItem = { href: string; label: string; icon: IconName };

const PRINCIPAL: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "chart" },
  { href: "/admin/pos", label: "POS / Caja", icon: "cash" },
  { href: "/admin/sales", label: "Historial ventas", icon: "receipt" },
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

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const initials =
    user?.name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "AM";

  return (
    <div className="grid h-screen grid-cols-[232px_1fr] overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      <aside className="flex h-screen flex-col gap-0.5 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3.5 py-5">
        <div className="px-2.5 pb-4 pt-1">
          <BrandLogo size={16} />
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
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)] text-[11px] font-semibold text-[var(--color-button-text)]">
            {initials}
          </div>
          <div className="text-[11px] leading-tight">
            <div className="font-semibold text-[var(--color-text)]">
              {user?.name ?? "—"}
            </div>
            <div className="text-[var(--color-text-dim)]">Administradora</div>
          </div>
          <button
            onClick={() => {
              logout();
              router.replace("/admin/login");
            }}
            className="ml-auto text-[var(--color-text-dim)] hover:text-[var(--color-accent)]"
            title="Salir"
          >
            <Icon name="logout" size={16} />
          </button>
        </div>
      </aside>

      <main className="flex h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)] px-7 py-[18px]">
          <div>
            <h1 className="font-grotesk text-[20px] font-semibold tracking-[-0.3px] text-[var(--color-text)]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 text-[12px] text-[var(--color-text-dim)]">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-[240px] items-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3">
              <Search className="h-3.5 w-3.5 text-[var(--color-text-dim)]" />
              <span className="text-[12px] text-[var(--color-text-muted)]">
                Buscar…
              </span>
              <span className="ml-auto rounded border border-[var(--color-border)] bg-[var(--color-bg-card)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-dim)]">
                ⌘K
              </span>
            </div>
            <button className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text)] hover:bg-[var(--color-bg-input)]">
              <Bell className="h-4 w-4" />
            </button>
            {actions}
          </div>
        </header>
        <div className="flex-1 overflow-auto p-7">{children}</div>
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
