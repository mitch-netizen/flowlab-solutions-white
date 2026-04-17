import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "./utils";

const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => {
  return <select ref={ref} className={cn("select", className)} {...props} />;
});

Select.displayName = "Select";

export { Select };
