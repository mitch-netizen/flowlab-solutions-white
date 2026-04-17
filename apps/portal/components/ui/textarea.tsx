import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "./utils";

const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => {
  return <textarea ref={ref} className={cn("textarea", className)} {...props} />;
});

Textarea.displayName = "Textarea";

export { Textarea };
