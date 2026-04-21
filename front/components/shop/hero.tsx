import Link from "next/link";
import Image from "next/image";
import { ProductImg, Icon } from "@/components/brand";
import { storageUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { BannerConfig, Product } from "@/lib/types";

const DEFAULT_CONFIG: BannerConfig = {
  variant: "split-grid",
  eyebrow: "Nueva colección",
  title_main: "Glow noir,",
  title_accent: "muy tuyo.",
  subtitle:
    "Labiales, bases, skin care y accesorios pensados para romper la rutina.",
  cta_label: "Ver novedades",
  cta_href: "/categoria",
  image_source: "auto-products",
  product_ids: [],
  custom_images: [],
};

function mergeConfig(cfg?: BannerConfig | null): BannerConfig {
  if (!cfg) return DEFAULT_CONFIG;
  return {
    ...DEFAULT_CONFIG,
    ...cfg,
    eyebrow: cfg.eyebrow ?? DEFAULT_CONFIG.eyebrow,
    title_main: cfg.title_main ?? DEFAULT_CONFIG.title_main,
    title_accent: cfg.title_accent ?? DEFAULT_CONFIG.title_accent,
    subtitle: cfg.subtitle ?? DEFAULT_CONFIG.subtitle,
    cta_label: cfg.cta_label ?? DEFAULT_CONFIG.cta_label,
    cta_href: cfg.cta_href ?? DEFAULT_CONFIG.cta_href,
    image_source: cfg.image_source ?? DEFAULT_CONFIG.image_source,
    product_ids: cfg.product_ids ?? [],
    custom_images: cfg.custom_images ?? [],
  };
}

function resolveImages(
  cfg: BannerConfig,
  products: Product[],
  max: number,
): { src: string; alt: string }[] {
  if (cfg.image_source === "custom") {
    return (cfg.custom_images ?? [])
      .filter(Boolean)
      .slice(0, max)
      .map((url, i) => ({ src: storageUrl(url), alt: `Banner ${i + 1}` }));
  }

  if (cfg.image_source === "products" && cfg.product_ids?.length) {
    const byId = new Map(products.map((p) => [p.id, p]));
    return cfg.product_ids
      .map((id) => byId.get(id))
      .filter((p): p is Product => Boolean(p?.images?.[0]?.url))
      .slice(0, max)
      .map((p) => ({
        src: storageUrl(p.images![0].url),
        alt: p.title,
      }));
  }

  return products
    .filter((p) => p.images?.[0]?.url)
    .slice(0, max)
    .map((p) => ({ src: storageUrl(p.images![0].url), alt: p.title }));
}

export function Hero({
  featured = [],
  config,
}: {
  featured?: Product[];
  config?: BannerConfig | null;
}) {
  const cfg = mergeConfig(config);
  if (cfg.variant === "none") return null;

  if (cfg.variant === "centered") return <CenteredVariant cfg={cfg} />;
  if (cfg.variant === "overlay")
    return <OverlayVariant cfg={cfg} products={featured} />;
  if (cfg.variant === "split-single")
    return <SplitSingleVariant cfg={cfg} products={featured} />;
  return <SplitGridVariant cfg={cfg} products={featured} />;
}

function ShellWrapper({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section className="px-4 pt-4 md:mx-auto md:max-w-[1280px] md:px-10 md:pt-10">
      <div
        className={cn(
          "relative overflow-hidden rounded-[22px] border border-[var(--color-border)] md:rounded-3xl",
          className,
        )}
        style={{ background: "var(--hero-gradient)", ...style }}
      >
        {children}
      </div>
    </section>
  );
}

function HeroCopy({
  cfg,
  centered = false,
  invert = false,
}: {
  cfg: BannerConfig;
  centered?: boolean;
  invert?: boolean;
}) {
  const eyebrowColor = invert ? "var(--color-bg)" : "var(--color-accent)";
  const titleColor = invert ? "var(--color-bg)" : "var(--color-text)";
  const subColor = invert
    ? "color-mix(in srgb, var(--color-bg) 80%, transparent)"
    : "var(--color-text-dim)";
  const ctaBg = invert ? "var(--color-bg)" : "var(--color-text)";
  const ctaFg = invert ? "var(--color-text)" : "var(--color-bg)";

  return (
    <div
      className={cn(
        "flex flex-col justify-center",
        centered && "items-center text-center",
      )}
    >
      {cfg.eyebrow && (
        <div
          className="mb-3 text-[11px] font-semibold uppercase tracking-[1.8px]"
          style={{ color: eyebrowColor }}
        >
          — {cfg.eyebrow}
        </div>
      )}
      <h1
        className="font-grotesk text-[32px] font-semibold leading-[1.05] tracking-[-0.8px] md:text-[56px] md:leading-[1] md:tracking-[-1.5px]"
        style={{ color: titleColor }}
      >
        {cfg.title_main}
        {cfg.title_accent && (
          <>
            <br />
            <em
              className="not-italic"
              style={{
                fontStyle: "italic",
                color: invert ? "var(--color-bg)" : "var(--color-accent)",
              }}
            >
              {cfg.title_accent}
            </em>
          </>
        )}
      </h1>
      {cfg.subtitle && (
        <p
          className={cn(
            "mt-4 max-w-md text-[13px] leading-relaxed md:text-[15px]",
            centered && "mx-auto",
          )}
          style={{ color: subColor }}
        >
          {cfg.subtitle}
        </p>
      )}
      {cfg.cta_label && cfg.cta_href && (
        <Link
          href={cfg.cta_href}
          className="mt-5 inline-flex w-fit items-center gap-2 rounded-full px-5 py-3 text-[13px] font-semibold md:rounded-xl md:px-6 md:py-3.5 md:text-[14px]"
          style={{ background: ctaBg, color: ctaFg }}
        >
          {cfg.cta_label} <Icon name="arrow" size={14} />
        </Link>
      )}
    </div>
  );
}

function SplitGridVariant({
  cfg,
  products,
}: {
  cfg: BannerConfig;
  products: Product[];
}) {
  const images = resolveImages(cfg, products, 4);
  return (
    <ShellWrapper>
      <div className="grid grid-cols-1 gap-8 p-6 md:grid-cols-2 md:p-12 md:min-h-[340px]">
        <HeroCopy cfg={cfg} />
        {images.length > 0 ? (
          <div className="hidden grid-cols-2 gap-3 md:grid">
            {images.map((im, i) => (
              <ImageCell key={i} src={im.src} alt={im.alt} index={i} />
            ))}
            {Array.from({ length: Math.max(0, 4 - images.length) }).map((_, i) => (
              <ProductImg
                key={`pad-${i}`}
                label={`Imagen ${images.length + i + 1}`}
                tone={(images.length + i) % 2 ? "pink" : "accent"}
                rounded={18}
              />
            ))}
          </div>
        ) : (
          <div className="hidden grid-cols-2 gap-3 md:grid">
            {[0, 1, 2, 3].map((i) => (
              <ProductImg
                key={i}
                label={`Imagen ${i + 1}`}
                tone={i % 2 ? "pink" : "accent"}
                rounded={18}
              />
            ))}
          </div>
        )}
      </div>
    </ShellWrapper>
  );
}

function SplitSingleVariant({
  cfg,
  products,
}: {
  cfg: BannerConfig;
  products: Product[];
}) {
  const [first] = resolveImages(cfg, products, 1);
  return (
    <ShellWrapper>
      <div className="grid grid-cols-1 gap-8 p-6 md:grid-cols-2 md:p-12 md:min-h-[400px]">
        <HeroCopy cfg={cfg} />
        <div className="relative hidden md:block">
          {first ? (
            <div
              className="relative h-full min-h-[320px] w-full overflow-hidden rounded-2xl border"
              style={{ borderColor: "var(--color-border)" }}
            >
              <Image
                src={first.src}
                alt={first.alt}
                fill
                sizes="(max-width: 1280px) 50vw, 600px"
                className="object-cover"
              />
            </div>
          ) : (
            <ProductImg label="Imagen principal" tone="accent" rounded={18} />
          )}
        </div>
      </div>
    </ShellWrapper>
  );
}

function CenteredVariant({ cfg }: { cfg: BannerConfig }) {
  return (
    <ShellWrapper>
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center md:px-16 md:py-20 md:min-h-[360px]">
        <HeroCopy cfg={cfg} centered />
      </div>
    </ShellWrapper>
  );
}

function OverlayVariant({
  cfg,
  products,
}: {
  cfg: BannerConfig;
  products: Product[];
}) {
  const [bg] = resolveImages(cfg, products, 1);
  return (
    <ShellWrapper className="border-transparent" style={{ background: "transparent" }}>
      <div
        className="relative overflow-hidden rounded-[22px] md:rounded-3xl"
        style={{ background: "var(--hero-gradient)" }}
      >
        {bg && (
          <>
            <Image
              src={bg.src}
              alt={bg.alt}
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 1200px"
              className="absolute inset-0 object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, color-mix(in srgb, var(--color-text) 70%, transparent) 0%, color-mix(in srgb, var(--color-text) 35%, transparent) 60%, transparent 100%)",
              }}
            />
          </>
        )}
        <div className="relative grid grid-cols-1 gap-8 p-6 md:grid-cols-2 md:p-12 md:min-h-[420px]">
          <HeroCopy cfg={cfg} invert={Boolean(bg)} />
        </div>
      </div>
    </ShellWrapper>
  );
}

function ImageCell({
  src,
  alt,
  index,
}: {
  src: string;
  alt: string;
  index: number;
}) {
  return (
    <div
      className="relative overflow-hidden border"
      style={{
        aspectRatio: "1 / 1",
        borderRadius: 18,
        borderColor: "var(--color-border)",
        background: "var(--color-bg-input)",
      }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 50vw, 320px"
        className="object-cover"
        priority={index === 0}
      />
    </div>
  );
}
