import { redirect, notFound } from "next/navigation"
import { createProductSlug } from "@/utils/slugs"
import { PublicProduct } from "@/stores/useConfigStore"
export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"
  if (!id) return notFound()
  try {
    const res = await fetch(`${baseUrl}/products/public/${id}`, { next: { revalidate: 60 } })
    if (!res.ok) return notFound()
    const json = await res.json().catch(() => null)
    const product: PublicProduct | null = (json?.data?.product || json?.data || json || null) as PublicProduct | null
    if (product) {
      const newSlug = createProductSlug(product.title, product.id)
      redirect(`/producto/${newSlug}`)
    }
  } catch {}
  return notFound()
}
