import * as React from "react"

import { cn } from "@/lib/utils"

/** Nora multi-line input — flat input-bg, focus glow, no border */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-[var(--nora-radius-md,8px)] border-0 bg-[var(--nora-input-bg)] px-2.5 py-2 font-[family-name:var(--nora-font)] text-xs font-medium text-[var(--nora-input-text)] transition-[box-shadow] duration-[var(--nora-duration,0.15s)] outline-none",
        "placeholder:text-[var(--nora-input-placeholder)]",
        "focus-visible:shadow-[var(--nora-shadow-focus)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:shadow-[inset_0_0_0_1px_var(--nora-error)]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
