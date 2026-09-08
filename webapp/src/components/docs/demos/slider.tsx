import { Field, FieldLabel } from "@/components/ui/field"
import { Slider } from "@/components/ui/slider"

import type { ComponentDoc } from "./types"

const w = "w-full max-w-[240px]"

export const sliderDoc: ComponentDoc = {
  id: "slider",
  examples: [
    {
      title: "Range",
      description: "Two thumbs for a range.",
      code: `<Slider defaultValue={[25, 75]} />`,
      render: () => (
        <Slider
          defaultValue={[25, 75]}
          max={100}
          step={1}
          className={w}
        />
      ),
    },
    {
      title: "With label",
      description: "Field label above the control.",
      code: `<Field>
  <FieldLabel>Volume</FieldLabel>
  <Slider defaultValue={[60]} />
</Field>`,
      render: () => (
        <Field className={w}>
          <FieldLabel>Volume</FieldLabel>
          <Slider defaultValue={[60]} max={100} step={1} />
        </Field>
      ),
    },
    {
      title: "Disabled",
      description: "Disabled slider state.",
      code: `<Slider disabled defaultValue={[40]} />`,
      render: () => (
        <Slider disabled defaultValue={[40]} max={100} className={w} />
      ),
    },
  ],
}
