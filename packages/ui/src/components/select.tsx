"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, FocusEvent, SelectHTMLAttributes } from "react";

export function Select({ onFocus, onBlur, style, disabled, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
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
    fontFamily: "inherit",
    appearance: "none",
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23676767' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right var(--space-4) center",
    paddingRight: "calc(var(--space-6) + var(--space-2))",
    boxShadow: isFocused
      ? `0 0 0 2px ${isInvalid ? "color-mix(in srgb, var(--state-danger, var(--accent-secondary)) 65%, transparent)" : "color-mix(in srgb, var(--accent-primary) 65%, transparent)"}`
      : "none",
    opacity: disabled ? "0.6" : "1",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "box-shadow 120ms ease, border-color 120ms ease, opacity 120ms ease",
    ...style
  }), [disabled, isFocused, isInvalid, style]);

  function handleFocus(event: FocusEvent<HTMLSelectElement>) {
    setIsFocused(true);
    onFocus?.(event);
  }

  function handleBlur(event: FocusEvent<HTMLSelectElement>) {
    setIsFocused(false);
    onBlur?.(event);
  }

  return (
    <select {...props} disabled={disabled} onFocus={handleFocus} onBlur={handleBlur} style={computedStyle}>
      {children}
    </select>
  );
}
