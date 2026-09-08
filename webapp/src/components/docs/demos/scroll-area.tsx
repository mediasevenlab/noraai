import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

import type { ComponentDoc } from "./types"

const tags = Array.from({ length: 50 }).map(
  (_, i, a) => `v1.2.0-beta.${a.length - i}`
)

const shell =
  "rounded-[var(--nora-radius-lg,10px)] bg-[var(--nora-panel)] shadow-[inset_0_0_0_1px_var(--nora-border)]"

function ScrollVertical() {
  return (
    <ScrollArea className={`h-48 w-48 ${shell}`}>
      <div className="p-3 font-[family-name:var(--nora-font)]">
        <h4 className="mb-2 text-xs font-semibold text-[var(--nora-text)]">
          Tags
        </h4>
        {tags.map((tag) => (
          <div key={tag}>
            <div className="py-0.5 text-xs font-medium text-[var(--nora-text)]">
              {tag}
            </div>
            <Separator className="my-1.5 bg-[var(--nora-divider)]" />
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

function ScrollHorizontal() {
  return (
    <ScrollArea className={`w-72 whitespace-nowrap ${shell}`}>
      <div className="flex w-max gap-2 p-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex h-[72px] w-24 items-center justify-center rounded-[var(--nora-radius-md,8px)] bg-[var(--nora-input-bg)] text-xs font-medium text-[var(--nora-text)]"
          >
            Card {i + 1}
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

function ScrollBoth() {
  return (
    <ScrollArea className={`h-40 w-64 ${shell}`}>
      <div className="w-[480px] p-3 font-[family-name:var(--nora-font)]">
        <p className="mb-2 text-xs font-semibold text-[var(--nora-text)]">
          Wide content
        </p>
        <p className="text-xs font-medium leading-relaxed text-[var(--nora-text-tertiary)]">
          Drag both axes — this block is taller and wider than the viewport so
          vertical and horizontal scrollbars appear together. Useful for maps,
          spreadsheets, and dense tables inside Nora-style panels.
        </p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex h-12 items-center justify-center rounded-[var(--nora-radius-sm,6px)] bg-[var(--nora-surface)] text-[11px] font-medium text-[var(--nora-text)]"
            >
              Cell {i + 1}
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}

export const scrollAreaDoc: ComponentDoc = {
  id: "scroll-area",
  examples: [
    {
      title: "Vertical",
      description: "List with Nora panel + custom thumb.",
      code: `<ScrollArea className="h-48 w-48">
  …
</ScrollArea>`,
      render: () => <ScrollVertical />,
    },
    {
      title: "Horizontal",
      description: "Horizontal overflow — built-in ScrollBar.",
      code: `<ScrollArea className="w-72 whitespace-nowrap">
  <div className="flex w-max gap-2">…</div>
</ScrollArea>`,
      render: () => <ScrollHorizontal />,
    },
    {
      title: "Both axes",
      description: "Overflow in width and height.",
      code: `<ScrollArea className="h-40 w-64">
  <div className="w-[480px]">…</div>
</ScrollArea>`,
      render: () => <ScrollBoth />,
    },
  ],
}
