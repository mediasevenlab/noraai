import { BoldIcon, ItalicIcon, UnderlineIcon } from "@/components/icons"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

import type { ComponentDoc } from "./types"

export const toggleGroupDoc: ComponentDoc = {
  id: "toggle-group",
  examples: [
    {
      title: "Multiple",
      description: "Multi-select — Nora toolbar icons.",
      code: `import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

<ToggleGroup multiple defaultValue={["bold"]} variant="outline">
  <ToggleGroupItem value="bold" aria-label="Bold">
    <BoldIcon />
  </ToggleGroupItem>
  …
</ToggleGroup>`,
      render: () => (
        <ToggleGroup multiple defaultValue={["bold"]} variant="outline">
          <ToggleGroupItem value="bold" aria-label="Bold">
            <BoldIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="italic" aria-label="Italic">
            <ItalicIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="underline" aria-label="Underline">
            <UnderlineIcon />
          </ToggleGroupItem>
        </ToggleGroup>
      ),
    },
    {
      title: "Single",
      description: "Single selection with labels.",
      code: `<ToggleGroup defaultValue={["center"]} variant="outline">…</ToggleGroup>`,
      render: () => (
        <ToggleGroup defaultValue={["center"]} variant="outline">
          <ToggleGroupItem value="left">Left</ToggleGroupItem>
          <ToggleGroupItem value="center">Center</ToggleGroupItem>
          <ToggleGroupItem value="right">Right</ToggleGroupItem>
        </ToggleGroup>
      ),
    },
    {
      title: "Connected",
      description: "spacing={0} — segment track like Tabs.",
      code: `<ToggleGroup spacing={0} variant="outline" defaultValue={["all"]}>
  <ToggleGroupItem value="all">All</ToggleGroupItem>
  <ToggleGroupItem value="missed">Missed</ToggleGroupItem>
</ToggleGroup>`,
      render: () => (
        <ToggleGroup
          spacing={0}
          variant="outline"
          defaultValue={["all"]}
        >
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          <ToggleGroupItem value="missed">Missed</ToggleGroupItem>
          <ToggleGroupItem value="archived">Archived</ToggleGroupItem>
        </ToggleGroup>
      ),
    },
    {
      title: "Sizes",
      description: "sm and default outline groups.",
      code: `<ToggleGroup size="sm" variant="outline">…</ToggleGroup>`,
      render: () => (
        <div className="flex flex-col items-start gap-3">
          <ToggleGroup size="sm" defaultValue={["left"]} variant="outline">
            <ToggleGroupItem value="left">Left</ToggleGroupItem>
            <ToggleGroupItem value="center">Center</ToggleGroupItem>
            <ToggleGroupItem value="right">Right</ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup defaultValue={["left"]} variant="outline">
            <ToggleGroupItem value="left">Left</ToggleGroupItem>
            <ToggleGroupItem value="center">Center</ToggleGroupItem>
            <ToggleGroupItem value="right">Right</ToggleGroupItem>
          </ToggleGroup>
        </div>
      ),
    },
    {
      title: "Vertical",
      description: "Vertical orientation.",
      code: `<ToggleGroup orientation="vertical" multiple>…</ToggleGroup>`,
      render: () => (
        <ToggleGroup
          multiple
          orientation="vertical"
          spacing={1}
          defaultValue={["bold"]}
          variant="outline"
        >
          <ToggleGroupItem value="bold" aria-label="Bold">
            <BoldIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="italic" aria-label="Italic">
            <ItalicIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="underline" aria-label="Underline">
            <UnderlineIcon />
          </ToggleGroupItem>
        </ToggleGroup>
      ),
    },
    {
      title: "Disabled",
      description: "Whole group disabled.",
      code: `<ToggleGroup disabled>…</ToggleGroup>`,
      render: () => (
        <ToggleGroup disabled variant="outline" defaultValue={["bold"]}>
          <ToggleGroupItem value="bold" aria-label="Bold">
            <BoldIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="italic" aria-label="Italic">
            <ItalicIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="underline" aria-label="Underline">
            <UnderlineIcon />
          </ToggleGroupItem>
        </ToggleGroup>
      ),
    },
  ],
}
