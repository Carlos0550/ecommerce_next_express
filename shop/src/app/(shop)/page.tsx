import type { Metadata } from "next"
import HomeComponent from "@/Components/Home/Home"
import { ProductsResponse, Products } from "@/Api/useProducts"
import { CategoriesResponse } from "@/Api/useCategories"
import { getBusinessInfo } from "@/Api/useBusiness"
import { createProductSlug } from "@/utils/slugs"

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"
  const business = await getBusinessInfo();
  const businessName = business?.name || "Tienda Online";
  const businessImage = business?.business_image || `${siteUrl}/image_fallback.webp`;
  
  // Prepare Query Params for Products
  const qp = new URLSearchParams()
  qp.append("limit", "30") // Default limit in Home.tsx
  if (sp?.title && sp.title.trim()) qp.append("title", sp.title.trim())
  if (sp?.categoryId && sp.categoryId.trim()) qp.append("categoryId", sp.categoryId.trim())
  
  // Fetch Products
  let productsData: ProductsResponse | undefined = undefined
  let products: Products[] = []
  try {
    const res = await fetch(`${baseUrl}/products/public?${qp.toString()}`, { next: { revalidate: 0 } })
    if (res.ok) {
        productsData = await res.json()
        products = productsData?.data?.products || []
    }
  } catch {}

  // Fetch Categories
  let categoriesData: CategoriesResponse | undefined = undefined
  try {
    const resCat = await fetch(`${baseUrl}/products/public/categories`, { next: { revalidate: 0 } })
    if (resCat.ok) {
        categoriesData = await resCat.json()
    }
  } catch {}

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: Array.isArray(products) ? products.map((p, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${siteUrl}/producto/${createProductSlug(p.title, p.id)}`,
      name: p.title,
      image: Array.isArray(p.images) ? p.images[0] : undefined
    })) : []
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: businessName,
            url: siteUrl,
            image: businessImage,
          })
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Productos",
            url: siteUrl,
            primaryImageOfPage: businessImage,
          })
        }}
      />
      <HomeComponent initialProducts={productsData} initialCategories={categoriesData} business={business} />
    </>
  )
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string>> }): Promise<Metadata> {
  const sp = await searchParams
  const titleQ = sp?.title?.trim()
  const catQ = sp?.categoryId?.trim()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"
  
  const business = await getBusinessInfo();
  const businessName = business?.name || "Tienda Online";
  const bizDescription = business?.description || ''
  const businessImage = business?.business_image || `${siteUrl}/opengraph-image`;
  
  const type = business?.type;
  const city = business?.city;
  
  let baseTitle = businessName;
  // Si tenemos tipo y ciudad, construimos un título SEO fuerte
  if (type && city) {
    baseTitle = `${type} en ${city}`;
  } else if (type) {
    baseTitle = type;
  }

  const parts = []
  if (titleQ) parts.push(`Buscar: ${titleQ}`)
  if (catQ) parts.push(`Categoría: ${catQ}`)
  
  // Si no hay búsqueda, usamos el título base como principal
  // Si hay búsqueda, lo agregamos al final o dejamos que el layout lo maneje
  if (parts.length === 0) {
      parts.push(baseTitle);
  } else {
      // Si hay busqueda, dejamos solo la busqueda y el layout agregará el nombre del negocio
      // O podemos forzarlo:
      // parts.push(businessName) 
      // Dejamos que el template del layout haga su trabajo: "%s | BusinessName"
  }
  
  const fullTitle = parts.join(" · ")

  const shouldIndex = !titleQ && !catQ;

  return {
    title: fullTitle,
    description: titleQ ? `Resultados para "${titleQ}" en ${businessName}` : bizDescription,
    robots: { index: shouldIndex, follow: true },
    alternates: { canonical: siteUrl },
    openGraph: {
      title: fullTitle,
      description: titleQ ? `Resultados para "${titleQ}" en ${businessName}` : bizDescription,
      url: siteUrl,
      type: "website",
      images: [
        { url: businessImage },
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: titleQ ? `Resultados para "${titleQ}" en ${businessName}` : bizDescription,
      images: [businessImage]
    }
  }
}
