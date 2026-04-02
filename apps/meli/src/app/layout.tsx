import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AppJeez - MercadoLibre",
  description: "Dashboard MercadoLibre - Etiquetas, Mensajes y Flex",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#121212",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen" style={{ background: "#121212", color: "#FFFFFF" }}>
        {children}
      </body>
    </html>
  );
}
