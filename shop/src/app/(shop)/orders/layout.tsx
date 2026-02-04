import type { Metadata } from 'next'
import { configService } from '@/services/config.service'
export async function generateMetadata(): Promise<Metadata> {
  const business = await configService.getPublicBusinessInfo();
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
