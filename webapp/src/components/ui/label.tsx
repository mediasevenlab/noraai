"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/** Nora field label — secondary text, 12/medium */
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 font-[family-name:var(--nora-font)] text-xs font-medium leading-none text-[var(--nora-text-secondary)] select-none",
        "group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
