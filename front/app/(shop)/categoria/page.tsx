import { CategoryChips } from "@/components/shop/category-chips";
import { ProductCard } from "@/components/shop/product-card";
import { fetchPublicCategories, fetchPublicProducts } from "@/lib/shop/server";

export const metadata = { title: "Catálogo" };
export const revalidate = 60;

export default async function CatalogPage() {
  const [categories, products] = await Promise.all([
    fetchPublicCategories(),
    fetchPublicProducts({ limit: 60 }),
  ]);
  return (
    <>
      <CategoryChips categories={categories} />
      <section className="mx-auto max-w-[1280px] px-4 pb-12 md:px-10">
        <h1 className="mt-3 mb-4 font-grotesk text-[22px] font-semibold tracking-[-0.5px] md:text-[28px]">
          Todos los productos
        </h1>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>
    </>
  );
}
