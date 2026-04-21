import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ProductImg, Icon } from "@/components/brand";
import { AddToCart } from "@/components/shop/add-to-cart";
import { fetchPublicProduct } from "@/lib/shop/server";
import { formatARS } from "@/lib/utils";

export const revalidate = 60;

type Params = { slug: string };

function normalizeMarkdown(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n");
  text = text.replace(/\s+-\s+/g, "\n- ");
  text = text.replace(/(\*\*[^*]+:\*\*)\s*/g, "\n\n$1\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchPublicProduct(slug);
  if (!product) return { title: "Producto" };
  return {
    title: product.title,
    description: product.description?.slice(0, 160) ?? undefined,
    openGraph: {
      title: product.title,
      description: product.description?.slice(0, 160),
      images: product.images?.[0]?.url ? [product.images[0].url] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const product = await fetchPublicProduct(slug);
  if (!product) notFound();

  const images = product.images ?? [];

  return (
    <article className="mx-auto max-w-[1280px] px-4 pb-32 pt-4 md:grid md:grid-cols-2 md:gap-12 md:px-10 md:pt-8 md:pb-16">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-[var(--color-text-dim)] hover:text-[var(--color-text)] md:col-span-2"
      >
        <Icon name="back" size={13} /> Volver
      </Link>

      <div>
        <ProductImg
          label={product.title}
          image={images[0]?.url}
          tone="accent"
          rounded={24}
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 620px"
        />
        {images.length > 1 && (
          <div className="mt-3 hidden grid-cols-4 gap-2 md:grid">
            {images.slice(0, 4).map((im, i) => (
              <ProductImg
                key={im.id}
                label=""
                image={im.url}
                tone={i % 2 ? "pink" : "accent"}
                rounded={10}
              />
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 md:pt-0">
        {product.category?.title && (
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--color-accent)]">
            {product.category.title}
          </div>
        )}
        <h1 className="font-grotesk text-[26px] font-semibold leading-[1.1] tracking-[-0.6px] md:text-[38px] md:tracking-[-0.8px]">
          {product.title}
        </h1>
        <div className="mt-5 font-grotesk text-[28px] font-semibold md:text-[32px]">
          {formatARS(Number(product.price))}
        </div>
        {product.description && (
          <div className="prose-product mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 text-[13px] leading-relaxed text-[var(--color-text-dim)]">
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="mb-3 last:mb-0">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-[var(--color-text)]">
                    {children}
                  </strong>
                ),
                ul: ({ children }) => (
                  <ul className="my-3 list-disc space-y-1 pl-5">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="my-3 list-decimal space-y-1 pl-5">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li>{children}</li>,
                h1: ({ children }) => (
                  <h3 className="mb-2 mt-3 font-grotesk text-[15px] font-semibold text-[var(--color-text)]">
                    {children}
                  </h3>
                ),
                h2: ({ children }) => (
                  <h3 className="mb-2 mt-3 font-grotesk text-[15px] font-semibold text-[var(--color-text)]">
                    {children}
                  </h3>
                ),
                h3: ({ children }) => (
                  <h3 className="mb-2 mt-3 font-grotesk text-[14px] font-semibold text-[var(--color-text)]">
                    {children}
                  </h3>
                ),
              }}
            >
              {normalizeMarkdown(product.description)}
            </ReactMarkdown>
          </div>
        )}
        <AddToCart product={product} />
      </div>
    </article>
  );
}
