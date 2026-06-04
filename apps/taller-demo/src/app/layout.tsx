import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import Providers from "./providers";

const GA_ID = "G-0WTQZC2WS1";
const SITE_URL = "https://appjeezpro.store";
const SITE_NAME = "MaqJeez";
const BRAND = "Taller MAQJEEZ";
const PHONE = "+5491159000486";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MaqJeez — Repuestos para Moto-Implementos en Argentina",
    template: "%s | MaqJeez",
  },
  description:
    "Catálogo B2B con más de 2.000 repuestos para motosierras, desmalezadoras, hidrolavadoras y motovehículos. Precios corporativos con 3% OFF fijo. Envíos a todo el país desde Carlos Spegazzini, Buenos Aires.",
  applicationName: SITE_NAME,
  authors: [{ name: BRAND }],
  creator: BRAND,
  publisher: BRAND,
  generator: "Next.js",
  keywords: [
    "repuestos motosierra",
    "repuestos desmalezadora",
    "moto-implementos",
    "repuestos motovehiculos",
    "taller motos Buenos Aires",
    "MaqJeez",
    "Carlos Spegazzini",
    "AppJeezPro",
  ],
  category: "shopping",
  classification: "Repuestos y accesorios para moto-implementos",
  referrer: "strict-origin-when-cross-origin",
  formatDetection: { telephone: true, email: true, address: true },
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
    languages: { "es-AR": "/", "es": "/" },
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "MaqJeez — Repuestos para Moto-Implementos en Argentina",
    description:
      "Catálogo B2B con más de 2.000 repuestos. Precios corporativos con 3% OFF fijo. Envíos a todo el país desde Carlos Spegazzini, Buenos Aires.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "MaqJeez — Catálogo B2B de repuestos" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MaqJeez — Repuestos para Moto-Implementos",
    description: "Catálogo B2B con más de 2.000 repuestos. 3% OFF fijo. Envíos a todo el país.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  other: {
    "geo.region": "AR-B",
    "geo.placename": "Carlos Spegazzini, Buenos Aires",
    "geo.position": "-34.8838;-58.6361",
    "ICBM": "-34.8838, -58.6361",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f97316",
  colorScheme: "dark light",
};

// JSON-LD: Organization + WebSite + LocalBusiness/AutoPartsStore
const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: BRAND,
  alternateName: ["AppJeezPro", "MaqJeez"],
  url: SITE_URL,
  logo: `${SITE_URL}/icon.png`,
  email: "contacto@maqjeez.com.ar",
  telephone: PHONE,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Carlos Spegazzini",
    addressRegion: "Buenos Aires",
    addressCountry: "AR",
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: PHONE,
      contactType: "customer service",
      areaServed: "AR",
      availableLanguage: ["Spanish", "es-AR"],
    },
  ],
};

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  description: "Catálogo B2B de repuestos para moto-implementos.",
  inLanguage: "es-AR",
  publisher: { "@id": `${SITE_URL}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/catalogo?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

const localBusinessLd = {
  "@context": "https://schema.org",
  "@type": "AutoPartsStore",
  "@id": `${SITE_URL}/#localbusiness`,
  name: BRAND,
  image: `${SITE_URL}/opengraph-image`,
  url: SITE_URL,
  telephone: PHONE,
  priceRange: "$$",
  currenciesAccepted: "ARS",
  paymentAccepted: "Transferencia bancaria, MercadoPago, Efectivo, Tarjeta de crédito, Tarjeta de débito",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Carlos Spegazzini",
    addressRegion: "Buenos Aires",
    addressCountry: "AR",
  },
  geo: { "@type": "GeoCoordinates", latitude: -34.8838, longitude: -58.6361 },
  areaServed: { "@type": "Country", name: "Argentina" },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "09:00",
      closes: "13:00",
    },
  ],
  sameAs: [],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationLd, websiteLd, localBusinessLd]),
          }}
        />
      </head>
      <body className="min-h-dvh min-h-screen antialiased selection:bg-[#FF5722]/30">
        <Providers>{children}</Providers>
        {/* Google Analytics 4 con Consent Mode v2 */}
        <Script id="ga-consent" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              analytics_storage: 'granted',
              functionality_storage: 'granted',
              security_storage: 'granted',
              wait_for_update: 500
            });
          `}
        </Script>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
      </body>
    </html>
  );
}
