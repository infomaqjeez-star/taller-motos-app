"use client";

import { ShoppingCart } from "lucide-react";
import { useCart } from "./CartContext";

export default function CartButton() {
  const { setIsOpen, itemCount } = useCart();

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF5722] text-white shadow-lg shadow-[#FF5722]/30 hover:bg-[#E64A19] transition-transform hover:scale-105 active:scale-95"
    >
      <ShoppingCart className="h-6 w-6" />
      {itemCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#39FF14] text-xs font-bold text-black">
          {itemCount}
        </span>
      )}
    </button>
  );
}
