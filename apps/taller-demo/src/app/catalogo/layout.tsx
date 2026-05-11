import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-montserrat",
});

export default function CatalogoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`min-h-dvh bg-[#020617] text-gray-100 ${montserrat.variable} font-sans`}>
      {children}
    </div>
  );
}
