import type { Metadata } from 'next'
import { getBusinessInfo } from '@/Api/useBusiness'

export async function generateMetadata(): Promise<Metadata> {
  const business = await getBusinessInfo();
  const businessName = business?.name || "Tienda Online";
  return {
    title: `Mis órdenes | ${businessName}`,
    description: `Consulta el historial y detalles de tus órdenes en ${businessName}.`,
    robots: { index: false, follow: false },
    alternates: { canonical: '/orders' },
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}

