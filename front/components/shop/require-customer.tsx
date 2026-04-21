"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, isAdmin } from "@/stores/auth.store";

export function RequireCustomer({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    if (isAdmin(user)) {
      router.replace("/admin");
    }
  }, [hasHydrated, token, user, router]);

  if (!hasHydrated || !token || isAdmin(user)) return null;
  return <>{children}</>;
}
