import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt =
  "Cogent by Stem Systems — Regulatory Intelligence & Workflow Engine for Nigeria & Africa";
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
          backgroundColor: "#FFFFFF",
          borderTop: "8px solid #1D4ED8",
          padding: "60px 72px",
          color: "#0B1220",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #E2E8F0",
            paddingBottom: "28px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                backgroundColor: "#0B1220",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "20px",
                color: "#FFFFFF",
              }}
            >
              C
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "24px", fontWeight: 700, color: "#0B1220" }}>
                Cogent
              </span>
              <span
                style={{
                  fontSize: "12px",
                  letterSpacing: "0.14em",
                  color: "#64748B",
                  textTransform: "uppercase",
                }}
              >
                by Stem Systems · stem-cogent.com
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              padding: "8px 14px",
              borderRadius: "6px",
              backgroundColor: "#F8FAFC",
              border: "1px solid #CBD5E1",
              color: "#334155",
              fontSize: "13px",
              fontWeight: 600,
              letterSpacing: "0.06em",
            }}
          >
            CBN · SEC · NDPC · FCCPC · NFIU · CBK · BoG
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: "960px" }}>
          <div
            style={{
              fontSize: "60px",
              fontWeight: 700,
              lineHeight: 1.06,
              letterSpacing: "-0.03em",
              color: "#0B1220",
            }}
          >
            Know the rules in seconds.
          </div>
          <div
            style={{
              marginTop: "20px",
              fontSize: "24px",
              lineHeight: 1.45,
              color: "#475569",
            }}
          >
            Turn scattered Nigerian and African regulations into finished structuring memos, updated AML policies, regulator responses, and cleared launches.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #E2E8F0",
            paddingTop: "24px",
            fontSize: "16px",
            color: "#475569",
          }}
        >
          <span>Built for Fintechs, Commercial Banks, MFBs, General Counsel &amp; CCOs</span>
          <span style={{ color: "#1D4ED8", fontWeight: 700 }}>
            5-Day Compliance Tasks → Under 5 Minutes
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
