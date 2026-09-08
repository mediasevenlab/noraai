import { SaveIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import type { ComponentDoc } from "./types"

export const tooltipDoc: ComponentDoc = {
  id: "tooltip",
  examples: [
    {
      title: "Basic",
      description: "Nora tooltip — dark surface, 11px medium.",
      code: `import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger render={<Button variant="outline" />}>
      Hover
    </TooltipTrigger>
    <TooltipContent>
      <p>Add to library</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>`,
      render: () => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={<Button variant="outline" />}>
              Hover
            </TooltipTrigger>
            <TooltipContent>
              <p>Add to library</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      title: "Sides",
      description: "Positioned on each side.",
      code: `<TooltipContent side="top">…</TooltipContent>`,
      render: () => (
        <TooltipProvider>
          <div className="flex flex-wrap justify-center gap-2">
            {(["top", "right", "bottom", "left"] as const).map((side) => (
              <Tooltip key={side}>
                <TooltipTrigger
                  render={<Button variant="outline" className="capitalize" />}
                >
                  {side}
                </TooltipTrigger>
                <TooltipContent side={side}>
                  <p>On the {side}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      ),
    },
    {
      title: "With shortcut",
      description: "Tooltip + Kbd chip.",
      code: `<TooltipContent>
  Save Changes <Kbd>S</Kbd>
</TooltipContent>`,
      render: () => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={<Button variant="outline" size="icon" />}>
              <SaveIcon />
            </TooltipTrigger>
            <TooltipContent>
              Save Changes <Kbd>S</Kbd>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      title: "Disabled button",
      description: "Wrap disabled control in a span trigger.",
      code: `<TooltipTrigger render={<span className="inline-block" />}>
  <Button disabled>Disabled</Button>
</TooltipTrigger>`,
      render: () => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={<span className="inline-block w-fit" />}>
              <Button variant="outline" disabled>
                Disabled
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>This feature is currently unavailable</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
  ],
}
