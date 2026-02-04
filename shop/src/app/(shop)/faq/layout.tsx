import type { Metadata } from 'next'
import { configService } from '@/services/config.service'
export async function generateMetadata(): Promise<Metadata> {
  const business = await configService.getPublicBusinessInfo();
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
