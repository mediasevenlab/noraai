import * as React from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

import type { ComponentDoc } from "./types"

const w = "w-[280px]"
const wSm = "w-[240px]"

function FieldPayment() {
  return (
    <form className={w} onSubmit={(e) => e.preventDefault()}>
      <FieldGroup>
        <FieldSet>
          <FieldLegend>Payment Method</FieldLegend>
          <FieldDescription>
            All transactions are secure and encrypted.
          </FieldDescription>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="card-name">Name on Card</FieldLabel>
              <Input id="card-name" placeholder="Evil Rabbit" />
            </Field>
            <Field>
              <FieldLabel htmlFor="card-number">Card Number</FieldLabel>
              <Input id="card-number" placeholder="1234 5678 9012 3456" />
              <FieldDescription>
                Enter your 16-digit card number.
              </FieldDescription>
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field>
                <FieldLabel>Month</FieldLabel>
                <Select>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="MM" />
                  </SelectTrigger>
                  <SelectContent>
                    {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map(
                      (m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Year</FieldLabel>
                <Select>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="YYYY" />
                  </SelectTrigger>
                  <SelectContent>
                    {["2026", "2027", "2028", "2029", "2030"].map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="cvv">CVV</FieldLabel>
                <Input id="cvv" placeholder="123" />
              </Field>
            </div>
          </FieldGroup>
        </FieldSet>
        <FieldSeparator />
        <FieldSet>
          <FieldLegend>Billing Address</FieldLegend>
          <FieldDescription>
            The billing address associated with your payment method.
          </FieldDescription>
          <FieldGroup>
            <Field orientation="horizontal">
              <Checkbox id="same-shipping" defaultChecked />
              <FieldLabel htmlFor="same-shipping" className="font-normal">
                Same as shipping address
              </FieldLabel>
            </Field>
          </FieldGroup>
        </FieldSet>
        <FieldSet>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="comments">Comments</FieldLabel>
              <Textarea
                id="comments"
                placeholder="Add any additional comments"
                className="min-h-[64px] resize-none"
              />
            </Field>
          </FieldGroup>
        </FieldSet>
        <Field orientation="horizontal" className="gap-2">
          <Button type="submit" size="sm">
            Submit
          </Button>
          <Button type="button" variant="outline" size="sm">
            Cancel
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}

function FieldInputDemo() {
  return (
    <FieldSet className={wSm}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="username">Username</FieldLabel>
          <Input id="username" placeholder="Max Leiter" />
          <FieldDescription>
            Choose a unique username for your account.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <FieldDescription>Must be at least 8 characters long.</FieldDescription>
          <Input id="password" type="password" placeholder="••••••••" />
        </Field>
      </FieldGroup>
    </FieldSet>
  )
}

function FieldTextareaDemo() {
  return (
    <FieldSet className={wSm}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="feedback">Feedback</FieldLabel>
          <Textarea
            id="feedback"
            placeholder="Your feedback helps us improve…"
            rows={4}
            className="resize-none"
          />
          <FieldDescription>
            Share your thoughts about our service.
          </FieldDescription>
        </Field>
      </FieldGroup>
    </FieldSet>
  )
}

function FieldSelectDemo() {
  return (
    <Field className={wSm}>
      <FieldLabel>Department</FieldLabel>
      <Select>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose department" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="engineering">Engineering</SelectItem>
          <SelectItem value="design">Design</SelectItem>
          <SelectItem value="marketing">Marketing</SelectItem>
          <SelectItem value="sales">Sales</SelectItem>
          <SelectItem value="support">Customer Support</SelectItem>
          <SelectItem value="hr">Human Resources</SelectItem>
        </SelectContent>
      </Select>
      <FieldDescription>
        Select your department or area of work.
      </FieldDescription>
    </Field>
  )
}

function FieldSliderDemo() {
  const [value, setValue] = React.useState([200, 800])

  return (
    <Field className={wSm}>
      <FieldTitle>Price Range</FieldTitle>
      <FieldDescription>
        Set your budget range ($
        <span className="font-semibold tabular-nums text-[var(--nora-text)]">
          {value[0]}
        </span>
        {" – "}
        <span className="font-semibold tabular-nums text-[var(--nora-text)]">
          {value[1]}
        </span>
        ).
      </FieldDescription>
      <Slider
        value={value}
        onValueChange={(next) => setValue(next as number[])}
        max={1000}
        min={0}
        step={10}
        className="mt-1 w-full"
        aria-label="Price Range"
      />
    </Field>
  )
}

function FieldAddressDemo() {
  return (
    <FieldSet className={w}>
      <FieldLegend>Address Information</FieldLegend>
      <FieldDescription>
        We need your address to deliver your order.
      </FieldDescription>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="street">Street Address</FieldLabel>
          <Input id="street" placeholder="123 Main St" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field>
            <FieldLabel htmlFor="city">City</FieldLabel>
            <Input id="city" placeholder="New York" />
          </Field>
          <Field>
            <FieldLabel htmlFor="zip">Postal Code</FieldLabel>
            <Input id="zip" placeholder="90502" />
          </Field>
        </div>
      </FieldGroup>
    </FieldSet>
  )
}

function FieldCheckboxDemo() {
  return (
    <FieldGroup className={wSm}>
      <FieldSet>
        <FieldLegend variant="label">
          Show these items on the desktop
        </FieldLegend>
        <FieldDescription>
          Select the items you want to show on the desktop.
        </FieldDescription>
        <FieldGroup data-slot="checkbox-group">
          {(
            [
              ["hard", "Hard disks", true],
              ["external", "External disks", false],
              ["optical", "CDs, DVDs, and iPods", false],
              ["servers", "Connected servers", false],
            ] as const
          ).map(([id, label, checked]) => (
            <Field key={id} orientation="horizontal">
              <Checkbox id={`desk-${id}`} defaultChecked={checked} />
              <FieldLabel htmlFor={`desk-${id}`} className="font-normal">
                {label}
              </FieldLabel>
            </Field>
          ))}
        </FieldGroup>
      </FieldSet>
      <FieldSeparator />
      <Field orientation="horizontal">
        <Checkbox id="sync-folders" defaultChecked />
        <FieldContent>
          <FieldLabel htmlFor="sync-folders">
            Sync Desktop & Documents folders
          </FieldLabel>
          <FieldDescription>
            Your Desktop & Documents folders are being synced with iCloud Drive.
          </FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
  )
}

function FieldRadioDemo() {
  return (
    <FieldSet className={wSm}>
      <FieldLegend variant="label">Subscription Plan</FieldLegend>
      <FieldDescription>
        Yearly and lifetime plans offer significant savings.
      </FieldDescription>
      <RadioGroup defaultValue="monthly" className="mt-2.5 gap-2">
        <Field orientation="horizontal">
          <RadioGroupItem value="monthly" id="plan-monthly" />
          <FieldLabel htmlFor="plan-monthly" className="font-normal">
            Monthly ($9.99/month)
          </FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <RadioGroupItem value="yearly" id="plan-yearly" />
          <FieldLabel htmlFor="plan-yearly" className="font-normal">
            Yearly ($99.99/year)
          </FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <RadioGroupItem value="lifetime" id="plan-lifetime" />
          <FieldLabel htmlFor="plan-lifetime" className="font-normal">
            Lifetime ($299.99)
          </FieldLabel>
        </Field>
      </RadioGroup>
    </FieldSet>
  )
}

function FieldSwitchDemo() {
  return (
    <Field orientation="horizontal" className="w-fit gap-3">
      <FieldLabel htmlFor="2fa" className="text-[var(--nora-text)]">
        Multi-factor authentication
      </FieldLabel>
      <Switch id="2fa" />
    </Field>
  )
}

function FieldChoiceCardDemo() {
  return (
    <FieldGroup className={wSm}>
      <FieldSet>
        <FieldLegend variant="label">Compute Environment</FieldLegend>
        <FieldDescription>
          Select the compute environment for your cluster.
        </FieldDescription>
        <RadioGroup defaultValue="kubernetes" className="mt-2.5 gap-2">
          <FieldLabel htmlFor="kubernetes">
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Kubernetes</FieldTitle>
                <FieldDescription>
                  Run GPU workloads on a K8s cluster.
                </FieldDescription>
              </FieldContent>
              <RadioGroupItem value="kubernetes" id="kubernetes" />
            </Field>
          </FieldLabel>
          <FieldLabel htmlFor="vm">
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Virtual Machine</FieldTitle>
                <FieldDescription>
                  Access a cluster to run GPU workloads.
                </FieldDescription>
              </FieldContent>
              <RadioGroupItem value="vm" id="vm" />
            </Field>
          </FieldLabel>
        </RadioGroup>
      </FieldSet>
    </FieldGroup>
  )
}

function FieldGroupDemo() {
  return (
    <FieldGroup className={wSm}>
      <FieldSet>
        <FieldLegend variant="label">Responses</FieldLegend>
        <FieldDescription>
          Get notified when ChatGPT responds to requests that take time.
        </FieldDescription>
        <FieldGroup data-slot="checkbox-group">
          <Field orientation="horizontal">
            <Checkbox id="push" defaultChecked disabled />
            <FieldLabel htmlFor="push" className="font-normal">
              Push notifications
            </FieldLabel>
          </Field>
        </FieldGroup>
      </FieldSet>
      <FieldSeparator />
      <FieldSet>
        <FieldLegend variant="label">Tasks</FieldLegend>
        <FieldDescription>
          Get notified when tasks you&apos;ve created have updates.{" "}
          <a href="#manage-tasks">Manage tasks</a>
        </FieldDescription>
        <FieldGroup data-slot="checkbox-group">
          <Field orientation="horizontal">
            <Checkbox id="push-tasks" />
            <FieldLabel htmlFor="push-tasks" className="font-normal">
              Push notifications
            </FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Checkbox id="email-tasks" />
            <FieldLabel htmlFor="email-tasks" className="font-normal">
              Email notifications
            </FieldLabel>
          </Field>
        </FieldGroup>
      </FieldSet>
    </FieldGroup>
  )
}

function FieldValidationDemo() {
  return (
    <div className={`flex ${wSm} flex-col gap-2.5`}>
      <Field data-invalid>
        <FieldLabel htmlFor="bad-email">Email</FieldLabel>
        <Input id="bad-email" type="email" aria-invalid defaultValue="" />
        <FieldError>Enter a valid email address.</FieldError>
      </Field>
      <Field data-invalid>
        <FieldLabel htmlFor="bad-user">Username</FieldLabel>
        <Input id="bad-user" aria-invalid defaultValue="admin" />
        <FieldError>Choose another username.</FieldError>
      </Field>
    </div>
  )
}

function FieldResponsiveDemo() {
  return (
    <form
      className="w-full max-w-[420px]"
      onSubmit={(e) => e.preventDefault()}
    >
      <FieldSet>
        <FieldLegend>Profile</FieldLegend>
        <FieldDescription>Fill in your profile information.</FieldDescription>
        <FieldGroup>
          <Field orientation="responsive">
            <FieldContent>
              <FieldLabel htmlFor="resp-name">Name</FieldLabel>
              <FieldDescription>
                Provide your full name for identification.
              </FieldDescription>
            </FieldContent>
            <Input id="resp-name" placeholder="Evil Rabbit" className="min-w-0" />
          </Field>
          <Field orientation="horizontal" className="gap-2">
            <Button type="submit" size="sm">
              Submit
            </Button>
            <Button type="button" variant="outline" size="sm">
              Cancel
            </Button>
          </Field>
        </FieldGroup>
      </FieldSet>
    </form>
  )
}

export const fieldDoc: ComponentDoc = {
  id: "field",
  examples: [
    {
      title: "Payment form",
      description: "Full Field composition — as on shadcn Field docs.",
      code: `// Payment Method + Billing + Comments — see FieldSet / FieldGroup`,
      render: () => <FieldPayment />,
    },
    {
      title: "Input",
      description: "Stacked inputs with descriptions.",
      code: `<Field>
  <FieldLabel htmlFor="username">Username</FieldLabel>
  <Input id="username" />
  <FieldDescription>…</FieldDescription>
</Field>`,
      render: () => <FieldInputDemo />,
    },
    {
      title: "Textarea",
      description: "Multiline control in a Field.",
      code: `<Field>
  <FieldLabel htmlFor="feedback">Feedback</FieldLabel>
  <Textarea id="feedback" />
</Field>`,
      render: () => <FieldTextareaDemo />,
    },
    {
      title: "Select",
      description: "Select inside Field with helper text.",
      code: `<Field>
  <FieldLabel>Department</FieldLabel>
  <Select>…</Select>
</Field>`,
      render: () => <FieldSelectDemo />,
    },
    {
      title: "Slider",
      description: "Range slider with live description values.",
      code: `<Field>
  <FieldTitle>Price Range</FieldTitle>
  <Slider value={…} />
</Field>`,
      render: () => <FieldSliderDemo />,
    },
    {
      title: "Fieldset",
      description: "Address group with 2-column row.",
      code: `<FieldSet>
  <FieldLegend>Address Information</FieldLegend>
  …
</FieldSet>`,
      render: () => <FieldAddressDemo />,
    },
    {
      title: "Checkbox",
      description: "Horizontal checkboxes + separator.",
      code: `<Field orientation="horizontal">
  <Checkbox />
  <FieldLabel>…</FieldLabel>
</Field>`,
      render: () => <FieldCheckboxDemo />,
    },
    {
      title: "Radio",
      description: "RadioGroup as Field rows.",
      code: `<RadioGroup>
  <Field orientation="horizontal">
    <RadioGroupItem />
    <FieldLabel>…</FieldLabel>
  </Field>
</RadioGroup>`,
      render: () => <FieldRadioDemo />,
    },
    {
      title: "Switch",
      description: "Horizontal label + switch.",
      code: `<Field orientation="horizontal">
  <FieldLabel htmlFor="2fa">Multi-factor authentication</FieldLabel>
  <Switch id="2fa" />
</Field>`,
      render: () => <FieldSwitchDemo />,
    },
    {
      title: "Choice card",
      description: "Selectable cards via FieldLabel wrapper.",
      code: `<FieldLabel htmlFor="…">
  <Field orientation="horizontal">
    <FieldContent>…</FieldContent>
    <RadioGroupItem />
  </Field>
</FieldLabel>`,
      render: () => <FieldChoiceCardDemo />,
    },
    {
      title: "Field group",
      description: "Sections divided by FieldSeparator.",
      code: `<FieldGroup>
  <FieldSet>…</FieldSet>
  <FieldSeparator />
  <FieldSet>…</FieldSet>
</FieldGroup>`,
      render: () => <FieldGroupDemo />,
    },
    {
      title: "Validation",
      description: "data-invalid + FieldError (nora-error).",
      code: `<Field data-invalid>
  <FieldError>Enter a valid email address.</FieldError>
</Field>`,
      render: () => <FieldValidationDemo />,
    },
    {
      title: "Responsive",
      description: "orientation=\"responsive\" — label beside control on wide.",
      code: `<Field orientation="responsive">
  <FieldContent>…</FieldContent>
  <Input />
</Field>`,
      render: () => <FieldResponsiveDemo />,
    },
  ],
}
