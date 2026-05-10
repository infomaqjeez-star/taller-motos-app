"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function ReferralTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      localStorage.setItem("ref_codigo", refCode);
      fetch(`/api/vendedor/public?codigo=${encodeURIComponent(refCode)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.vendedor) {
            localStorage.setItem("ref_nombre", data.vendedor.nombre);
            localStorage.setItem("ref_vendedor_id", data.vendedor.id);
            // Disparar evento para notificar al resto de la app
            window.dispatchEvent(new Event("ref-updated"));
          }
        })
        .catch(() => {});
    }
  }, [searchParams]);

  return null;
}
