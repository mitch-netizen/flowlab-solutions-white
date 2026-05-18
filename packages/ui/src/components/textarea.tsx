"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, FocusEvent, TextareaHTMLAttributes } from "react";

export function Textarea({ onFocus, onBlur, style, disabled, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [isFocused, setIsFocused] = useState(false);
  const isInvalid = props["aria-invalid"] === true || props["aria-invalid"] === "true";

  const computedStyle = useMemo<CSSProperties>(() => ({
    width: "100%",
    minHeight: 120,
    resize: "vertical",
    borderRadius: "var(--radius-md)",
    border: `1px solid ${isInvalid ? "var(--state-danger, var(--accent-secondary))" : "var(--border-subtle)"}`,
    background: "color-mix(in srgb, var(--surface-2) 86%, black)",
    color: "var(--text-primary)",
    padding: "var(--space-3) var(--space-4)",
    fontSize: 14,
    fontFamily: "inherit",
    lineHeight: 1.6,
    boxShadow: isFocused
      ? `0 0 0 2px ${isInvalid ? "color-mix(in srgb, var(--state-danger, var(--accent-secondary)) 65%, transparent)" : "color-mix(in srgb, var(--accent-primary) 65%, transparent)"}`
      : "none",
    opacity: disabled ? "0.6" : "1",
    cursor: disabled ? "not-allowed" : "text",
    transition: "box-shadow 120ms ease, border-color 120ms ease, opacity 120ms ease",
    ...style
  }), [disabled, isFocused, isInvalid, style]);

  function handleFocus(event: FocusEvent<HTMLTextAreaElement>) {
    setIsFocused(true);
    onFocus?.(event);
  }

  function handleBlur(event: FocusEvent<HTMLTextAreaElement>) {
    setIsFocused(false);
    onBlur?.(event);
  }

  return <textarea {...props} disabled={disabled} onFocus={handleFocus} onBlur={handleBlur} style={computedStyle} />;
}
