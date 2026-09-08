import { Button } from "@/components/ui/button"
import {
  ButtonGroup,
  ButtonGroupSeparator,
} from "@/components/ui/button-group"

import type { ComponentDoc } from "./types"

export const buttonGroupDoc: ComponentDoc = {
  id: "button-group",
  examples: [
    {
      title: "Horizontal",
      description: "Grouped related buttons.",
      code: `import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"

export function ButtonGroupDemo() {
  return (
    <ButtonGroup>
      <Button variant="outline">Archive</Button>
      <Button variant="outline">Report</Button>
      <Button variant="outline">Snooze</Button>
    </ButtonGroup>
  )
}`,
      render: () => (
        <ButtonGroup>
          <Button variant="outline">Archive</Button>
          <Button variant="outline">Report</Button>
          <Button variant="outline">Snooze</Button>
        </ButtonGroup>
      ),
    },
    {
      title: "With separator",
      description: "Split groups with a separator.",
      code: `<ButtonGroup>
  <Button variant="outline">Save</Button>
  <ButtonGroupSeparator />
  <Button variant="outline">Cancel</Button>
</ButtonGroup>`,
      render: () => (
        <ButtonGroup>
          <Button variant="outline">Save</Button>
          <ButtonGroupSeparator />
          <Button variant="outline">Cancel</Button>
        </ButtonGroup>
      ),
    },
    {
      title: "Vertical",
      description: "Stacked button group.",
      code: `<ButtonGroup orientation="vertical">...</ButtonGroup>`,
      render: () => (
        <ButtonGroup orientation="vertical">
          <Button variant="outline">Top</Button>
          <Button variant="outline">Middle</Button>
          <Button variant="outline">Bottom</Button>
        </ButtonGroup>
      ),
    },
  ],
}
