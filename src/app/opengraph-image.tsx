import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Lineage — Traceability-first inventory tracking";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        background: "#09090b",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "40px",
        }}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="4" r="2.5" fill="#fafafa" />
          <circle cx="5" cy="14" r="2.5" fill="#fafafa" />
          <circle cx="19" cy="14" r="2.5" fill="#fafafa" />
          <circle cx="12" cy="22" r="2.5" fill="#fafafa" opacity="0.4" />
          <line
            x1="12"
            y1="6.5"
            x2="5"
            y2="11.5"
            stroke="#fafafa"
            strokeWidth="1.5"
          />
          <line
            x1="12"
            y1="6.5"
            x2="19"
            y2="11.5"
            stroke="#fafafa"
            strokeWidth="1.5"
          />
          <line
            x1="5"
            y1="16.5"
            x2="12"
            y2="19.5"
            stroke="#fafafa"
            strokeWidth="1.5"
            opacity="0.4"
          />
          <line
            x1="19"
            y1="16.5"
            x2="12"
            y2="19.5"
            stroke="#fafafa"
            strokeWidth="1.5"
            opacity="0.4"
          />
        </svg>
        <span
          style={{
            fontSize: "48px",
            fontWeight: 700,
            color: "#fafafa",
            fontStyle: "italic",
            fontFamily: "serif",
          }}
        >
          Lineage
        </span>
      </div>
      <div
        style={{
          fontSize: "36px",
          fontWeight: 700,
          color: "#fafafa",
          textAlign: "center",
          lineHeight: 1.3,
          maxWidth: "800px",
        }}
      >
        Track what you make, from source to shelf
      </div>
      <div
        style={{
          fontSize: "20px",
          color: "#a1a1aa",
          textAlign: "center",
          marginTop: "20px",
          maxWidth: "600px",
          lineHeight: 1.5,
        }}
      >
        Scan-based workflows, full lineage traceability, and real-time inventory
        for physical operations.
      </div>
    </div>,
    { ...size },
  );
}
