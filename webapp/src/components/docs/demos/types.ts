import type * as React from "react"

export type DemoExample = {
  title: string
  description?: string
  code: string
  render: () => React.ReactNode
}

export type ComponentDoc = {
  id: string
  examples: DemoExample[]
}
