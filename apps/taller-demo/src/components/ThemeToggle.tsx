"use client";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="relative flex items-center justify-center gap-2 rounded-xl p-2 sm:px-3 sm:py-2.5 font-semibold text-sm
        text-[#1E3A8A]/85 transition-colors hover:bg-[#1E3A8A]/12 hover:text-[#1E3A8A] active:scale-95"
      title="Cambiar tema"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-[#B45309]" aria-hidden />
      ) : (
        <Moon className="h-5 w-5 text-[#1E3A8A]" aria-hidden />
      )}
      <span className="sr-only">Cambiar tema</span>
    </button>
  );
}
