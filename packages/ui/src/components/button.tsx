"use client";

import { useMemo, useState } from "react";
import type { ButtonHTMLAttributes, CSSProperties, FocusEvent, MouseEvent, PropsWithChildren } from "react";

export function Button({
  children,
  className = "",
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onMouseUp,
  onFocus,
  onBlur,
  disabled,
  style,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const computedStyle = useMemo<CSSProperties>(() => {
    const stateOpacity = disabled ? "0.58" : isPressed ? "0.88" : isHovered ? "0.94" : "1";

    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "var(--radius-lg)",
      background: "var(--gradient-primary)",
      padding: "calc(var(--space-3) + var(--space-1)) var(--space-5)",
      fontSize: 14,
      fontWeight: 700,
      color: "var(--app-bg)",
      border: "1px solid color-mix(in srgb, var(--accent-primary) 42%, transparent)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: stateOpacity,
      transform: isPressed ? "translateY(1px)" : "translateY(0)",
      boxShadow: isFocused ? "0 0 0 2px color-mix(in srgb, var(--accent-secondary) 65%, transparent)" : "var(--shadow-sm)",
      transition: "opacity 120ms ease, transform 120ms ease, box-shadow 120ms ease, filter 120ms ease",
      filter: disabled ? "grayscale(0.1)" : "none",
      ...style
    };
  }, [disabled, isFocused, isHovered, isPressed, style]);

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
