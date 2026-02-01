import "./globals.css";
import AppProvider from "../providers/AppProvider";
import SiteLayout from "../Components/Layout/SiteLayout";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getBusinessInfo } from "@/Api/useBusiness";

const inter = Inter({ subsets: ["latin"], variable: "--font-stack" });

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const business = await getBusinessInfo();
  const businessName = business?.name || "Tienda Online";
  const description = business?.description || `Tienda online de ${businessName}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
  const businessImage = business?.business_image || "/image_fallback.webp";
  const favicon = business?.favicon || "/image_fallback.webp";
  
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
  const business = await getBusinessInfo();
  const businessName = business?.name || "Tienda Online";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
  const businessImage = business?.business_image || "/image_fallback.webp";
  
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
              logo: business?.favicon || "/image_fallback.webp",
              image: businessImage
            })
          }}
        />
      </head>
      <body>
          <AppProvider>
              {children}
          </AppProvider>
      </body>
    </html>
  );
}
