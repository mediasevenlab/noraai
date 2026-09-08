import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import type { ComponentDoc } from "./types"

export const kbdDoc: ComponentDoc = {
  id: "kbd",
  examples: [
    {
      title: "Group",
      description: "Grouped shortcut keys.",
      code: `<KbdGroup>
  <Kbd>Ctrl</Kbd>
  <Kbd>Shift</Kbd>
  <Kbd>P</Kbd>
</KbdGroup>`,
      render: () => (
        <KbdGroup>
          <Kbd>Ctrl</Kbd>
          <Kbd>Shift</Kbd>
          <Kbd>P</Kbd>
        </KbdGroup>
      ),
    },
    {
      title: "Button",
      description: "Shortcut affixed to a control.",
      code: `<Button variant="outline" size="sm">
  Save <Kbd>S</Kbd>
</Button>`,
      render: () => (
        <Button variant="outline" size="sm" className="gap-1.5">
          Save
          <Kbd>S</Kbd>
        </Button>
      ),
    },
    {
      title: "Input group",
      description: "Kbd inside an input addon.",
      code: `<InputGroup>
  <InputGroupInput placeholder="Search…" />
  <InputGroupAddon align="inline-end">
    <Kbd>⌘</Kbd><Kbd>K</Kbd>
  </InputGroupAddon>
</InputGroup>`,
      render: () => (
        <InputGroup className="w-[240px]">
          <InputGroupInput placeholder="Search…" />
          <InputGroupAddon align="inline-end">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </InputGroupAddon>
        </InputGroup>
      ),
    },
    {
      title: "Tooltip",
      description: "On-tint kbd inside tooltip content.",
      code: `<TooltipContent>
  Add to library <Kbd>S</Kbd>
</TooltipContent>`,
      render: () => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={<Button variant="outline" size="sm" />}>
              Hover
            </TooltipTrigger>
            <TooltipContent>
              Add to library <Kbd>S</Kbd>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
  ],
}
