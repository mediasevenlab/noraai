import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

import type { ComponentDoc } from "./types"

export const spinnerDoc: ComponentDoc = {
  id: "spinner",
  examples: [
    {
      title: "Basic",
      description: "Nora loading indicator — secondary text color.",
      code: `import { Spinner } from "@/components/ui/spinner"

export function SpinnerDemo() {
  return <Spinner />
}`,
      render: () => <Spinner className="size-5" />,
    },
    {
      title: "In button",
      description: "Spinner inside a loading button.",
      code: `<Button disabled>
  <Spinner data-icon="inline-start" />
  Please wait
</Button>`,
      render: () => (
        <Button disabled>
          <Spinner
            data-icon="inline-start"
            className="text-[var(--nora-button-on-tint-text)]"
          />
          Please wait
        </Button>
      ),
    },
    {
      title: "Sizes",
      description: "size-3 · size-3.5 · size-5 · size-8.",
      code: `<Spinner className="size-3" />
<Spinner className="size-8" />`,
      render: () => (
        <div className="flex items-center gap-4">
          <Spinner className="size-3" />
          <Spinner />
          <Spinner className="size-5" />
          <Spinner className="size-8" />
        </div>
      ),
    },
    {
      title: "Tint",
      description: "Accent spinner via text color.",
      code: `<Spinner className="text-[var(--nora-tint)]" />`,
      render: () => (
        <div className="flex items-center gap-4">
          <Spinner className="size-5 text-[var(--nora-tint)]" />
          <Spinner className="size-5 text-[var(--nora-component)]" />
          <Spinner className="size-5 text-[var(--nora-error)]" />
        </div>
      ),
    },
    {
      title: "With label",
      description: "Inline spinner + status text.",
      code: `<div className="flex items-center gap-2 text-xs">
  <Spinner />
  Loading…
</div>`,
      render: () => (
        <div className="flex items-center gap-2 font-[family-name:var(--nora-font)] text-xs font-medium text-[var(--nora-text-secondary)]">
          <Spinner />
          Loading…
        </div>
      ),
    },
  ],
}
