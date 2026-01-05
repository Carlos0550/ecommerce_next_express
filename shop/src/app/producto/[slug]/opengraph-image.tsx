import { ImageResponse } from 'next/og'
import { extractIdFromSlug } from '@/utils/slugs'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'
export const alt = 'Producto | Tienda Online'

export default async function OG({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const id = extractIdFromSlug(slug)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'
  
  
  const { headers } = await import('next/headers');
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug');
  
  
  let bizImage = ''
  let bizFavicon = ''
  let bizName = 'Tienda Online'
  
  if (tenantSlug) {
    try {
      const bizRes = await fetch(`${apiUrl}/business/public`, { 
        next: { revalidate: 60 },
        headers: { 'x-tenant-slug': tenantSlug }
      })
      if (bizRes.ok) {
        const bizData = await bizRes.json()
        bizImage = bizData.business_image || ''
        bizFavicon = bizData.favicon || ''
        bizName = bizData.name || bizName
      }
    } catch {}
  }
  
  let product: { title?: string; category?: { title?: string }; price?: number; images?: string[] } = {}
  try {
    const fetchHeaders: Record<string, string> = {}
    if (tenantSlug) fetchHeaders['x-tenant-slug'] = tenantSlug
    const res = await fetch(`${apiUrl}/products/public/${id}`, { 
      next: { revalidate: 600 },
      headers: fetchHeaders
    })
    const json = await res.json().catch(() => null)
    product = json?.data?.product || json?.data || json || {}
  } catch {}
  const title = product?.title || 'Producto'
  const cat = product?.category?.title || 'Categoría'
  const price = typeof product?.price === 'number' ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(product.price as number) : ''
  const productImage = Array.isArray(product?.images) && product.images.length > 0 ? product.images[0] : ''

  return new ImageResponse(
    (
      <div
        style={{
          width: size.width,
          height: size.height,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: 64,
          background: 'linear-gradient(135deg, #ffffff 0%, #ffe6f1 60%, #ffc6de 100%)',
        }}
      >
        {bizImage && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${bizImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.25
            }}
          />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {bizFavicon && (
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 16,
                backgroundImage: `url(${bizFavicon})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
          )}
          <div style={{ fontSize: 48, fontWeight: 800, color: '#111' }}>{bizName}</div>
        </div>
        <div style={{ marginTop: 24, fontSize: 56, fontWeight: 700, color: '#111' }}>{title}</div>
        <div style={{ marginTop: 8, fontSize: 28, color: '#444' }}>{cat}</div>
        {price && <div style={{ marginTop: 8, fontSize: 32, fontWeight: 600, color: '#0a7' }}>{price}</div>}
        {productImage && (
          <div
            style={{
              position: 'absolute',
              right: 48,
              top: 48,
              width: 520,
              height: 520,
              backgroundImage: `url(${productImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: 24,
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
            }}
          />
        )}
        <div style={{ position: 'absolute', bottom: 32, right: 48, fontSize: 24, color: '#333' }}>{new URL(siteUrl).host}</div>
      </div>
    ),
    size
  )
}
