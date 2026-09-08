import * as React from "react"

import { NORA_ICONS } from "@/lib/nora-icons"
import { cn } from "@/lib/utils"

type NoraIconProps = React.HTMLAttributes<HTMLSpanElement> & {
  /** id иконки из каталога NORA_ICONS (см. /ds/icons) */
  icon: string
}

/**
 * Иконка из оригинального UI Nora (извлечена из редактора и маркетинга).
 * Наследует currentColor, размер задаётся через size-* на обёртке.
 */
export function NoraIcon({ icon, className, style, ...props }: NoraIconProps) {
  const found = NORA_ICONS.find((i) => i.id === icon)
  if (!found) return null
  const svgUrl = `url("data:image/svg+xml,${encodeURIComponent(found.svg)}")`

  return (
    <span
      className={cn(
        "inline-block size-full shrink-0 bg-current",
        className
      )}
      aria-hidden
      style={{
        maskImage: svgUrl,
        maskRepeat: "no-repeat",
        maskPosition: "center",
        maskSize: "contain",
        WebkitMaskImage: svgUrl,
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        WebkitMaskSize: "contain",
        ...style,
      }}
      {...props}
    />
  )
}
