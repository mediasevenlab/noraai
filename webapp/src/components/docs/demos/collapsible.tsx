import { ChevronsUpDownIcon } from "@/components/icons"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

import type { ComponentDoc } from "./types"

export const collapsibleDoc: ComponentDoc = {
  id: "collapsible",
  examples: [
    {
      title: "Basic",
      description: "Expandable content panel.",
      code: `import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"

export function CollapsibleDemo() {
  return (
    <Collapsible>
      <CollapsibleTrigger render={<Button variant="ghost" />}>
        Toggle
      </CollapsibleTrigger>
      <CollapsibleContent>Hidden content</CollapsibleContent>
    </Collapsible>
  )
}`,
      render: () => (
        <Collapsible className="w-full max-w-sm space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-medium">@peduarte starred 3 repos</h4>
            <CollapsibleTrigger
              render={<Button variant="ghost" size="icon-sm" />}
            >
              <ChevronsUpDownIcon />
              <span className="sr-only">Toggle</span>
            </CollapsibleTrigger>
          </div>
          <div className="rounded-md border px-3 py-2 text-sm">
            @radix-ui/primitives
          </div>
          <CollapsibleContent className="space-y-2">
            <div className="rounded-md border px-3 py-2 text-sm">
              @radix-ui/colors
            </div>
            <div className="rounded-md border px-3 py-2 text-sm">
              @stitches/react
            </div>
          </CollapsibleContent>
        </Collapsible>
      ),
    },
  ],
}
