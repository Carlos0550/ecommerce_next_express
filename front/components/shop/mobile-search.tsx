"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/brand";

export function MobileSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/categoria?q=${encodeURIComponent(term)}` : "/categoria");
  };

  return (
    <form
      onSubmit={submit}
      className="flex h-11 items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3.5 focus-within:border-[var(--color-accent)]"
    >
      <Icon name="search" size={15} className="text-[var(--color-text-dim)]" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar productos…"
        className="w-full bg-transparent text-[13px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
      />
    </form>
  );
}
