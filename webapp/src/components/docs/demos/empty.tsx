import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"

import type { ComponentDoc } from "./types"

/** Basic / With action — во Nora; здесь text-only */
export const emptyDoc: ComponentDoc = {
  id: "empty",
  examples: [
    {
      title: "Without media",
      description: "Text-only empty state.",
      code: `<Empty className="w-[260px]">
  <EmptyHeader>
    <EmptyTitle>Nothing here</EmptyTitle>
    <EmptyDescription>Try a different filter.</EmptyDescription>
  </EmptyHeader>
</Empty>`,
      render: () => (
        <Empty className="w-[260px]">
          <EmptyHeader>
            <EmptyTitle>Nothing here</EmptyTitle>
            <EmptyDescription>Try a different filter.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ),
    },
  ],
}
