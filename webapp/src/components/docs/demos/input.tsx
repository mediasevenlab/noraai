import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import type { ComponentDoc } from "./types"

const w = "w-[220px]"

export const inputDoc: ComponentDoc = {
  id: "input",
  examples: [
    {
      title: "With label",
      description: "Label + input (Field pattern).",
      code: `<Field className="w-[220px]">
  <FieldLabel htmlFor="email">Email</FieldLabel>
  <Input id="email" type="email" placeholder="name@example.com" />
</Field>`,
      render: () => (
        <Field className={w}>
          <FieldLabel htmlFor="input-email">Email</FieldLabel>
          <Input
            id="input-email"
            type="email"
            placeholder="name@example.com"
          />
        </Field>
      ),
    },
    {
      title: "With button",
      description: "Input + action in a row.",
      code: `<div className="flex w-[280px] gap-2">
  <Input type="email" placeholder="Email" />
  <Button size="sm">Subscribe</Button>
</div>`,
      render: () => (
        <div className="flex w-[280px] items-center gap-2">
          <Input type="email" placeholder="Email" className="min-w-0 flex-1" />
          <Button type="button" size="sm">
            Subscribe
          </Button>
        </div>
      ),
    },
    {
      title: "File",
      description: "File picker — Nora file chip styling.",
      code: `<Input type="file" className="w-[220px]" />`,
      render: () => <Input type="file" className={w} />,
    },
    {
      title: "Disabled",
      description: "Disabled state.",
      code: `<Input disabled placeholder="Disabled" />`,
      render: () => (
        <Input disabled placeholder="Disabled" className={w} />
      ),
    },
    {
      title: "Form",
      description: "FieldGroup form with submit actions.",
      code: `<form>
  <FieldGroup>
    <Field>
      <FieldLabel htmlFor="name">Name</FieldLabel>
      <Input id="name" />
    </Field>
    …
  </FieldGroup>
</form>`,
      render: () => (
        <form className="w-[280px]" onSubmit={(e) => e.preventDefault()}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="form-name">Name</FieldLabel>
              <Input id="form-name" placeholder="Evil Rabbit" />
            </Field>
            <Field>
              <FieldLabel htmlFor="form-email">Email</FieldLabel>
              <Input
                id="form-email"
                type="email"
                placeholder="name@example.com"
              />
              <FieldDescription>
                We never share your email.
              </FieldDescription>
            </Field>
            <Field orientation="horizontal" className="gap-2">
              <Button type="button" variant="outline" size="sm">
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Submit
              </Button>
            </Field>
          </FieldGroup>
        </form>
      ),
    },
  ],
}
