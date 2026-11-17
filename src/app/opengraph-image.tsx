import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt =
  "Cogent Marketing Shield — Nigerian Regulatory Compliance Operating System";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#09090B",
          backgroundImage:
            "radial-gradient(circle at 85% 20%, rgba(42, 75, 255, 0.28), transparent 55%)",
          padding: "64px 72px",
          color: "#FFFFFF",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "#2A4BFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "20px",
              }}
            >
              C
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "22px", fontWeight: 700 }}>Cogent</span>
              <span
                style={{
                  fontSize: "12px",
                  letterSpacing: "0.14em",
                  color: "#A1A1AA",
                  textTransform: "uppercase",
                }}
              >
                Marketing Shield · stem-cogent.com
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              fontSize: "14px",
              color: "#D4D4D8",
            }}
          >
            <span>CBN · FCCPC · ARCON · NDPC · SEC</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: "920px" }}>
          <span
            style={{
              fontSize: "15px",
              letterSpacing: "0.12em",
              color: "#6B82FF",
              textTransform: "uppercase",
              marginBottom: "18px",
            }}
          >
            Supervisory Compliance Operating System
          </span>
          <div
            style={{
              fontSize: "58px",
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
            }}
          >
            Regulatory certainty for every campaign before it ships.
          </div>
          <div
            style={{
              marginTop: "24px",
              fontSize: "24px",
              lineHeight: 1.45,
              color: "#A1A1AA",
            }}
          >
            141 verified statutory PDFs · Deterministic APR &amp; Lock 1–3 audits · 2-year SHA-256 dossiers
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #27272A",
            paddingTop: "24px",
            fontSize: "16px",
            color: "#A1A1AA",
          }}
        >
          <span>Built for Nigerian Digital Lenders, MFBs, Banks, PSBs &amp; WealthTech</span>
          <span style={{ color: "#10B981", fontWeight: 600 }}>
            Pre-Flight Gate Enforced
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
