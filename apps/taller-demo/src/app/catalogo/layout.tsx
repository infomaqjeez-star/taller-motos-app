import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-montserrat",
  display: "swap",
  preload: true,
});

export default function CatalogoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`min-h-dvh bg-[#020617] text-gray-100 ${montserrat.variable} font-sans`}>
      {children}
    </div>
  );
}
