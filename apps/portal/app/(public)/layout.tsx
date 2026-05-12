import type { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "1.5rem", textAlign: "center", marginTop: "2rem" }}>
        <nav style={{ display: "flex", gap: "1.5rem", justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/privacy" style={{ fontSize: 12, color: "#64748b", textDecoration: "none" }}>Privacy Notice</a>
          <a href="https://flowlabsolutions.au/terms" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#64748b", textDecoration: "none" }}>Terms of Service</a>
          <a href="https://flowlabsolutions.au" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#64748b", textDecoration: "none" }}>Powered by FlowLab</a>
        </nav>
      </footer>
    </>
  );
}
