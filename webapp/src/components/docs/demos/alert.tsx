import { AlertCircleIcon, CheckCircle2Icon, TerminalIcon } from "lucide-react"

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import type { ComponentDoc } from "./types"

export const alertDoc: ComponentDoc = {
  id: "alert",
  examples: [
    {
      title: "Default",
      description: "Informational alert with icon.",
      code: `import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { TerminalIcon } from "lucide-react"

export function AlertDemo() {
  return (
    <Alert>
      <TerminalIcon />
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>
        You can add components to your app using the cli.
      </AlertDescription>
    </Alert>
  )
}`,
      render: () => (
        <Alert className="max-w-lg">
          <TerminalIcon />
          <AlertTitle>Heads up!</AlertTitle>
          <AlertDescription>
            You can add components to your app using the cli.
          </AlertDescription>
        </Alert>
      ),
    },
    {
      title: "Destructive",
      description: "Error/destructive variant.",
      code: `<Alert variant="destructive">...</Alert>`,
      render: () => (
        <Alert variant="destructive" className="max-w-lg">
          <AlertCircleIcon />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Your session has expired. Please log in again.
          </AlertDescription>
        </Alert>
      ),
    },
    {
      title: "With action",
      description: "Alert with an absolute action slot.",
      code: `<Alert>
  ...
  <AlertAction><Button size="sm">Undo</Button></AlertAction>
</Alert>`,
      render: () => (
        <Alert className="max-w-lg">
          <CheckCircle2Icon />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Your changes have been saved.</AlertDescription>
          <AlertAction>
            <Button size="sm" variant="outline">
              Undo
            </Button>
          </AlertAction>
        </Alert>
      ),
    },
  ],
}
