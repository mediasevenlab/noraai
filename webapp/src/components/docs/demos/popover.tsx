import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"

import type { ComponentDoc } from "./types"

function PopoverBasic() {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        Open popover
      </PopoverTrigger>
      <PopoverContent className="w-[240px]">
        <PopoverHeader>
          <PopoverTitle>Dimensions</PopoverTitle>
          <PopoverDescription>
            Set the dimensions for the layer.
          </PopoverDescription>
        </PopoverHeader>
        <div className="grid gap-1.5">
          <div className="grid grid-cols-[52px_1fr] items-center gap-2">
            <Label htmlFor="popover-width">Width</Label>
            <Input id="popover-width" defaultValue="100%" />
          </div>
          <div className="grid grid-cols-[52px_1fr] items-center gap-2">
            <Label htmlFor="popover-height">Height</Label>
            <Input id="popover-height" defaultValue="25px" />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function PopoverSides() {
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <Popover key={side}>
          <PopoverTrigger render={<Button variant="outline" size="sm" />}>
            {side}
          </PopoverTrigger>
          <PopoverContent side={side} className="w-40">
            <p className="text-xs font-medium text-[var(--nora-text)]">
              On the {side}
            </p>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  )
}

function PopoverAlign() {
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {(["start", "center", "end"] as const).map((align) => (
        <Popover key={align}>
          <PopoverTrigger render={<Button variant="outline" size="sm" />}>
            {align}
          </PopoverTrigger>
          <PopoverContent align={align} className="w-40">
            <p className="text-xs font-medium text-[var(--nora-text)]">
              Align {align}
            </p>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  )
}

function PopoverWithClose() {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        With close
      </PopoverTrigger>
      <PopoverContent className="w-[220px]">
        <PopoverHeader>
          <PopoverTitle>Confirm action</PopoverTitle>
          <PopoverDescription>
            This will update the selected layer.
          </PopoverDescription>
        </PopoverHeader>
        <div className="flex justify-end gap-1.5">
          <PopoverClose render={<Button variant="outline" size="sm" />}>
            Cancel
          </PopoverClose>
          <PopoverClose render={<Button size="sm" />}>Apply</PopoverClose>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export const popoverDoc: ComponentDoc = {
  id: "popover",
  examples: [
    {
      title: "Basic",
      description: "Nora popover — solid surface, form fields.",
      code: `<Popover>
  <PopoverTrigger render={<Button variant="outline" />}>
    Open popover
  </PopoverTrigger>
  <PopoverContent>
    <PopoverHeader>
      <PopoverTitle>Dimensions</PopoverTitle>
    </PopoverHeader>
  </PopoverContent>
</Popover>`,
      render: () => <PopoverBasic />,
    },
    {
      title: "Sides",
      description: "Position on top / right / bottom / left.",
      code: `<PopoverContent side="top">…</PopoverContent>`,
      render: () => <PopoverSides />,
    },
    {
      title: "Align",
      description: "start / center / end alignment.",
      code: `<PopoverContent align="start">…</PopoverContent>`,
      render: () => <PopoverAlign />,
    },
    {
      title: "With close",
      description: "PopoverClose actions in the footer.",
      code: `<PopoverClose render={<Button size="sm" />}>Apply</PopoverClose>`,
      render: () => <PopoverWithClose />,
    },
  ],
}
