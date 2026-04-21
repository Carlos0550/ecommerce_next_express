"use client";

import Link from "next/link";
import { Icon } from "@/components/brand";
import { useBusinessName } from "@/components/business-provider";

export function MobileHeader() {
  const name = useBusinessName();
  return (
    <div className="flex items-center justify-between px-4 pb-2 pt-4">
      <Link href="/">
        <span className="font-grotesk text-[18px] font-semibold tracking-[-0.4px]">
          {name}
        </span>
      </Link>
      <div className="flex gap-2">
        <Link
          href="/cart"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]"
        >
          <Icon name="cart" size={15} />
        </Link>
      </div>
    </div>
  );
}
