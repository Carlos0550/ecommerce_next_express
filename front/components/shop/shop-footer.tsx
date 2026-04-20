import Link from "next/link";
import { CinnamonLogo } from "@/components/brand";

export function ShopFooter({ businessName }: { businessName?: string }) {
  return (
    <footer className="mt-16 hidden border-t border-[var(--color-border)] bg-[var(--color-bg-elev)] md:block">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-10 py-8">
        <CinnamonLogo size={14} />
        <div className="flex items-center gap-6 text-[12px] text-[var(--color-text-dim)]">
          <Link href="/faq" className="hover:text-[var(--color-text)]">
            Preguntas frecuentes
          </Link>
          <span>
            © {new Date().getFullYear()} {businessName ?? "Cinnamon"} · Buenos Aires
          </span>
        </div>
      </div>
    </footer>
  );
}
