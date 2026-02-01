import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }


export default async function OG({ searchParams }: { searchParams?: { title?: string; categoryId?: string } }) {
  const titleQ = searchParams?.title?.trim() || ''
  const catQ = searchParams?.categoryId?.trim() || ''
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'
  
  // Fetch business data to get the dynamic image
  let bizImage = ''
  let bizDescription = ''
  let bizName = 'Tienda Online'
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/business/public`, { next: { revalidate: 60 } })
    if (res.ok) {
        const data = await res.json()
        bizImage = data.business_image || ''
        bizDescription = data.description || ''
        bizName = data.name || bizName
    }
  } catch {}

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
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 16,
              backgroundImage: `url(${siteUrl}/logo.png)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
          <div style={{ fontSize: 56, fontWeight: 800, color: '#111' }}>{bizName}</div>
        </div>
        <div style={{ marginTop: 24, fontSize: 32, color: '#333' }}>{bizDescription}</div>
        {titleQ && (
          <div style={{ marginTop: 12, fontSize: 28, color: '#555' }}>Buscar: {titleQ}</div>
        )}
        {catQ && (
          <div style={{ marginTop: 8, fontSize: 24, color: '#777' }}>Categoría seleccionada</div>
        )}
        <div style={{ position: 'absolute', bottom: 32, right: 48, fontSize: 24, color: '#333' }}>{new URL(siteUrl).host}</div>
      </div>
    ),
    size
  )
}
