import * as React from "react"
import { REGEXP_ONLY_DIGITS, REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp"
import { RefreshCwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"

import type { ComponentDoc } from "./types"

function InputOTPBasic() {
  return (
    <InputOTP maxLength={6}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  )
}

function InputOTPSeparatorDemo() {
  return (
    <InputOTP maxLength={6}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  )
}

function InputOTPPatternDemo() {
  return (
    <Field className="w-fit">
      <FieldLabel htmlFor="otp-digits">Digits only</FieldLabel>
      <InputOTP
        id="otp-digits"
        maxLength={6}
        pattern={REGEXP_ONLY_DIGITS}
      >
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
    </Field>
  )
}

function InputOTPControlledDemo() {
  const [value, setValue] = React.useState("")

  return (
    <div className="flex flex-col items-center gap-2">
      <InputOTP maxLength={6} value={value} onChange={setValue}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
      <p className="text-xs font-medium text-[var(--nora-text-tertiary)]">
        {value === "" ? "Enter your one-time password." : `You entered: ${value}`}
      </p>
    </div>
  )
}

function InputOTPDisabledDemo() {
  return (
    <InputOTP maxLength={6} disabled value="123456">
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  )
}

function InputOTPInvalidDemo() {
  const [value, setValue] = React.useState("000000")

  return (
    <InputOTP maxLength={6} value={value} onChange={setValue}>
      <InputOTPGroup>
        <InputOTPSlot index={0} aria-invalid />
        <InputOTPSlot index={1} aria-invalid />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={2} aria-invalid />
        <InputOTPSlot index={3} aria-invalid />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={4} aria-invalid />
        <InputOTPSlot index={5} aria-invalid />
      </InputOTPGroup>
    </InputOTP>
  )
}

function InputOTPFourDigitsDemo() {
  return (
    <InputOTP maxLength={4} pattern={REGEXP_ONLY_DIGITS}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
      </InputOTPGroup>
    </InputOTP>
  )
}

function InputOTPAlphanumericDemo() {
  return (
    <InputOTP maxLength={6} pattern={REGEXP_ONLY_DIGITS_AND_CHARS}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  )
}

function InputOTPFormDemo() {
  return (
    <form
      className="w-[280px]"
      onSubmit={(e) => e.preventDefault()}
    >
      <FieldGroup>
        <Field>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel htmlFor="otp-verify">Verification code</FieldLabel>
            <Button type="button" variant="outline" size="xs">
              <RefreshCwIcon />
              Resend
            </Button>
          </div>
          <InputOTP id="otp-verify" maxLength={6} required>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
          <FieldDescription>
            Enter the 6-digit code sent to your email.
          </FieldDescription>
        </Field>
        <Field orientation="horizontal" className="gap-2">
          <Button type="button" variant="outline" size="sm">
            Cancel
          </Button>
          <Button type="submit" size="sm">
            Verify
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}

export const inputOtpDoc: ComponentDoc = {
  id: "input-otp",
  examples: [
    {
      title: "Basic",
      description: "6-digit OTP — Nora flat slots, focus glow.",
      code: `<InputOTP maxLength={6}>
  <InputOTPGroup>
    <InputOTPSlot index={0} />
    …
  </InputOTPGroup>
</InputOTP>`,
      render: () => <InputOTPBasic />,
    },
    {
      title: "Separator",
      description: "Grouped slots with a dash separator.",
      code: `<InputOTP maxLength={6}>
  <InputOTPGroup>…</InputOTPGroup>
  <InputOTPSeparator />
  <InputOTPGroup>…</InputOTPGroup>
</InputOTP>`,
      render: () => <InputOTPSeparatorDemo />,
    },
    {
      title: "Pattern",
      description: "Digits-only via REGEXP_ONLY_DIGITS.",
      code: `<InputOTP maxLength={6} pattern={REGEXP_ONLY_DIGITS}>
  …
</InputOTP>`,
      render: () => <InputOTPPatternDemo />,
    },
    {
      title: "Controlled",
      description: "value + onChange.",
      code: `const [value, setValue] = useState("")
<InputOTP value={value} onChange={setValue} maxLength={6}>…</InputOTP>`,
      render: () => <InputOTPControlledDemo />,
    },
    {
      title: "Disabled",
      description: "Disabled state.",
      code: `<InputOTP disabled value="123456" maxLength={6}>…</InputOTP>`,
      render: () => <InputOTPDisabledDemo />,
    },
    {
      title: "Invalid",
      description: "aria-invalid → nora-error inset ring.",
      code: `<InputOTPSlot index={0} aria-invalid />`,
      render: () => <InputOTPInvalidDemo />,
    },
    {
      title: "Four digits",
      description: "PIN-style 4-digit input.",
      code: `<InputOTP maxLength={4} pattern={REGEXP_ONLY_DIGITS}>…</InputOTP>`,
      render: () => <InputOTPFourDigitsDemo />,
    },
    {
      title: "Alphanumeric",
      description: "Digits and letters.",
      code: `<InputOTP pattern={REGEXP_ONLY_DIGITS_AND_CHARS} maxLength={6}>…</InputOTP>`,
      render: () => <InputOTPAlphanumericDemo />,
    },
    {
      title: "Form",
      description: "Field + resend + verify actions.",
      code: `<Field>
  <FieldLabel>Verification code</FieldLabel>
  <InputOTP maxLength={6}>…</InputOTP>
</Field>`,
      render: () => <InputOTPFormDemo />,
    },
  ],
}
