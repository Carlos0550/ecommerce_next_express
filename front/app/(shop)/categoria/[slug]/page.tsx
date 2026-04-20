import type { Metadata } from "next";
import { CategoryChips } from "@/components/shop/category-chips";
import { ProductCard } from "@/components/shop/product-card";
import {
  fetchPublicCategories,
  fetchPublicProducts,
} from "@/lib/shop/server";

export const revalidate = 60;

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const categories = await fetchPublicCategories();
  const cat = categories.find(
    (c) => (c.slug && c.slug === slug) || String(c.id) === slug
  );
  return { title: cat?.title ?? "Catálogo" };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const categories = await fetchPublicCategories();
  const cat = categories.find(
    (c) => (c.slug && c.slug === slug) || String(c.id) === slug
  );
  const products = await fetchPublicProducts({
    categoryId: cat?.id,
    limit: 60,
  });

  return (
    <>
      <CategoryChips categories={categories} activeId={cat?.id ?? null} />
      <section className="mx-auto max-w-[1280px] px-4 pb-12 md:px-10">
        <h1 className="mt-3 mb-4 font-grotesk text-[22px] font-semibold tracking-[-0.5px] md:text-[28px]">
          {cat?.title ?? "Todos los productos"}
        </h1>
        {products.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-10 text-center text-sm text-[var(--color-text-dim)]">
            Sin productos en esta categoría.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
