import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import type { ComponentDoc } from "./types"

const w = "w-[220px]"

export const labelDoc: ComponentDoc = {
  id: "label",
  examples: [
    {
      title: "Basic",
      description: "Nora secondary label above an input.",
      code: `import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

<div className="grid w-[220px] gap-1.5">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="Email" />
</div>`,
      render: () => (
        <div className={`grid ${w} gap-1.5`}>
          <Label htmlFor="label-email">Email</Label>
          <Input
            id="label-email"
            type="email"
            placeholder="name@example.com"
          />
        </div>
      ),
    },
    {
      title: "Disabled",
      description: "Label dims with a disabled control.",
      code: `<div className="group grid gap-1.5" data-disabled="true">
  <Label htmlFor="x">Disabled field</Label>
  <Input id="x" disabled />
</div>`,
      render: () => (
        <div className={`group grid ${w} gap-1.5`} data-disabled="true">
          <Label htmlFor="label-disabled">Disabled field</Label>
          <Input
            id="label-disabled"
            disabled
            defaultValue="Unavailable"
          />
        </div>
      ),
    },
    {
      title: "Checkbox",
      description: "Label paired with a checkbox control.",
      code: `<div className="flex items-center gap-2">
  <Checkbox id="terms" />
  <Label htmlFor="terms">Accept terms and conditions</Label>
</div>`,
      render: () => (
        <div className="flex items-center gap-2">
          <Checkbox id="label-terms" />
          <Label htmlFor="label-terms">Accept terms and conditions</Label>
        </div>
      ),
    },
    {
      title: "Required",
      description: "Required marker beside the label.",
      code: `<Label htmlFor="name">
  Name <span className="text-[var(--nora-error)]">*</span>
</Label>`,
      render: () => (
        <div className={`grid ${w} gap-1.5`}>
          <Label htmlFor="label-name">
            Name{" "}
            <span className="text-[var(--nora-error)]" aria-hidden>
              *
            </span>
          </Label>
          <Input id="label-name" placeholder="Evil Rabbit" required />
        </div>
      ),
    },
  ],
}
