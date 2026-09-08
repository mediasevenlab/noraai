import { BadgeCheckIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"

import type { ComponentDoc } from "./types"

export const badgeDoc: ComponentDoc = {
  id: "badge",
  examples: [
    {
      title: "Variants",
      description: "Default, secondary, destructive, outline, ghost, and link.",
      code: `import { Badge } from "@/components/ui/badge"

export function BadgeVariants() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="ghost">Ghost</Badge>
      <Badge variant="link">Link</Badge>
    </div>
  )
}`,
      render: () => (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="ghost">Ghost</Badge>
          <Badge variant="link">Link</Badge>
        </div>
      ),
    },
    {
      title: "With icon",
      description: "Badges can include a leading icon.",
      code: `import { Badge } from "@/components/ui/badge"
import { BadgeCheckIcon } from "lucide-react"

export function BadgeWithIcon() {
  return (
    <Badge>
      <BadgeCheckIcon data-icon="inline-start" />
      Verified
    </Badge>
  )
}`,
      render: () => (
        <Badge>
          <BadgeCheckIcon data-icon="inline-start" />
          Verified
        </Badge>
      ),
    },
    {
      title: "As link",
      description: "Render a badge as an anchor with the render prop.",
      code: `import { Badge } from "@/components/ui/badge"

export function BadgeLink() {
  return (
    <Badge render={<a href="#" />} variant="outline">
      Documentation
    </Badge>
  )
}`,
      render: () => (
        <Badge render={<a href="#badge" />} variant="outline">
          Documentation
        </Badge>
      ),
    },
  ],
}
