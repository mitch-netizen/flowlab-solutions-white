import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonVariant = "default" | "secondary" | "outline" | "destructive";
type ButtonSize = "default" | "sm" | "lg" | "icon";

const baseClasses =
  "inline-flex items-center justify-center whitespace-nowrap rounded-[18px] border border-transparent text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-50";

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-sky-400 text-slate-950 hover:bg-sky-300",
  secondary: "bg-slate-700 text-slate-100 hover:bg-slate-600",
  outline: "border-white/15 bg-transparent text-slate-100 hover:bg-white/10",
  destructive: "bg-rose-500 text-rose-50 hover:bg-rose-400"
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "px-[18px] py-[14px]",
  sm: "px-3 py-2 text-xs",
  lg: "px-6 py-4 text-base",
  icon: "size-11 p-0"
};

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

export type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
  }
>;

export function Button({ children, className = "", variant = "default", size = "default", ...props }: ButtonProps) {
  return (
    <button {...props} className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}>
      {children}
    </button>
  );
}
