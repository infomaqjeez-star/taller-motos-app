"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error capturado:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212] text-white p-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold mb-4">Algo salió mal</h2>
        <p className="text-gray-400 mb-6">
          {error.message || "Ha ocurrido un error inesperado. Por favor, intenta nuevamente."}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-[#FFE600] text-[#003087] rounded-xl font-bold hover:bg-[#ffd700] transition"
        >
          Intentar nuevamente
        </button>
      </div>
    </div>
  );
}
