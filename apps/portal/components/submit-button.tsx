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
        const btn = e.currentTarget;
        const form = btn.form;
        if (form && !form.reportValidity()) return;
        // Defer the disable so the browser fires the submit event first.
        // Setting disabled=true synchronously in onClick cancels form submission.
        setTimeout(() => {
          btn.disabled = true;
          btn.textContent = loadingText;
        }, 0);
        onClick?.(e);
      }}
    >
      {children}
    </button>
  );
}
