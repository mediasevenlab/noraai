import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

import type { ComponentDoc } from "./types"

/** Basic — во Nora; здесь disabled / invalid */
export const checkboxDoc: ComponentDoc = {
  id: "checkbox",
  examples: [
    {
      title: "Disabled & invalid",
      description: "Disabled and aria-invalid states.",
      code: `<Checkbox disabled />
<Checkbox aria-invalid />`,
      render: () => (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Checkbox id="disabled" disabled />
            <Label htmlFor="disabled">Disabled</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="invalid" aria-invalid />
            <Label htmlFor="invalid">Invalid</Label>
          </div>
        </div>
      ),
    },
  ],
}
