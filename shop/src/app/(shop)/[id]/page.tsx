import { redirect, notFound } from "next/navigation"
import { createProductSlug } from "@/utils/slugs"
import type { Products } from "@/Api/useProducts"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"
  
  if (!id) return notFound()

  try {
    const res = await fetch(`${baseUrl}/products/public/${id}`, { next: { revalidate: 60 } })
    if (!res.ok) return notFound()
    
    const json = await res.json().catch(() => null)
    const product: Products | null = (json?.data?.product || json?.data || json || null) as Products | null
    
    if (product) {
      const newSlug = createProductSlug(product.title, product.id)
      redirect(`/producto/${newSlug}`)
    }
  } catch {}
  
  return notFound()
}
