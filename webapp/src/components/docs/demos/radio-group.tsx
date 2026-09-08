import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import type { ComponentDoc } from "./types"

function RadioBasic() {
  return (
    <RadioGroup defaultValue="comfortable" className="w-[200px] gap-2">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="default" id="rg-default" />
        <Label htmlFor="rg-default">Default</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="comfortable" id="rg-comfortable" />
        <Label htmlFor="rg-comfortable">Comfortable</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="compact" id="rg-compact" />
        <Label htmlFor="rg-compact">Compact</Label>
      </div>
    </RadioGroup>
  )
}

function RadioDisabled() {
  return (
    <RadioGroup defaultValue="a" className="w-[200px] gap-2">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="a" id="rg-enabled" />
        <Label htmlFor="rg-enabled">Enabled</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="b" id="rg-disabled" disabled />
        <Label htmlFor="rg-disabled">Disabled</Label>
      </div>
    </RadioGroup>
  )
}

function RadioHorizontal() {
  return (
    <RadioGroup
      defaultValue="card"
      className="flex w-fit flex-row flex-wrap items-center gap-3"
    >
      <div className="flex items-center gap-2">
        <RadioGroupItem value="card" id="rg-card" />
        <Label htmlFor="rg-card">Card</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="paypal" id="rg-paypal" />
        <Label htmlFor="rg-paypal">PayPal</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="apple" id="rg-apple" />
        <Label htmlFor="rg-apple">Apple</Label>
      </div>
    </RadioGroup>
  )
}

function RadioChoiceCards() {
  return (
    <RadioGroup defaultValue="kubernetes" className="w-[260px] gap-1.5">
      <FieldLabel htmlFor="rg-k8s">
        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Kubernetes</FieldTitle>
            <FieldDescription>
              Run GPU workloads on a K8s cluster.
            </FieldDescription>
          </FieldContent>
          <RadioGroupItem value="kubernetes" id="rg-k8s" />
        </Field>
      </FieldLabel>
      <FieldLabel htmlFor="rg-vm">
        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Virtual Machine</FieldTitle>
            <FieldDescription>
              Access a cluster to run GPU workloads.
            </FieldDescription>
          </FieldContent>
          <RadioGroupItem value="vm" id="rg-vm" />
        </Field>
      </FieldLabel>
    </RadioGroup>
  )
}

export const radioGroupDoc: ComponentDoc = {
  id: "radio-group",
  examples: [
    {
      title: "Basic",
      description: "Nora tint radio — dense single-select.",
      code: `<RadioGroup defaultValue="comfortable">
  <div className="flex items-center gap-2">
    <RadioGroupItem value="comfortable" id="r2" />
    <Label htmlFor="r2">Comfortable</Label>
  </div>
</RadioGroup>`,
      render: () => <RadioBasic />,
    },
    {
      title: "Disabled",
      description: "Disabled option.",
      code: `<RadioGroupItem value="x" disabled />`,
      render: () => <RadioDisabled />,
    },
    {
      title: "Horizontal",
      description: "Inline radio row.",
      code: `<RadioGroup className="flex flex-row gap-3">…</RadioGroup>`,
      render: () => <RadioHorizontal />,
    },
    {
      title: "Choice cards",
      description: "Field choice-card pattern around radios.",
      code: `<FieldLabel>
  <Field orientation="horizontal">
    <FieldContent>…</FieldContent>
    <RadioGroupItem value="kubernetes" />
  </Field>
</FieldLabel>`,
      render: () => <RadioChoiceCards />,
    },
  ],
}
