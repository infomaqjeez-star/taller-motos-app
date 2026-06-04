import type { Metadata } from "next";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-montserrat",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Catálogo B2B de Repuestos",
  description:
    "Catálogo B2B con más de 2.000 repuestos para motosierras, desmalezadoras e implementos. Precios corporativos con 3% OFF fijo. Envíos a todo el país.",
  alternates: { canonical: "/catalogo" },
  openGraph: {
    title: "Catálogo B2B de Repuestos | MaqJeez",
    description:
      "Más de 2.000 repuestos para moto-implementos con precios corporativos y 3% OFF fijo.",
    url: "https://appjeezpro.store/catalogo",
    type: "website",
  },
};

export default function CatalogoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`min-h-dvh bg-[#020617] text-gray-100 ${montserrat.variable} font-sans`}>
      {children}
    </div>
  );
}
