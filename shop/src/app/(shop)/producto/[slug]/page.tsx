import { Container, SimpleGrid, Title, Text, Group, Badge, Stack, Box, Flex } from "@mantine/core"
import { notFound } from "next/navigation"
import type { Products } from "@/Api/useProducts"
import ImageGallery from "@/Components/ProductDetails/ImageGallery"
import ProductsCards from "@/Components/Home/sub-components/ProductsCards"
import BackButton from "@/Components/Common/BackButton"
import AddToCartButton from "@/Components/Cart/AddToCartButton"
import type { Metadata } from "next"
import CartWrapper from "@/Components/Cart/CartWrapper"
import { getBusinessInfo } from "@/Api/useBusiness"
import { extractIdFromSlug } from "@/utils/slugs"
import ProductDescription from "@/Components/Common/ProductDescription"

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const id = extractIdFromSlug(slug)
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"
  
  const res = await fetch(`${baseUrl}/products/public/${id}`, { next: { revalidate: 60 } })
  if (!res.ok) {
    return notFound()
  }
  const json = await res.json().catch(() => null)
  const product: Products | null = (json?.data?.product || json?.data || json || null) as Products | null

  if (!product) {
    return notFound()
  }

  const priceValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  
  const shippingDetails = {
    "@type": "OfferShippingDetails",
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "AR" },
    shippingRate: { "@type": "MonetaryAmount", value: "0", currency: "ARS" },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 2 },
      transitTime: { "@type": "QuantitativeValue", minValue: 2, maxValue: 5 }
    }
  }
  const merchantReturnPolicy = {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "AR",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 7,
    returnFees: "https://schema.org/FreeReturn",
    returnMethod: ["https://schema.org/ReturnInStore", "https://schema.org/ReturnByMail"]
  }

  let similar: Products[] = []
  try {
    const categoryId = product?.category?.id
    if (categoryId) {
      const sRes = await fetch(`${baseUrl}/products/public?categoryId=${encodeURIComponent(categoryId)}&limit=10`, { next: { revalidate: 120 } })
      const sJson = await sRes.json().catch(() => null)
      const list: Products[] = Array.isArray(sJson?.data?.products) ? (sJson.data.products as Products[]) : []
      similar = list.filter((p: Products) => p.id !== product.id)
    }
  } catch { }

  const fullSlug = slug;

  return (
    <Container size="lg" py="md">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.title,
            description: product.description,
            image: Array.isArray(product.images) && product.images.length > 0 ? product.images : [`${siteUrl}/logo.png`],
            category: product.category?.title || undefined,
            offers: typeof product.price === "number" ? {
              "@type": "Offer",
              price: product.price,
              priceCurrency: "ARS",
              availability: typeof product.stock === "number" && product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              priceValidUntil,
              shippingDetails,
              hasMerchantReturnPolicy: merchantReturnPolicy,
              url: `${siteUrl}/producto/${fullSlug}`
            } : undefined
          })
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Inicio", item: `${siteUrl}/` },
              product.category?.id ? { "@type": "ListItem", position: 2, name: product.category?.title || "Categoría", item: `${siteUrl}/?categoryId=${encodeURIComponent(product.category.id)}` } : undefined,
              { "@type": "ListItem", position: product.category?.id ? 3 : 2, name: product.title, item: `${siteUrl}/producto/${fullSlug}` }
            ].filter(Boolean)
          })
        }}
      />
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Box>
          <ImageGallery images={product.images || []} title={product.title} />
        </Box>
        <Box>
          <Stack gap="sm">
            <Group gap="sm">
              <Title order={1} style={{ textTransform: "capitalize", fontSize: "2rem" }}>{product.title}</Title>
              <Badge >{product.category?.title || "Sin categoría"}</Badge>
            </Group>
            <Text fw={600} size="lg">
              {typeof product.price === "number" ? new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(product.price) : "Precio no disponible"}
            </Text>
            <Text c="dimmed">{typeof product.stock === "number" ? `Stock: ${product.stock}` : "Stock no disponible"}</Text>
            {product.description && (
              <Box>
                <Text fw={600} mb="xs">Descripción</Text>
                <ProductDescription description={product.description} />
              </Box>
            )}
            <Group gap="sm">
              <AddToCartButton productId={product.id} options={product.options} />
              <BackButton />
            </Group>
          </Stack>
        </Box>
      </SimpleGrid>



      {similar.length > 0 && (
        <Box mt="xl">
          <Title order={3} mb="sm">Descubre productos similares</Title>
          <Text c="dimmed" mb="md">Basado en la categoría seleccionada</Text>
          <Flex wrap="wrap" gap={16} justify="flex-start">
            {similar.map((p) => (
              <ProductsCards key={p.id} product={p} />
            ))}
          </Flex>
        </Box>
      )}
      <CartWrapper />
    </Container>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const id = extractIdFromSlug(slug)
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"
  const urlBase = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"
  
  try {
    const [res, business] = await Promise.all([
      fetch(`${baseUrl}/products/public/${id}`, { next: { revalidate: 300 } }),
      getBusinessInfo()
    ]);

    const businessName = business?.name || "Tienda Online";

    if (!res.ok) {
      return { title: "Producto", description: "Detalle de producto" }
    }
    const data = await res.json().catch(() => null)
    const product: Products | null = (data?.data?.product || data?.data || data || null) as Products | null
    if (!product) {
      return { title: "Producto", description: "Detalle de producto" }
    }
    
    const title = `${product.title} ${product.category?.title ? `| ${product.category.title}` : ''} | ${businessName}`
    
    let description = product.description || `Compra ${product.title} en ${businessName}. Envíos a todo el país.`;
    if (description.length > 160) {
        description = description.substring(0, 157) + '...';
    } else if (description.length < 50) {
        description = `${description} Aprovecha las mejores ofertas en ${product.category?.title || 'nuestra tienda'}. Calidad garantizada.`;
    }

    const canonical = `${urlBase}/producto/${slug}`
    
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        url: canonical,
        type: "website",
        images: [{ url: (Array.isArray(product.images) && product.images[0]) ? product.images[0] : `${urlBase}/logo.png` }]
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [(Array.isArray(product.images) && product.images[0]) ? product.images[0] : `${urlBase}/logo.png`]
      },
      robots: { index: true, follow: true }
    }
  } catch {
    return { title: "Producto", description: "Detalle de producto" }
  }
}
