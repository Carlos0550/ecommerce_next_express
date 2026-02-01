import type { Metadata } from 'next'
import { getBusinessInfo } from '@/Api/useBusiness'

export async function generateMetadata(): Promise<Metadata> {
  const business = await getBusinessInfo();
  const businessName = business?.name || "Tienda Online";
  return {
    title: `Mi cuenta | ${businessName}`,
    description: `Gestiona tu perfil y datos de envío en ${businessName}.`,
    robots: { index: false, follow: false },
    alternates: { canonical: '/account' },
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}

