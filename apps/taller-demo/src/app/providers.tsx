"use client";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { CartProvider } from "@/components/catalogo/CartContext";
import { VendedorAuthProvider } from "@/components/vendedor/VendedorAuthContext";
import { ClienteAuthProvider } from "@/components/cliente/ClienteAuthContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <AuthProvider>
        <VendedorAuthProvider>
          <ClienteAuthProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </ClienteAuthProvider>
        </VendedorAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
