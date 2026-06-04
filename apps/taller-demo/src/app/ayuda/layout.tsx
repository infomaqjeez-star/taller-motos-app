import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Centro de Ayuda y Tutoriales",
  description:
    "Guías paso a paso para clientes, vendedores y el equipo del taller. 33 tutoriales sobre el catálogo, pedidos, comisiones, inventario y más.",
  alternates: { canonical: "/ayuda" },
  openGraph: {
    title: "Centro de Ayuda | MaqJeez",
    description:
      "33 tutoriales paso a paso para usar el catálogo, registrarte, hacer pedidos, gestionar comisiones y operar el taller.",
    url: "https://appjeezpro.store/ayuda",
    type: "article",
  },
};

// JSON-LD FAQPage para las 8 FAQ del centro de ayuda
const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "¿Qué formas de pago aceptan?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Transferencia bancaria, efectivo en local, MercadoPago y tarjeta de crédito/débito según el caso. Para mayoristas o cuenta corriente, consultar con el área comercial.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cuánto tarda la entrega?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "CABA y GBA: 24 a 72 horas hábiles tras confirmación de pago. Interior del país: 3 a 7 días hábiles según localidad y transporte.",
      },
    },
    {
      "@type": "Question",
      name: "¿Hacen envíos al interior?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí, a todo el país por Correo Argentino, Andreani, Mercado Envíos y transportes regionales. Para envíos de más de 30kg coordinamos transporte privado.",
      },
    },
    {
      "@type": "Question",
      name: "¿Los productos tienen garantía?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí. Garantía de fábrica vigente en todos los productos nuevos (3 a 12 meses según marca). Para usados o reparados, 30 días por defectos de funcionamiento.",
      },
    },
    {
      "@type": "Question",
      name: "¿Puedo cambiar o devolver un producto?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí, hasta 10 días corridos en producto sin uso, con su empaque original. El costo de envío del retorno corre por cuenta del comprador, salvo error nuestro.",
      },
    },
    {
      "@type": "Question",
      name: "¿Los precios incluyen IVA?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí. Todos los precios del catálogo son finales con IVA incluido para consumidor final. Si necesitás factura A, el precio puede variar según condición fiscal.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cómo contacto soporte?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "WhatsApp +54 9 11 5900-0486, email o formulario web. Horario: lunes a viernes de 9 a 18hs, sábados de 9 a 13hs.",
      },
    },
    {
      "@type": "Question",
      name: "Tengo problemas con mi cuenta, ¿qué hago?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Probá recuperar contraseña desde la pantalla de login. Si no recibís el mail de confirmación, revisá la carpeta de spam. Si seguís con problemas, contactanos por WhatsApp.",
      },
    },
  ],
};

export default function AyudaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      {children}
    </>
  );
}
