"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand";
import { useBusinessName } from "@/components/business-provider";
import { useBusiness } from "@/components/business-provider";

export function ShopFooter() {
  const name = useBusinessName();
  const business = useBusiness();
  const city = business?.city?.trim();
  return (
    <footer className="mt-16 hidden border-t border-[var(--color-border)] bg-[var(--color-bg-elev)] md:block">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-10 py-8">
        <BrandLogo size={14} />
        <div className="flex items-center gap-6 text-[12px] text-[var(--color-text-dim)]">
          <Link href="/faq" className="hover:text-[var(--color-text)]">
            Preguntas frecuentes
          </Link>
          <span>
            © {new Date().getFullYear()} {name}
            {city ? ` · ${city}` : ""}
          </span>
        </div>
      </div>
    </footer>
  );
}
