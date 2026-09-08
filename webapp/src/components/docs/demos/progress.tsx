import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"

import type { ComponentDoc } from "./types"

const w = "w-full max-w-[240px]"

export const progressDoc: ComponentDoc = {
  id: "progress",
  examples: [
    {
      title: "With label",
      description: "Label and value text.",
      code: `<Progress value={66}>
  <ProgressLabel>Uploading</ProgressLabel>
  <ProgressValue />
</Progress>`,
      render: () => (
        <Progress value={66} className={w}>
          <ProgressLabel>Uploading</ProgressLabel>
          <ProgressValue />
        </Progress>
      ),
    },
    {
      title: "Indeterminate",
      description: "value={null} — loading state.",
      code: `<Progress value={null}>
  <ProgressLabel>Loading</ProgressLabel>
</Progress>`,
      render: () => (
        <Progress value={null} className={w}>
          <ProgressLabel>Loading</ProgressLabel>
        </Progress>
      ),
    },
  ],
}
