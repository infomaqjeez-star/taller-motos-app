import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#f97316",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#0a0a0a",
          fontSize: 18,
          fontWeight: 900,
          fontFamily: "system-ui, sans-serif",
          borderRadius: 6,
        }}
      >
        MJ
      </div>
    ),
    { ...size }
  );
}
