// Este archivo fuerza a Next.js a generar rutas dinÃ¡micas correctamente
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
