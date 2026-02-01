import type { Metadata } from 'next'
import { getBusinessInfo } from '@/Api/useBusiness'

export async function generateMetadata(): Promise<Metadata> {
  const business = await getBusinessInfo();
  const businessName = business?.name || "Tienda Online";
  return {
    title: `Preguntas frecuentes | ${businessName}`,
    description: `Resuelve dudas sobre compras, envíos y pagos en ${businessName}.`,
    robots: { index: true, follow: true },
    alternates: { canonical: '/faq' },
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}

