import { BoldIcon, ItalicIcon, UnderlineIcon, BookmarkIcon } from "lucide-react"

import { Toggle } from "@/components/ui/toggle"

import type { ComponentDoc } from "./types"

export const toggleDoc: ComponentDoc = {
  id: "toggle",
  examples: [
    {
      title: "Basic",
      description: "Nora toolbar toggle — pressed = tint-dimmed.",
      code: `import { Toggle } from "@/components/ui/toggle"
import { BoldIcon } from "lucide-react"

<Toggle aria-label="Toggle bold">
  <BoldIcon />
</Toggle>`,
      render: () => (
        <div className="flex gap-1.5">
          <Toggle aria-label="Toggle bold">
            <BoldIcon />
          </Toggle>
          <Toggle aria-label="Toggle italic" defaultPressed>
            <ItalicIcon />
          </Toggle>
          <Toggle aria-label="Toggle underline">
            <UnderlineIcon />
          </Toggle>
        </div>
      ),
    },
    {
      title: "Outline",
      description: "Outline variant — input-bg surface.",
      code: `<Toggle variant="outline">
  <ItalicIcon />
  Italic
</Toggle>`,
      render: () => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Toggle variant="outline" aria-label="Toggle italic">
            <ItalicIcon />
            Italic
          </Toggle>
          <Toggle variant="outline" aria-label="Toggle bold" defaultPressed>
            <BoldIcon />
            Bold
          </Toggle>
        </div>
      ),
    },
    {
      title: "With text",
      description: "Icon + label.",
      code: `<Toggle>
  <BookmarkIcon />
  Bookmark
</Toggle>`,
      render: () => (
        <Toggle variant="outline" aria-label="Toggle bookmark" defaultPressed>
          <BookmarkIcon className="group-aria-pressed/toggle:fill-[var(--nora-tint)]" />
          Bookmark
        </Toggle>
      ),
    },
    {
      title: "Sizes",
      description: "sm 22 · default 26 · lg 30.",
      code: `<Toggle size="sm" />
<Toggle size="default" />
<Toggle size="lg" />`,
      render: () => (
        <div className="flex flex-wrap items-center gap-2">
          <Toggle variant="outline" size="sm" aria-label="Small">
            Small
          </Toggle>
          <Toggle variant="outline" size="default" aria-label="Default">
            Default
          </Toggle>
          <Toggle variant="outline" size="lg" aria-label="Large">
            Large
          </Toggle>
        </div>
      ),
    },
    {
      title: "Disabled",
      description: "Disabled default and outline.",
      code: `<Toggle disabled>Disabled</Toggle>`,
      render: () => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Toggle aria-label="Disabled" disabled>
            Disabled
          </Toggle>
          <Toggle variant="outline" aria-label="Disabled outline" disabled>
            Disabled
          </Toggle>
        </div>
      ),
    },
  ],
}
