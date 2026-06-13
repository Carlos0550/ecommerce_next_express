import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { BusinessProvider } from "@/components/business-provider";
import { BUSINESS_NAME_FALLBACK } from "@/lib/shop/constants";
import { fetchBusiness } from "@/lib/shop/server";
import { storageUrl } from "@/lib/api";
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
  const heroRaw = business?.hero_image?.trim() || business?.business_image?.trim();
  const ogImage = heroRaw ? storageUrl(heroRaw) : undefined;
  const iconRaw = business?.business_image?.trim();
  const iconSrc = iconRaw ? storageUrl(iconRaw) : undefined;
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

  // Script inline que se ejecuta SÍNCRONAMENTE antes del primer paint.
  // Resuelve la paleta con prioridad:
  //   1. localStorage (solo si es un override explícito ≠ "kuromi")
  //   2. SSR data-palette (lo que pintó el server)
  //   3. "kuromi" (fallback)
  //
  // ¿Por qué ignorar "kuromi" en localStorage? Porque "kuromi" es el
  // default histórico y muchos navegadores pueden tener esa entrada
  // persistida. Si la respetáramos, cualquier visitante que tocó el
  // selector alguna vez y volvió a "kuromi" quedaría "anclado" a
  // kuromi aunque el admin cambie la paleta del negocio. Solo
  // tratamos como override los valores distintos del default.
  const paletteBootstrap = `(function(){try{var k="cinnamon-palette",d=document.documentElement;var v=null;try{var raw=localStorage.getItem(k);if(raw){var p=JSON.parse(raw);if(p&&p.state&&p.state.palette)v=p.state.palette;}}catch(e){}var valid=["kuromi","mono","blush","sage","ocean","sunset","midnight","argentina"];if(valid.indexOf(v)===-1||v==="kuromi")v=null;var current=d.getAttribute("data-palette");if(!current||valid.indexOf(current)===-1)current="kuromi";d.setAttribute("data-palette",v||current);}catch(e){}})();`;

  return (
    <html
      lang="es"
      data-palette={palette}
      className={`${inter.variable} ${grotesk.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: paletteBootstrap }} />
      </head>
      <body className="min-h-full antialiased">
        <Providers serverPalette={palette}>
          <BusinessProvider value={business}>{children}</BusinessProvider>
        </Providers>
      </body>
    </html>
  );
}
