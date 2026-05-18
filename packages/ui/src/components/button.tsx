"use client";

import { useMemo, useState } from "react";
import type { ButtonHTMLAttributes, CSSProperties, FocusEvent, MouseEvent, PropsWithChildren } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const PADDING: Record<ButtonSize, string> = {
  sm: "calc(var(--space-2) + 2px) var(--space-4)",
  md: "calc(var(--space-3) + var(--space-1)) var(--space-5)",
  lg: "var(--space-4) var(--space-6)"
};

const FONT_SIZE: Record<ButtonSize, number> = { sm: 12, md: 14, lg: 15 };

function buildVariantStyle(variant: ButtonVariant, isHovered: boolean, isPressed: boolean, isFocused: boolean, disabled: boolean): CSSProperties {
  const opacity = disabled ? "0.58" : isPressed ? "0.88" : isHovered ? "0.94" : "1";
  const focusShadow = isFocused ? "0 0 0 2px color-mix(in srgb, var(--accent-secondary) 65%, transparent)" : undefined;

  if (variant === "secondary") {
    return {
      background: "color-mix(in srgb, var(--surface-2) 82%, black)",
      color: "var(--text-primary)",
      border: "1px solid var(--accent-primary)",
      boxShadow: focusShadow ?? "none",
      opacity
    };
  }

  if (variant === "ghost") {
    return {
      background: isHovered ? "color-mix(in srgb, var(--accent-primary) 10%, var(--surface-2))" : "transparent",
      color: "var(--text-primary)",
      border: "1px solid var(--border-subtle)",
      boxShadow: focusShadow ?? "none",
      opacity
    };
  }

  // primary
  return {
    background: "var(--gradient-primary)",
    color: "var(--app-bg)",
    border: "1px solid color-mix(in srgb, var(--accent-primary) 42%, transparent)",
    boxShadow: focusShadow ?? "var(--shadow-sm)",
    opacity,
    filter: disabled ? "grayscale(0.1)" : "none"
  };
}

export function Button({
  children,
  className = "",
  variant = "primary",
  size = "md",
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onMouseUp,
  onFocus,
  onBlur,
  disabled,
  style,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }>) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const computedStyle = useMemo<CSSProperties>(() => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-2)",
    borderRadius: "var(--radius-lg)",
    padding: PADDING[size],
    fontSize: FONT_SIZE[size],
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    transform: isPressed ? "translateY(1px)" : "translateY(0)",
    transition: "opacity 120ms ease, transform 120ms ease, box-shadow 120ms ease, filter 120ms ease, background 120ms ease, border-color 120ms ease",
    ...buildVariantStyle(variant, isHovered, isPressed, isFocused, !!disabled),
    ...style
  }), [disabled, isFocused, isHovered, isPressed, size, style, variant]);

  function handleMouseEnter(event: MouseEvent<HTMLButtonElement>) {
    setIsHovered(true);
    onMouseEnter?.(event);
  }

  function handleMouseLeave(event: MouseEvent<HTMLButtonElement>) {
    setIsHovered(false);
    setIsPressed(false);
    onMouseLeave?.(event);
  }

  function handleMouseDown(event: MouseEvent<HTMLButtonElement>) {
    setIsPressed(true);
    onMouseDown?.(event);
  }

  function handleMouseUp(event: MouseEvent<HTMLButtonElement>) {
    setIsPressed(false);
    onMouseUp?.(event);
  }

  function handleFocus(event: FocusEvent<HTMLButtonElement>) {
    setIsFocused(true);
    onFocus?.(event);
  }

  function handleBlur(event: FocusEvent<HTMLButtonElement>) {
    setIsFocused(false);
    setIsPressed(false);
    onBlur?.(event);
  }

  return (
    <button
      {...props}
      disabled={disabled}
      className={className}
      style={computedStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
    </button>
  );
}
