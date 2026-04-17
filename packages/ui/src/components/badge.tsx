import type { PropsWithChildren } from "react";

type BadgeTone = "neutral" | "success" | "warning" | "danger";
type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

const baseClasses = "inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em]";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-white/10 text-slate-200",
  success: "bg-emerald-500/20 text-emerald-200",
  warning: "bg-amber-500/20 text-amber-200",
  danger: "bg-rose-500/20 text-rose-200"
};

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-sky-500/25 text-sky-100",
  secondary: "bg-slate-700 text-slate-100",
  outline: "border border-white/20 bg-transparent text-slate-200",
  destructive: "bg-rose-500/25 text-rose-100"
};

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

export type BadgeProps = PropsWithChildren<{
  className?: string;
  tone?: BadgeTone;
  variant?: BadgeVariant;
}>;

export function Badge({ children, className, tone = "neutral", variant }: BadgeProps) {
  return <span className={cn(baseClasses, variant ? variantClasses[variant] : toneClasses[tone], className)}>{children}</span>;
}
