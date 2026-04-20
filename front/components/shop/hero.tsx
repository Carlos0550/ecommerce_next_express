import Link from "next/link";
import { ProductImg, Icon } from "@/components/brand";
import type { Product } from "@/lib/types";

export function Hero({ featured = [] }: { featured?: Product[] }) {
  return (
    <section className="px-4 pt-4 md:mx-auto md:max-w-[1280px] md:px-10 md:pt-10">
      <div
        className="relative grid grid-cols-1 gap-8 overflow-hidden rounded-[22px] border border-[var(--color-border)] p-6 md:grid-cols-2 md:rounded-3xl md:p-12 md:min-h-[340px]"
        style={{ background: "var(--hero-gradient)" }}
      >
        <div className="flex flex-col justify-center">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[1.8px] text-[var(--color-accent)]">
            — Nueva colección
          </div>
          <h1 className="font-grotesk text-[32px] font-semibold leading-[1.05] tracking-[-0.8px] md:text-[56px] md:leading-[1] md:tracking-[-1.5px]">
            Glow noir,
            <br />
            <em className="not-italic text-[var(--color-accent)]" style={{ fontStyle: "italic" }}>
              muy tuyo.
            </em>
          </h1>
          <p className="mt-4 max-w-md text-[13px] leading-relaxed text-[var(--color-text-dim)] md:text-[15px]">
            Labiales, bases, skin care y accesorios pensados para romper la rutina.
          </p>
          <Link
            href="/categoria"
            className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-text)] px-5 py-3 text-[13px] font-semibold text-[var(--color-bg)] md:rounded-xl md:px-6 md:py-3.5 md:text-[14px]"
          >
            Ver novedades <Icon name="arrow" size={14} />
          </Link>
        </div>
        {featured.length > 0 && (
          <div className="hidden grid-cols-2 gap-3 md:grid">
            {featured.slice(0, 4).map((p, i) => (
              <ProductImg
                key={p.id}
                label={p.title}
                image={p.images?.[0]?.url}
                tone={i % 2 ? "pink" : "accent"}
                rounded={18}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
