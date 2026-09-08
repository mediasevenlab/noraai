import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function BubbleGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bubble-group"
      className={cn("flex min-w-0 flex-col gap-1.5", className)}
      {...props}
    />
  )
}

/**
 * Bubble под Nora UI.
 * Слоты/variants/align сохранены; цвета — явные --nora-*, без oklch(from …).
 */
const bubbleVariants = cva(
  "group/bubble relative flex w-fit max-w-[80%] min-w-0 flex-col gap-1 group-data-[align=end]/message:self-end data-[align=end]:self-end data-[variant=ghost]:max-w-full",
  {
    variants: {
      variant: {
        default:
          "*:data-[slot=bubble-content]:bg-[var(--nora-tint)] *:data-[slot=bubble-content]:text-[var(--nora-on-accent)] [&>[data-slot=bubble-content]:is(button,a):hover]:bg-[var(--nora-tint-dark)]",
        secondary:
          "*:data-[slot=bubble-content]:bg-[var(--nora-inset)] *:data-[slot=bubble-content]:text-[var(--nora-text)] [&>[data-slot=bubble-content]:is(button,a):hover]:bg-[var(--nora-button-bg-hover)]",
        muted:
          "*:data-[slot=bubble-content]:bg-[var(--nora-panel)] *:data-[slot=bubble-content]:text-[var(--nora-text)] *:data-[slot=bubble-content]:shadow-[inset_0_0_0_1px_var(--nora-border)] [&>[data-slot=bubble-content]:is(button,a):hover]:bg-[var(--nora-surface)]",
        tinted:
          // непрозрачный mix tint×panel — без «грязного» rgba поверх canvas
          "*:data-[slot=bubble-content]:bg-[color-mix(in_srgb,var(--nora-tint)_26%,var(--nora-panel))] *:data-[slot=bubble-content]:text-[var(--nora-text)] [&>[data-slot=bubble-content]:is(button,a):hover]:bg-[color-mix(in_srgb,var(--nora-tint)_36%,var(--nora-panel))]",
        outline:
          "*:data-[slot=bubble-content]:border-[var(--nora-border-strong)] *:data-[slot=bubble-content]:bg-[var(--nora-panel)] *:data-[slot=bubble-content]:text-[var(--nora-text)] [&>[data-slot=bubble-content]:is(button,a):hover]:bg-[var(--nora-surface)]",
        ghost:
          // padding как у остальных (px-3 py-2) — текст в одной колонке; без фона/радиуса
          "border-none *:data-[slot=bubble-content]:rounded-none *:data-[slot=bubble-content]:border-transparent *:data-[slot=bubble-content]:bg-transparent *:data-[slot=bubble-content]:text-[var(--nora-text)] [&>[data-slot=bubble-content]:is(button,a):hover]:bg-[var(--nora-row-hover)]",
        destructive:
          "*:data-[slot=bubble-content]:bg-[var(--nora-error-soft-bg)] *:data-[slot=bubble-content]:text-[var(--nora-error)] [&>[data-slot=bubble-content]:is(button,a):hover]:bg-[var(--nora-error-soft-bg-hover)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Bubble({
  variant = "default",
  align = "start",
  className,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof bubbleVariants> & {
    align?: "start" | "end"
  }) {
  return (
    <div
      data-slot="bubble"
      data-variant={variant}
      data-align={align}
      className={cn(bubbleVariants({ variant }), className)}
      {...props}
    />
  )
}

function BubbleContent({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(
          "w-fit max-w-full min-w-0 overflow-hidden border border-transparent",
          "rounded-[var(--nora-radius-lg)] px-3 py-2",
          "font-[family-name:var(--nora-font)] text-sm font-medium leading-relaxed wrap-break-word",
          "group-data-[align=end]/bubble:self-end",
          "[button]:text-left [button,a]:transition-colors [button,a]:outline-none",
          "[button,a]:focus-visible:shadow-[var(--nora-shadow-focus)]",
          className
        ),
      },
      props
    ),
    render,
    state: {
      slot: "bubble-content",
    },
  })
}

const bubbleReactionsVariants = cva(
  [
    "absolute z-10 flex w-fit shrink-0 items-center justify-center gap-1",
    "rounded-full bg-[var(--nora-panel)] px-1.5 py-0.5 text-sm",
    "shadow-[0_0_0_2px_var(--nora-canvas),inset_0_0_0_1px_var(--nora-border)]",
    "has-[button]:p-0",
  ].join(" "),
  {
    variants: {
      side: {
        top: "top-0 -translate-y-3/4",
        bottom: "bottom-0 translate-y-3/4",
      },
      align: {
        start: "left-3",
        end: "right-3",
      },
    },
    defaultVariants: {
      side: "bottom",
      align: "end",
    },
  }
)

function BubbleReactions({
  side = "bottom",
  align = "end",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  align?: "start" | "end"
  side?: "top" | "bottom"
}) {
  return (
    <div
      data-slot="bubble-reactions"
      data-align={align}
      data-side={side}
      className={cn(bubbleReactionsVariants({ side, align }), className)}
      {...props}
    />
  )
}

export { BubbleGroup, Bubble, BubbleContent, BubbleReactions }
