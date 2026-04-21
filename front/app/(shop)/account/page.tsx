"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import { Icon, type IconName } from "@/components/brand";
import { formatARS } from "@/lib/utils";
import type { User, Order } from "@/lib/types";

export default function AccountPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const storedUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (!token) router.replace("/login");
  }, [token, router]);

  const meQ = useQuery({
    queryKey: ["shop", "me"],
    enabled: !!token,
    queryFn: async () => {
      const { data } = await api.get<{ user?: User } & User>("/profile/me");
      return (data?.user ?? data) as User;
    },
  });

  const ordersQ = useQuery({
    queryKey: ["shop", "orders", "stats"],
    enabled: !!token,
    queryFn: async () => {
      const { data } = await api.get<{ orders?: Order[] } & { data?: Order[] }>(
        "/orders?page=1&limit=100"
      );
      return data?.orders ?? data?.data ?? [];
    },
  });

  const user = meQ.data ?? storedUser;
  const orders = ordersQ.data ?? [];
  const totalSpent = orders.reduce((n, o) => n + Number(o.total ?? 0), 0);
  const activeOrders = orders.filter((o) =>
    ["PENDING", "PAID", "PROCESSING", "SHIPPED"].includes(o.status)
  ).length;
  const initials =
    user?.name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "·";

  const rows: { icon: IconName; label: string; sub?: string; href?: string }[] = [
    { icon: "receipt", label: "Mis órdenes", sub: `${activeOrders} en curso`, href: "/orders" },
    { icon: "heart", label: "Lista de deseos", sub: "0 productos" },
    { icon: "home", label: "Direcciones", sub: user?.address ?? "Sin direcciones" },
    { icon: "settings", label: "Configuración" },
  ];

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-12 pt-4 md:px-10 md:pt-8">
      <div className="flex items-center gap-4">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 font-grotesk text-[22px] font-semibold md:h-20 md:w-20 md:text-[28px]"
          style={{
            borderColor: "var(--color-accent)",
            background: "var(--color-accent-soft)",
            color: "var(--color-accent)",
          }}
        >
          {initials}
        </div>
        <div>
          <div className="font-grotesk text-[20px] font-semibold tracking-[-0.4px] md:text-[26px]">
            {user?.name ?? "—"}
          </div>
          <div className="text-[12px] text-[var(--color-text-dim)] md:text-[13px]">
            {user?.email ?? "—"}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2.5 md:grid-cols-4">
        <Stat label="Órdenes" value={String(orders.length)} />
        <Stat label="En curso" value={String(activeOrders)} />
        <Stat label="Total gastado" value={formatARS(totalSpent)} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {rows.map((r) => {
          const inner = (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-bg-input)]">
                <Icon name={r.icon} size={16} />
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-medium">{r.label}</div>
                {r.sub && (
                  <div className="mt-0.5 text-[11px] text-[var(--color-text-dim)]">
                    {r.sub}
                  </div>
                )}
              </div>
              <Icon name="chevronRight" size={15} className="text-[var(--color-text-dim)]" />
            </>
          );
          const className =
            "flex items-center gap-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 text-left transition hover:border-[var(--color-border-strong)]";
          return r.href ? (
            <Link key={r.label} href={r.href} className={className}>
              {inner}
            </Link>
          ) : (
            <button key={r.label} type="button" className={className}>
              {inner}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          logout();
          router.push("/");
        }}
        className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 py-3 text-[13px] font-semibold text-[var(--color-danger)] hover:bg-[var(--color-bg-input)]"
      >
        <Icon name="logout" size={14} /> Cerrar sesión
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3.5 text-center md:p-4">
      <div className="font-grotesk text-[18px] font-semibold md:text-[22px]">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-[0.5px] text-[var(--color-text-dim)] md:text-[11px]">
        {label}
      </div>
    </div>
  );
}
