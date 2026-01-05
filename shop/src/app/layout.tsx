import "./globals.css";
import AppProvider from "../providers/AppProvider";
import SiteLayout from "../Components/Layout/SiteLayout";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getBusinessInfo } from "@/Api/useBusiness";
import { headers } from "next/headers";

const inter = Inter({ subsets: ["latin"], variable: "--font-stack" });

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug');
  const host = headersList.get('host');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
  
  
  console.log('[Layout generateMetadata] host:', host, '| x-tenant-slug:', tenantSlug);
  
  
  let businessName = "Pragmatienda";
  let description = "Pragmatienda";
  let businessImage = "";
  let favicon = "";
  
  if (tenantSlug) {
    const business = await getBusinessInfo(tenantSlug);
    if (business) {
      businessName = business.name || "Pragmatienda";
      description = business.description || `Tienda online de ${businessName}`;
      businessImage = business.business_image || "";
      favicon = business.favicon || "";
    }
  }
  
  return {
    title: {
      template: `%s | ${businessName}`,
      default: businessName,
    },
    description: description,
    icons: { icon: favicon },
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: siteUrl,
    },
    openGraph: {
      title: businessName,
      description: description,
      url: siteUrl,
      type: "website",
      images: [{ url: businessImage }],
      siteName: businessName,
    },
    twitter: {
      card: "summary_large_image",
      title: businessName,
      description: description,
      images: [businessImage],
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug');
  
  
  let business = null;
  let businessName = "Pragmatienda";
  let businessImage = "";
  
  if (tenantSlug) {
    business = await getBusinessInfo(tenantSlug);
    businessName = business?.name || "Pragmatienda";
    businessImage = business?.business_image || "";
  }
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
  
  return (
    <html lang="es" className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ffffff" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: businessName,
              url: siteUrl,
              logo: "",
              image: businessImage
            })
          }}
        />
      </head>
      <body>
          <AppProvider initialTenantSlug={tenantSlug || undefined}>
              <SiteLayout>{children}</SiteLayout>
          </AppProvider>
      </body>
    </html>
  );
}
