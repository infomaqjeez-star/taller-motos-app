import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "MaqJeez - Catálogo B2B de Repuestos para Moto-Implementos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "80px",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 40 }}>
          <div
            style={{
              width: 80,
              height: 80,
              background: "#f97316",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0a0a0a",
              fontSize: 44,
              fontWeight: 900,
              borderRadius: 16,
            }}
          >
            MJ
          </div>
          <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1 }}>MaqJeez</div>
        </div>

        <div
          style={{
            fontSize: 76,
            fontWeight: 900,
            letterSpacing: -2,
            lineHeight: 1.05,
            marginTop: 20,
            maxWidth: 1000,
          }}
        >
          Repuestos para Moto-Implementos
        </div>

        <div
          style={{
            fontSize: 36,
            fontWeight: 500,
            color: "#a3a3a3",
            marginTop: 32,
            lineHeight: 1.3,
            maxWidth: 950,
          }}
        >
          Catálogo B2B con más de 2.000 productos. 3% OFF fijo. Envíos a todo el país.
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginTop: "auto",
            fontSize: 22,
            color: "#737373",
          }}
        >
          <span style={{ color: "#f97316", fontWeight: 700 }}>appjeezpro.store</span>
          <span>·</span>
          <span>Carlos Spegazzini, Buenos Aires</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
