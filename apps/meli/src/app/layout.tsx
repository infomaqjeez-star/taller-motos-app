import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./animations.css";
import Providers from "./providers";
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";
import { Toaster } from "@/components/ui/Toaster";
import QuestionAlertGlobal from "@/components/QuestionAlertGlobal";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Taller MAQJEEZ",
  description: "Sistema de gestion para taller de Moto-Implementos y Motovehiculos",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f97316",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[#020203] text-zinc-200 font-sans antialiased selection:bg-amber-400/30">
        <Providers>
          <ReactQueryProvider>
            {children}
            <Toaster />
          </ReactQueryProvider>
        </Providers>
        <QuestionAlertGlobal />
      </body>
    </html>
  );
}
