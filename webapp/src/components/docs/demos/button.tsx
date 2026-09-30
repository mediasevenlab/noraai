import { Loader2Icon, MailIcon } from "@/components/icons"

import { Button } from "@/components/ui/button"

import type { ComponentDoc } from "./types"

export const buttonDoc: ComponentDoc = {
  id: "button",
  examples: [
    {
      title: "Variants",
      description: "All button variants available in the design system.",
      code: `import { Button } from "@/components/ui/button"

export function ButtonVariants() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="default">Default</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="link">Link</Button>
    </div>
  )
}`,
      render: () => (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="default">Default</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </div>
      ),
    },
    {
      title: "Sizes",
      description: "Default, xs, sm, lg, and icon size tokens.",
      code: `import { Button } from "@/components/ui/button"
import { MailIcon } from "@/components/icons"

export function ButtonSizes() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="xs">Extra small</Button>
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" aria-label="Mail">
        <MailIcon />
      </Button>
      <Button size="icon-xs" aria-label="Mail">
        <MailIcon />
      </Button>
      <Button size="icon-sm" aria-label="Mail">
        <MailIcon />
      </Button>
      <Button size="icon-lg" aria-label="Mail">
        <MailIcon />
      </Button>
    </div>
  )
}`,
      render: () => (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button size="xs">Extra small</Button>
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Mail">
            <MailIcon />
          </Button>
          <Button size="icon-xs" aria-label="Mail">
            <MailIcon />
          </Button>
          <Button size="icon-sm" aria-label="Mail">
            <MailIcon />
          </Button>
          <Button size="icon-lg" aria-label="Mail">
            <MailIcon />
          </Button>
        </div>
      ),
    },
    {
      title: "With icon",
      description: "Buttons with leading or trailing icons.",
      code: `import { Button } from "@/components/ui/button"
import { MailIcon } from "@/components/icons"

export function ButtonWithIcon() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button>
        <MailIcon data-icon="inline-start" />
        Login with Email
      </Button>
      <Button variant="outline">
        Continue
        <MailIcon data-icon="inline-end" />
      </Button>
    </div>
  )
}`,
      render: () => (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button>
            <MailIcon data-icon="inline-start" />
            Login with Email
          </Button>
          <Button variant="outline">
            Continue
            <MailIcon data-icon="inline-end" />
          </Button>
        </div>
      ),
    },
    {
      title: "Disabled & loading",
      description: "Disabled state and a loading pattern.",
      code: `import { Button } from "@/components/ui/button"
import { Loader2Icon } from "@/components/icons"

export function ButtonStates() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button disabled>Disabled</Button>
      <Button disabled>
        <Loader2Icon className="animate-spin" data-icon="inline-start" />
        Please wait
      </Button>
    </div>
  )
}`,
      render: () => (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button disabled>Disabled</Button>
          <Button disabled>
            <Loader2Icon className="animate-spin" data-icon="inline-start" />
            Please wait
          </Button>
        </div>
      ),
    },
  ],
}
