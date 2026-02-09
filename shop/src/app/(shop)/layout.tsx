import { Suspense } from "react";
import SiteLayout from "@/Components/Layout/SiteLayout";
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <SiteLayout>{children}</SiteLayout>
    </Suspense>
  );
}
