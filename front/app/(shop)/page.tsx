import Link from "next/link";
import { Hero } from "@/components/shop/hero";
import { CategoryChips } from "@/components/shop/category-chips";
import { ProductCard } from "@/components/shop/product-card";
import { MobileHeader } from "@/components/shop/mobile-header";
import { MobileSearch } from "@/components/shop/mobile-search";
import { Icon } from "@/components/brand";
import {
  fetchBusiness,
  fetchPublicCategories,
  fetchPublicProducts,
} from "@/lib/shop/server";

export const revalidate = 10;

export default async function ShopHome() {
  const [business, categories, products] = await Promise.all([
    fetchBusiness(),
    fetchPublicCategories(),
    fetchPublicProducts({ limit: 24 }),
  ]);

  return (
    <>
      <div className="md:hidden">
        <MobileHeader />
      </div>
      <Hero featured={products} config={business?.banner_config} />

      <div className="mx-auto max-w-[1280px] px-4 pt-4 md:hidden md:px-10 md:pt-6">
        <MobileSearch />
      </div>

      <CategoryChips categories={categories} />

      <section className="mx-auto max-w-[1280px] px-4 pb-12 md:px-10">
        <div className="mb-3 flex items-baseline justify-between px-1">
          <h2 className="font-grotesk text-[19px] font-semibold tracking-[-0.4px] md:text-[22px]">
            Para vos
          </h2>
          <Link
            href="/categoria"
            className="inline-flex items-center gap-1 text-[12px] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
          >
            Ver todo <Icon name="chevronRight" size={12} />
          </Link>
        </div>
        {products.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-10 text-center text-sm text-[var(--color-text-dim)]">
            Todavía no hay productos publicados.
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
