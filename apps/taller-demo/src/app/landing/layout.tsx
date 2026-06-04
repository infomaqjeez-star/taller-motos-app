import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Software de Gestión para Talleres de Motovehículos",
  description:
    "Ecosistema MaqJeez para talleres mecánicos: gestión de ventas, inventario, agenda, integración con Mercado Libre y catálogo B2B de repuestos. Hecho en Argentina.",
  alternates: { canonical: "/landing" },
  openGraph: {
    title: "MaqJeez — Software para Talleres de Motovehículos",
    description:
      "Gestión integral del taller: ventas, inventario, agenda, ML sync. Catálogo B2B con 2.000+ repuestos.",
    url: "https://appjeezpro.store/landing",
    type: "website",
  },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
