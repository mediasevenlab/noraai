import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

/** Nora `.nora-input`: плоское поле, без рамки, focus — `--nora-shadow-focus` */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-[var(--nora-control-h,30px)] w-full min-w-0 rounded-[var(--nora-radius-md,8px)] border-0 bg-[var(--nora-input-bg)] px-2 font-[family-name:var(--nora-font)] text-xs font-medium text-[var(--nora-input-text)] transition-[box-shadow] duration-[var(--nora-duration,0.15s)] outline-none",
        "placeholder:text-[var(--nora-input-placeholder)]",
        "file:me-2 file:inline-flex file:h-[22px] file:items-center file:rounded-[var(--nora-radius-sm)] file:border-0 file:bg-[var(--nora-panel)] file:px-2 file:text-[11px] file:font-medium file:text-[var(--nora-text)] file:shadow-[inset_0_0_0_1px_var(--nora-border)]",
        "focus-visible:shadow-[var(--nora-shadow-focus)]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:shadow-[inset_0_0_0_1px_var(--nora-error)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
