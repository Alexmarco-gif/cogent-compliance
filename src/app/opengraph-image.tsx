import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt =
  "Cogent by Stem Systems — Ship financial campaigns fast without compliance surprises";
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
          backgroundColor: "#F8FAFF",
          backgroundImage:
            "radial-gradient(circle at 12% 14%, rgba(29, 99, 237, 0.22), transparent 52%), radial-gradient(circle at 90% 18%, rgba(139, 92, 246, 0.16), transparent 50%)",
          padding: "64px 72px",
          color: "#0F172A",
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
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "#1D63ED",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "22px",
                color: "#FFFFFF",
              }}
            >
              C
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A" }}>
                Cogent
              </span>
              <span
                style={{
                  fontSize: "12px",
                  letterSpacing: "0.14em",
                  color: "#475569",
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
              padding: "8px 16px",
              borderRadius: "9999px",
              backgroundColor: "#1D63ED",
              color: "#FFFFFF",
              fontSize: "13px",
              fontWeight: 600,
              letterSpacing: "0.06em",
            }}
          >
            CBN · FCCPC · ARCON · NDPC · SEC
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: "940px" }}>
          <div
            style={{
              fontSize: "62px",
              fontWeight: 700,
              lineHeight: 1.06,
              letterSpacing: "-0.03em",
              color: "#0F172A",
            }}
          >
            Launch campaigns fast.
          </div>
          <div
            style={{
              fontSize: "62px",
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              color: "#1D63ED",
            }}
          >
            Without the compliance fear.
          </div>
          <div
            style={{
              marginTop: "24px",
              fontSize: "24px",
              lineHeight: 1.45,
              color: "#475569",
            }}
          >
            Catch risky claims, wrong rates, and missing disclosures across flyers, app stores, and landing pages before regulators do.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(15, 23, 42, 0.1)",
            paddingTop: "24px",
            fontSize: "17px",
            color: "#475569",
          }}
        >
          <span>Built for Nigerian Digital Lenders, MFBs, Banks, PSBs &amp; WealthTech</span>
          <span style={{ color: "#1D63ED", fontWeight: 700 }}>
            Check your first campaign free →
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
