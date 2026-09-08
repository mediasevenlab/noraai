import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"

import type { ComponentDoc } from "./types"

const w = "w-full max-w-[320px]"

export const textareaDoc: ComponentDoc = {
  id: "textarea",
  examples: [
    {
      title: "Basic",
      description: "Nora flat textarea — input-bg, focus glow.",
      code: `import { Textarea } from "@/components/ui/textarea"

<Textarea placeholder="Type your message here." />`,
      render: () => (
        <Textarea
          placeholder="Type your message here."
          className={w}
        />
      ),
    },
    {
      title: "With label",
      description: "Field label + description.",
      code: `<Field>
  <FieldLabel htmlFor="bio">Bio</FieldLabel>
  <FieldDescription>Tell us about yourself</FieldDescription>
  <Textarea id="bio" />
</Field>`,
      render: () => (
        <Field className={w}>
          <FieldLabel htmlFor="bio">Bio</FieldLabel>
          <FieldDescription>Tell us about yourself</FieldDescription>
          <Textarea id="bio" placeholder="Writer, designer, …" />
        </Field>
      ),
    },
    {
      title: "Disabled & invalid",
      description: "Disabled opacity and error inset ring.",
      code: `<Textarea disabled />
<Textarea aria-invalid />`,
      render: () => (
        <div className={`flex ${w} flex-col gap-3`}>
          <Textarea disabled defaultValue="Disabled" />
          <Field data-invalid>
            <Textarea aria-invalid defaultValue="Too short" />
            <FieldError>Too short</FieldError>
          </Field>
        </div>
      ),
    },
    {
      title: "Fixed rows",
      description: "rows prop — no auto-grow.",
      code: `<Textarea rows={4} className="field-sizing-fixed" />`,
      render: () => (
        <Textarea
          rows={4}
          placeholder="Fixed height — 4 rows."
          className={`${w} field-sizing-fixed resize-none`}
        />
      ),
    },
    {
      title: "With counter",
      description: "Character count under the field.",
      code: `<Textarea maxLength={120} />
<p>24 / 120</p>`,
      render: () => (
        <Field className={w}>
          <FieldLabel htmlFor="note">Note</FieldLabel>
          <Textarea
            id="note"
            defaultValue="Ship the Nora panel polish."
            maxLength={120}
          />
          <p className="text-right text-[11px] font-medium text-[var(--nora-text-tertiary)]">
            28 / 120
          </p>
        </Field>
      ),
    },
  ],
}
