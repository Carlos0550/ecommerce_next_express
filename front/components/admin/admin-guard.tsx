"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore, isAdmin } from "@/stores/auth.store";
import { api } from "@/lib/api";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, user, logout, hasHydrated } = useAuthStore();
  const [status, setStatus] = useState<"checking" | "ok" | "redirect">(
    "checking"
  );

  const isLoginRoute = pathname === "/admin/login";

  useEffect(() => {
    let cancelled = false;

    async function validate() {
      if (isLoginRoute) {
        setStatus("ok");
        return;
      }
      if (!hasHydrated) return;
      if (!token || !user || !isAdmin(user)) {
        setStatus("redirect");
        router.replace("/admin/login");
        return;
      }
      try {
        const { data } = await api.get("/admin/validate-token");
        if (cancelled) return;
        if (data?.ok) {
          setStatus("ok");
        } else {
          throw new Error("invalid");
        }
      } catch {
        if (cancelled) return;
        logout();
        setStatus("redirect");
        router.replace("/admin/login");
      }
    }

    validate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isLoginRoute, hasHydrated]);

  if (isLoginRoute) return <>{children}</>;

  if (status !== "ok") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] text-[var(--color-text-dim)]">
        <span className="font-mono text-xs uppercase tracking-widest">
          Validando sesión…
        </span>
      </div>
    );
  }

  return <>{children}</>;
}
