import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

import type { ComponentDoc } from "./types"

export const switchDoc: ComponentDoc = {
  id: "switch",
  examples: [
    {
      title: "Sizes",
      description: "default (26×16) and sm.",
      code: `<Switch defaultChecked />
<Switch size="sm" defaultChecked />
<Switch size="sm" />`,
      render: () => (
        <div className="flex items-center gap-4">
          <Switch defaultChecked />
          <Switch size="sm" defaultChecked />
          <Switch size="sm" />
        </div>
      ),
    },
    {
      title: "Disabled",
      description: "Disabled on and off.",
      code: `<Switch disabled />
<Switch disabled defaultChecked />`,
      render: () => (
        <div className="flex items-center gap-4">
          <Switch disabled />
          <Switch disabled defaultChecked />
        </div>
      ),
    },
    {
      title: "Form row",
      description: "Label + hint row like a settings panel.",
      code: `<div className="flex items-center justify-between gap-4">
  <div>
    <Label htmlFor="notify">Notifications</Label>
    <p className="text-[11px] text-muted-foreground">Email digests</p>
  </div>
  <Switch id="notify" defaultChecked />
</div>`,
      render: () => (
        <div className="flex w-full max-w-[280px] items-center justify-between gap-4">
          <div className="min-w-0">
            <Label htmlFor="notify">Notifications</Label>
            <p className="mt-0.5 text-[11px] font-medium text-[var(--nora-text-tertiary)]">
              Email digests
            </p>
          </div>
          <Switch id="notify" defaultChecked />
        </div>
      ),
    },
  ],
}
