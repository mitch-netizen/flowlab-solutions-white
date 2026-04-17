import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "./utils";

type ButtonVariant = "default" | "ghost";

const variantClass: Record<ButtonVariant, string> = {
  default: "cta",
  ghost: "ghost"
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = "default", ...props }, ref) => {
  return <button ref={ref} className={cn(variantClass[variant], className)} {...props} />;
});

Button.displayName = "Button";

export { Button };
