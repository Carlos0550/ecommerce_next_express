import { CategoryChips } from "@/components/shop/category-chips";
import { ProductCard } from "@/components/shop/product-card";
import { fetchPublicCategories, fetchPublicProducts } from "@/lib/shop/server";

export const metadata = { title: "Catálogo" };
export const revalidate = 60;

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const [categories, products] = await Promise.all([
    fetchPublicCategories(),
    fetchPublicProducts({ limit: 60, title: query || undefined }),
  ]);
  return (
    <>
      <CategoryChips categories={categories} />
      <section className="mx-auto max-w-[1280px] px-4 pb-12 md:px-10">
        <h1 className="mt-3 mb-4 font-grotesk text-[22px] font-semibold tracking-[-0.5px] md:text-[28px]">
          {query ? `Resultados para “${query}”` : "Todos los productos"}
        </h1>
        {products.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-10 text-center text-sm text-[var(--color-text-dim)]">
            {query
              ? "No encontramos productos para esa búsqueda."
              : "Todavía no hay productos publicados."}
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
