"use client";

import { ComponentPropsWithoutRef } from "react";

type SubmitButtonProps = ComponentPropsWithoutRef<"button"> & {
  loadingText?: string;
};

export default function SubmitButton({ children, loadingText = "Saving...", onClick, disabled, ...props }: SubmitButtonProps) {
  return (
    <button
      {...props}
      type="submit"
      disabled={disabled}
      onClick={(e) => {
        const form = e.currentTarget.form;
        if (form && !form.reportValidity()) return;
        e.currentTarget.disabled = true;
        e.currentTarget.textContent = loadingText;
        onClick?.(e);
      }}
    >
      {children}
    </button>
  );
}
