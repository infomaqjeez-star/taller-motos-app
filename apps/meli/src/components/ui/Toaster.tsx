"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        style: {
          background: "#1F1F1F",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#fff",
        },
        className: "my-toast",
      }}
      richColors
      closeButton
      duration={4000}
    />
  );
}
