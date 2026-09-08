import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

import type { ComponentDoc } from "./types"

const HOVER_CARD_SIDES = ["left", "top", "bottom", "right"] as const

export const hoverCardDoc: ComponentDoc = {
  id: "hover-card",
  examples: [
    {
      title: "Basic",
      description: "Nora popover surface — preview on hover.",
      code: `import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Button } from "@/components/ui/button"

<HoverCard>
  <HoverCardTrigger delay={10} closeDelay={100} render={<Button variant="link" />}>
    @nextjs
  </HoverCardTrigger>
  <HoverCardContent>…</HoverCardContent>
</HoverCard>`,
      render: () => (
        <HoverCard>
          <HoverCardTrigger
            delay={10}
            closeDelay={100}
            render={<Button variant="link" />}
          >
            @nextjs
          </HoverCardTrigger>
          <HoverCardContent className="w-[260px]">
            <div className="flex gap-2.5">
              <Avatar size="sm" className="size-8">
                <AvatarImage
                  src="https://github.com/vercel.png"
                  alt="@vercel"
                />
                <AvatarFallback className="bg-gradient-to-br from-[var(--nora-avatar-gradient-from)] to-[var(--nora-avatar-gradient-to)] text-[10px] text-[var(--nora-on-accent)]">
                  VC
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col gap-1">
                <div className="text-xs font-semibold text-[var(--nora-text)]">
                  @nextjs
                </div>
                <p className="text-xs font-medium leading-normal text-[var(--nora-text-tertiary)]">
                  The React Framework – created and maintained by @vercel.
                </p>
                <p className="text-[11px] font-medium text-[var(--nora-text-dimmed)]">
                  Joined December 2021
                </p>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      ),
    },
    {
      title: "Sides",
      description: "Position with side prop.",
      code: `<HoverCardContent side="top">…</HoverCardContent>`,
      render: () => (
        <div className="flex flex-wrap justify-center gap-2">
          {HOVER_CARD_SIDES.map((side) => (
            <HoverCard key={side}>
              <HoverCardTrigger
                delay={80}
                closeDelay={100}
                render={<Button variant="outline" className="capitalize" />}
              >
                {side}
              </HoverCardTrigger>
              <HoverCardContent side={side} className="w-[200px]">
                <div className="flex flex-col gap-1">
                  <div className="text-xs font-semibold text-[var(--nora-text)]">
                    Hover Card
                  </div>
                  <p className="text-xs font-medium leading-normal text-[var(--nora-text-tertiary)]">
                    Appears on the {side} side of the trigger.
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
          ))}
        </div>
      ),
    },
  ],
}
