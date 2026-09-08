import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

import type { ComponentDoc } from "./types"

export const cardDoc: ComponentDoc = {
  id: "card",
  examples: [
    {
      title: "Basic",
      description: "Card with header, content, and footer.",
      code: `import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function CardBasic() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create project</CardTitle>
        <CardDescription>Deploy your new project in one click.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Configure your workspace and invite teammates.
        </p>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Deploy</Button>
      </CardFooter>
    </Card>
  )
}`,
      render: () => (
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Create project</CardTitle>
            <CardDescription>
              Deploy your new project in one click.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Configure your workspace and invite teammates.
            </p>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Deploy</Button>
          </CardFooter>
        </Card>
      ),
    },
    {
      title: "With action",
      description: "Header action slot next to the title.",
      code: `import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function CardWithAction() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>You have 3 unread messages.</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm">
            Mark all
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Team invites and billing alerts appear here.
        </p>
      </CardContent>
    </Card>
  )
}`,
      render: () => (
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>You have 3 unread messages.</CardDescription>
            <CardAction>
              <Button variant="outline" size="sm">
                Mark all
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Team invites and billing alerts appear here.
            </p>
          </CardContent>
        </Card>
      ),
    },
    {
      title: "Small size",
      description: "Compact card spacing via size=\"sm\".",
      code: `import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export function CardSmall() {
  return (
    <Card size="sm" className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Quick search</CardTitle>
      </CardHeader>
      <CardContent>
        <Input placeholder="Search..." />
      </CardContent>
    </Card>
  )
}`,
      render: () => (
        <Card size="sm" className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Quick search</CardTitle>
          </CardHeader>
          <CardContent>
            <Input placeholder="Search..." />
          </CardContent>
        </Card>
      ),
    },
  ],
}
