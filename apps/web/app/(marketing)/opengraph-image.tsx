import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "FlowLab Solutions — Field service operations platform for Australian tradies";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function Step({
  num,
  label,
  sub,
  color,
  connector,
}: {
  num: string;
  label: string;
  sub: string;
  color: string;
  connector: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "12px 14px 12px 17px",
          backgroundColor: "rgba(15,23,42,0.7)",
          borderRadius: 12,
          border: `1px solid ${color}33`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 3,
            height: "100%",
            backgroundColor: color,
          }}
        />
        <div
          style={{
            display: "flex",
            width: 28,
            height: 28,
            borderRadius: 7,
            backgroundColor: `${color}26`,
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            color,
            flexShrink: 0,
          }}
        >
          {num}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#f8fafc" }}>{label}</span>
          <span style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{sub}</span>
        </div>
      </div>
      {connector && (
        <div
          style={{
            width: 2,
            height: 14,
            backgroundColor: "rgba(148,163,184,0.2)",
            margin: "0 auto",
          }}
        />
      )}
    </div>
  );
}

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "#020617",
          position: "relative",
          fontFamily: "sans-serif",
          overflow: "hidden",
        }}
      >
        {/* Blue glow — top left */}
        <div
          style={{
            position: "absolute",
            top: -80,
            left: -80,
            width: 560,
            height: 560,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.28) 0%, transparent 70%)",
          }}
        />
        {/* Sky glow — top right */}
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(14,165,233,0.18) 0%, transparent 70%)",
          }}
        />

        {/* Left column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "64px 40px 64px 64px",
            flex: 1,
          }}
        >
          {/* Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "6px 16px",
              backgroundColor: "rgba(59,130,246,0.12)",
              borderRadius: 99,
              border: "1px solid rgba(59,130,246,0.35)",
              color: "#bfdbfe",
              fontSize: 11,
              letterSpacing: 3,
              marginBottom: 28,
              width: 200,
            }}
          >
            FLOWLAB SOLUTIONS
          </div>

          {/* Headline */}
          <div style={{ display: "flex", flexDirection: "column", marginBottom: 28 }}>
            <span
              style={{ fontSize: 52, fontWeight: 800, color: "#f8fafc", lineHeight: 1.1, letterSpacing: -1.5 }}
            >
              Stop running your
            </span>
            <span
              style={{ fontSize: 52, fontWeight: 800, color: "#f8fafc", lineHeight: 1.1, letterSpacing: -1.5 }}
            >
              field service business
            </span>
            <span
              style={{ fontSize: 52, fontWeight: 800, color: "#60a5fa", lineHeight: 1.1, letterSpacing: -1.5 }}
            >
              from WhatsApp.
            </span>
          </div>

          {/* Sub */}
          <div style={{ display: "flex", flexDirection: "column", marginBottom: 32 }}>
            <span style={{ fontSize: 17, color: "#cbd5e1", lineHeight: 1.6 }}>
              CRM · AI Quoting · Xero Invoicing · Job Board
            </span>
            <span style={{ fontSize: 17, color: "#cbd5e1" }}>One platform. Your brand.</span>
          </div>

          {/* Trust */}
          <span style={{ fontSize: 13, color: "#475569", marginBottom: 16 }}>
            14-day free trial  ·  No credit card  ·  Australian-built
          </span>

          {/* URL */}
          <span style={{ fontSize: 20, color: "#60a5fa", fontWeight: 700 }}>flowlabsolutions.au</span>
        </div>

        {/* Right panel */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: 400,
            margin: "36px 36px 36px 0",
            backgroundColor: "rgba(15,23,42,0.9)",
            borderRadius: 20,
            border: "1px solid rgba(148,163,184,0.15)",
            padding: "28px 22px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              fontSize: 10,
              letterSpacing: 3,
              color: "#60a5fa",
              marginBottom: 20,
            }}
          >
            FROM ENQUIRY TO PAID INVOICE
          </div>

          <Step num="01" label="Enquiry received" sub="Lands in CRM, ready to quote" color="#60a5fa" connector />
          <Step num="02" label="Quote sent" sub="AI-priced in under 2 minutes" color="#fbbf24" connector />
          <Step num="03" label="Job complete" sub="Agreement signed, work done" color="#4ade80" connector />
          <Step num="04" label="Invoice in Xero ✓" sub="AUTHORISED and ready to collect" color="#a78bfa" connector={false} />
        </div>
      </div>
    ),
    { ...size }
  );
}
