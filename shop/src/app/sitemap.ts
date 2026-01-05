import { MetadataRoute } from 'next'
import { createProductSlug } from '@/utils/slugs'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

  const now = new Date()
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 }
  ]

  
  let productRoutes: MetadataRoute.Sitemap = []
  try {
    let page = 1
    let hasMore = true
    const limit = 100
    
    while (hasMore) {
      const res = await fetch(`${apiUrl}/products/public?limit=${limit}&page=${page}`, { 
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(5000) 
      })
      
      if (!res.ok) break
      
      const json = await res.json().catch(() => null)
      const products = Array.isArray(json?.data?.products) ? json.data.products : []
      
      if (products.length === 0) break
      
      productRoutes = productRoutes.concat(
        products.map((p: { id: string; title: string; updatedAt?: string }) => ({
          url: `${siteUrl}/producto/${createProductSlug(p.title, p.id)}`,
          lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
          changeFrequency: 'weekly' as const,
          priority: 0.8
        }))
      )
      
      
      const pagination = json?.data?.pagination
      hasMore = pagination?.hasNextPage === true || (pagination?.page || 0) < (pagination?.totalPages || 1)
      page++
      
      
      if (productRoutes.length >= 1000) break
    }
  } catch {
    
    try {
      const res = await fetch(`${apiUrl}/products/public?limit=100`, { 
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(5000)
      })
      const json = await res.json().catch(() => null)
      const products = Array.isArray(json?.data?.products) ? json.data.products : []
      productRoutes = products.map((p: { id: string; title: string; updatedAt?: string }) => ({
        url: `${siteUrl}/producto/${createProductSlug(p.title, p.id)}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
        changeFrequency: 'weekly' as const,
        priority: 0.8
      }))
    } catch {
      productRoutes = []
    }
  }

  
  let categoryRoutes: MetadataRoute.Sitemap = []
  try {
    const res = await fetch(`${apiUrl}/products/public/categories`, { 
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000)
    })
    const json = await res.json().catch(() => null)
    const categories = Array.isArray(json?.data) ? json.data : []
    categoryRoutes = categories.map((c: { id: string; title: string }) => ({
      url: `${siteUrl}/?categoryId=${c.id}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7
    }))
  } catch {
    categoryRoutes = []
  }

  return [...staticRoutes, ...categoryRoutes, ...productRoutes]
}
