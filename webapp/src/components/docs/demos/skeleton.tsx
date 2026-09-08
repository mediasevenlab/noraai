import { Skeleton } from "@/components/ui/skeleton"

import type { ComponentDoc } from "./types"

export const skeletonDoc: ComponentDoc = {
  id: "skeleton",
  examples: [
    {
      title: "Basic",
      description: "Avatar + lines — Nora input-bg pulse.",
      code: `<div className="flex items-center gap-3">
  <Skeleton className="size-9 rounded-full" />
  <div className="space-y-1.5">
    <Skeleton className="h-3 w-[180px]" />
    <Skeleton className="h-3 w-[140px]" />
  </div>
</div>`,
      render: () => (
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-[180px]" />
            <Skeleton className="h-3 w-[140px]" />
          </div>
        </div>
      ),
    },
    {
      title: "Card placeholder",
      description: "Skeleton shaped like a card layout.",
      code: `<div className="flex w-[240px] flex-col gap-2">
  <Skeleton className="h-[100px] w-full" />
  <Skeleton className="h-3 w-3/4" />
  <Skeleton className="h-3 w-1/2" />
</div>`,
      render: () => (
        <div className="flex w-[240px] flex-col gap-2">
          <Skeleton className="h-[100px] w-full rounded-[var(--nora-radius-lg,10px)]" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        </div>
      ),
    },
    {
      title: "Text lines",
      description: "Paragraph loading placeholder.",
      code: `<div className="w-[240px] space-y-1.5">
  <Skeleton className="h-3 w-full" />
  …
</div>`,
      render: () => (
        <div className="w-[240px] space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      ),
    },
  ],
}
