import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Компактная таблица токенов в стиле Nora DS (.token-table) */
export function TokenTable({
  headers,
  children,
  className,
}: {
  headers: string[]
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-[10px] ring-1 ring-border",
        className
      )}
    >
      <table className="w-full border-collapse text-left text-[12px]">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {headers.map((h) => (
              <th
                key={h}
                className="px-3 py-2 font-medium text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:border-t [&_td]:border-border [&_td]:px-3 [&_td]:py-2">
          {children}
        </tbody>
      </table>
    </div>
  )
}

export function Swatch({
  color,
  size = 18,
}: {
  color: string
  size?: number
}) {
  return (
    <span
      className="inline-block shrink-0 rounded-[4px] ring-1 ring-black/10"
      style={{
        width: size,
        height: size,
        background: color,
      }}
    />
  )
}

export async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    /* ignore */
  }
}
