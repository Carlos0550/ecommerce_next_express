import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { BusinessProvider, BUSINESS_NAME_FALLBACK } from "@/components/business-provider";
import { fetchBusiness } from "@/lib/shop/server";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const business = await fetchBusiness();
  const name = business?.name?.trim() || BUSINESS_NAME_FALLBACK;
  const description =
    business?.description?.trim() ||
    "Productos seleccionados con identidad propia.";
  const ogImage = business?.hero_image?.trim() || business?.business_image?.trim();
  const iconSrc = business?.business_image?.trim();
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    ),
    title: {
      default: name,
      template: `%s · ${name}`,
    },
    description,
    openGraph: {
      type: "website",
      locale: "es_AR",
      siteName: name,
      title: name,
      description,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    icons: iconSrc ? { icon: iconSrc } : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const business = await fetchBusiness();
  const palette = business?.active_palette ?? "kuromi";
  return (
    <html
      lang="es"
      data-palette={palette}
      className={`${inter.variable} ${grotesk.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full antialiased">
        <Providers serverPalette={palette}>
          <BusinessProvider value={business}>{children}</BusinessProvider>
        </Providers>
      </body>
    </html>
  );
}
