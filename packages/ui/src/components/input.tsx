import { useMemo, useState } from "react";
import type { CSSProperties, FocusEvent, InputHTMLAttributes } from "react";

export function Input({ onFocus, onBlur, style, disabled, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [isFocused, setIsFocused] = useState(false);
  const isInvalid = props["aria-invalid"] === true || props["aria-invalid"] === "true";

  const computedStyle = useMemo<CSSProperties>(() => ({
    width: "100%",
    borderRadius: "calc(var(--radius-lg) * 1.5)",
    border: `1px solid ${isInvalid ? "var(--state-danger, var(--accent-secondary))" : "var(--border-subtle)"}`,
    background: "color-mix(in srgb, var(--surface-2) 75%, black)",
    color: "var(--text-primary)",
    padding: "calc(var(--space-3) + var(--space-1)) var(--space-4)",
    fontSize: 14,
    boxShadow: isFocused
      ? `0 0 0 2px ${isInvalid ? "color-mix(in srgb, var(--state-danger, var(--accent-secondary)) 65%, transparent)" : "color-mix(in srgb, var(--accent-primary) 65%, transparent)"}`
      : "none",
    opacity: disabled ? "0.6" : "1",
    cursor: disabled ? "not-allowed" : "text",
    transition: "box-shadow 120ms ease, border-color 120ms ease, opacity 120ms ease",
    ...style
  }), [disabled, isFocused, isInvalid, style]);

  function handleFocus(event: FocusEvent<HTMLInputElement>) {
    setIsFocused(true);
    onFocus?.(event);
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    setIsFocused(false);
    onBlur?.(event);
  }

  return <input {...props} disabled={disabled} onFocus={handleFocus} onBlur={handleBlur} style={computedStyle} />;
}
