import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import type { ComponentDoc } from "./types"

function DirectionDemo() {
  const [dir, setDir] = React.useState<"ltr" | "rtl">("ltr")

  return (
    <div className="w-full max-w-md space-y-3">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={dir === "ltr" ? "default" : "outline"}
          onClick={() => setDir("ltr")}
        >
          LTR
        </Button>
        <Button
          size="sm"
          variant={dir === "rtl" ? "default" : "outline"}
          onClick={() => setDir("rtl")}
        >
          RTL
        </Button>
      </div>
      <div dir={dir} className="space-y-2 rounded-lg border p-4">
        <Label htmlFor="name-dir">Name</Label>
        <Input id="name-dir" placeholder="Your name" defaultValue="أحمد" />
        <p className="text-sm text-muted-foreground">
          Direction is <strong>{dir.toUpperCase()}</strong>. Layout and text
          flow follow the <code className="rounded bg-muted px-1">dir</code>{" "}
          attribute.
        </p>
      </div>
    </div>
  )
}

export const directionDoc: ComponentDoc = {
  id: "direction",
  examples: [
    {
      title: "LTR / RTL toggle",
      description: "Toggle document direction on a local container.",
      code: `<div dir="rtl">...</div>`,
      render: () => <DirectionDemo />,
    },
    {
      title: "Side by side",
      description: "Compare LTR and RTL layouts.",
      code: `<div dir="ltr">...</div>
<div dir="rtl">...</div>`,
      render: () => (
        <div className="grid w-full max-w-lg gap-3 sm:grid-cols-2">
          <div dir="ltr" className="rounded-lg border p-3 text-sm">
            <p className="font-medium">LTR</p>
            <p className="text-muted-foreground">Hello world →</p>
          </div>
          <div dir="rtl" className="rounded-lg border p-3 text-sm">
            <p className="font-medium">RTL</p>
            <p className="text-muted-foreground">← مرحبا بالعالم</p>
          </div>
        </div>
      ),
    },
  ],
}
