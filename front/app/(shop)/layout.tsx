import { Suspense } from "react";
import { ShopHeader } from "@/components/shop/shop-header";
import { ShopBottomBar } from "@/components/shop/shop-bottom-bar";
import { ShopFooter } from "@/components/shop/shop-footer";
import { MundialFloatingDoodles } from "@/components/shop/mundial-floating-doodles";
import { fetchPublicCategories } from "@/lib/shop/server";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const categories = await fetchPublicCategories();

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <MundialFloatingDoodles />
      <Suspense fallback={null}>
        <ShopHeader categories={categories} />
      </Suspense>
      <main className="pb-24 md:pb-0">{children}</main>
      <ShopFooter />
      <ShopBottomBar />
    </div>
  );
}
