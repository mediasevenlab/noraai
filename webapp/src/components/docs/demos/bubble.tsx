import {
  Bubble,
  BubbleContent,
  BubbleGroup,
  BubbleReactions,
} from "@/components/ui/bubble"

import type { ComponentDoc } from "./types"

export const bubbleDoc: ComponentDoc = {
  id: "bubble",
  examples: [
    {
      title: "Variants",
      description:
        "default · secondary · muted · tinted · outline · ghost · destructive.",
      code: `import { Bubble, BubbleContent, BubbleGroup } from "@/components/ui/bubble"

export function BubbleVariants() {
  return (
    <BubbleGroup>
      <Bubble variant="default"><BubbleContent>Default</BubbleContent></Bubble>
      <Bubble variant="secondary"><BubbleContent>Secondary</BubbleContent></Bubble>
      <Bubble variant="muted"><BubbleContent>Muted</BubbleContent></Bubble>
    </BubbleGroup>
  )
}`,
      render: () => (
        <BubbleGroup className="w-full max-w-sm">
          {(
            [
              "default",
              "secondary",
              "muted",
              "tinted",
              "outline",
              "ghost",
              "destructive",
            ] as const
          ).map((variant) => (
            <Bubble key={variant} variant={variant}>
              <BubbleContent>
                {variant === "ghost" ? "ghost" : `${variant} bubble`}
              </BubbleContent>
            </Bubble>
          ))}
        </BubbleGroup>
      ),
    },
    {
      title: "Alignment",
      description: "Start (incoming) и end (outgoing).",
      code: `<Bubble align="start" variant="muted">...</Bubble>
<Bubble align="end">...</Bubble>`,
      render: () => (
        <BubbleGroup className="w-full max-w-sm">
          <Bubble align="start" variant="muted">
            <BubbleContent>Incoming message</BubbleContent>
          </Bubble>
          <Bubble align="end">
            <BubbleContent>Outgoing reply</BubbleContent>
          </Bubble>
        </BubbleGroup>
      ),
    },
    {
      title: "Bubble group",
      description: "Подряд идущие пузыри одного отправителя.",
      code: `<BubbleGroup>
  <Bubble align="end"><BubbleContent>One</BubbleContent></Bubble>
  <Bubble align="end"><BubbleContent>Two</BubbleContent></Bubble>
</BubbleGroup>`,
      render: () => (
        <div className="flex w-full max-w-sm flex-col gap-4">
          <Bubble variant="muted">
            <BubbleContent>Can you tell me what&apos;s the issue?</BubbleContent>
          </Bubble>
          <BubbleGroup>
            <Bubble align="end">
              <BubbleContent>It worked yesterday.</BubbleContent>
            </Bubble>
            <Bubble align="end">
              <BubbleContent>Find the bug and fix it.</BubbleContent>
              <BubbleReactions aria-label="Reaction: eyes" align="start">
                <span>👀</span>
              </BubbleReactions>
            </Bubble>
          </BubbleGroup>
          <Bubble variant="muted">
            <BubbleContent>On it — checking the diff now.</BubbleContent>
          </Bubble>
        </div>
      ),
    },
    {
      title: "With reactions",
      description:
        "По умолчанию side=bottom · align=end — чип якорится на краю пузыря (как в shadcn).",
      code: `<Bubble>
  <BubbleContent>Nice work!</BubbleContent>
  <BubbleReactions>👍 2</BubbleReactions>
</Bubble>`,
      render: () => (
        <BubbleGroup className="w-full max-w-sm gap-6 pt-2 pb-6">
          <Bubble variant="muted">
            <BubbleContent>That looks great — ship it.</BubbleContent>
            <BubbleReactions role="img" aria-label="Reactions: thumbs up and fire">
              <span>👍</span>
              <span>🔥</span>
              <span>+2</span>
            </BubbleReactions>
          </Bubble>
          <Bubble align="end" variant="tinted">
            <BubbleContent>Or a soft tinted reply.</BubbleContent>
            <BubbleReactions role="img" aria-label="Reaction: thumbs up">
              <span>👍</span>
            </BubbleReactions>
          </Bubble>
        </BubbleGroup>
      ),
    },
  ],
}
