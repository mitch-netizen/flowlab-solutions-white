import type { PropsWithChildren } from "react";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

export function Card({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/12 bg-slate-900/65 p-6 shadow-[0_18px_60px_rgba(2,6,23,0.35)]",
        className
      )}
    >
      {children}
    </div>
  );
}
