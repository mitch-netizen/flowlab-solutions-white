import type { CSSProperties } from "react";

export type SpinnerSize = "sm" | "md" | "lg";

const SIZE_PX: Record<SpinnerSize, number> = { sm: 14, md: 20, lg: 28 };
const BORDER_PX: Record<SpinnerSize, number> = { sm: 2, md: 2, lg: 3 };

const KEYFRAMES = `
@keyframes flowlab-spin {
  to { transform: rotate(360deg); }
}
`;

let injected = false;
function injectKeyframes() {
  if (injected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.textContent = KEYFRAMES;
  document.head.appendChild(style);
  injected = true;
}

export function Spinner({ size = "md", label = "Loading…", style }: { size?: SpinnerSize; label?: string; style?: CSSProperties }) {
  if (typeof document !== "undefined") injectKeyframes();

  const px = SIZE_PX[size];
  const border = BORDER_PX[size];

  const spinnerStyle: CSSProperties = {
    display: "inline-block",
    width: px,
    height: px,
    borderRadius: "50%",
    border: `${border}px solid color-mix(in srgb, var(--accent-primary) 22%, transparent)`,
    borderTopColor: "var(--accent-primary)",
    animation: "flowlab-spin 600ms linear infinite",
    flexShrink: 0,
    ...style
  };

  return <span role="status" aria-label={label} style={spinnerStyle} />;
}
