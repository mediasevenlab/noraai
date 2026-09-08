import { Separator } from "@/components/ui/separator"

import type { ComponentDoc } from "./types"

function SeparatorVertical() {
  return (
    <div className="flex h-8 items-center gap-2.5 font-[family-name:var(--nora-font)]">
      <span className="text-xs font-medium text-[var(--nora-text)]">
        Item one
      </span>
      <Separator orientation="vertical" />
      <span className="text-xs font-medium text-[var(--nora-text)]">
        Item two
      </span>
    </div>
  )
}

function SeparatorInMenu() {
  return (
    <div className="w-[200px] rounded-[var(--nora-radius-lg,10px)] bg-[var(--nora-popover)] p-[5px] shadow-[var(--nora-shadow-popover)] font-[family-name:var(--nora-font)]">
      <div className="flex h-[26px] items-center rounded-[var(--nora-radius-sm,6px)] px-2 text-xs font-medium text-[var(--nora-text)]">
        Profile
      </div>
      <div className="flex h-[26px] items-center rounded-[var(--nora-radius-sm,6px)] px-2 text-xs font-medium text-[var(--nora-text)]">
        Settings
      </div>
      <Separator className="my-1" />
      <div className="flex h-[26px] items-center rounded-[var(--nora-radius-sm,6px)] px-2 text-xs font-medium text-[var(--nora-error)]">
        Log out
      </div>
    </div>
  )
}

export const separatorDoc: ComponentDoc = {
  id: "separator",
  examples: [
    {
      title: "Vertical",
      description: "Inline vertical rule.",
      code: `<Separator orientation="vertical" />`,
      render: () => <SeparatorVertical />,
    },
    {
      title: "In menu",
      description: "Divider inside a Nora popover surface.",
      code: `<div className="…popover…">
  …
  <Separator className="my-1" />
  …
</div>`,
      render: () => <SeparatorInMenu />,
    },
  ],
}
