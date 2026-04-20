"use client";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { MeliAccountsProvider } from "@/components/auth/MeliAccountsProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <AuthProvider>
        <MeliAccountsProvider>
          {children}
        </MeliAccountsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
