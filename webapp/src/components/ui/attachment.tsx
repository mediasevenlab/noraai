import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * Attachment под Nora UI:
 * те же слоты/размеры/состояния, цвета и фокус — из --nora-*.
 */
const attachmentVariants = cva(
  [
    "group/attachment relative flex w-fit max-w-full min-w-0 shrink-0 flex-wrap",
    "font-[family-name:var(--nora-font)]",
    "rounded-[var(--nora-radius-lg)] border border-[var(--nora-border)]",
    "bg-[var(--nora-panel)] text-[var(--nora-text)]",
    "transition-[background-color,box-shadow,border-color,color] duration-[var(--nora-duration)]",
    "focus-within:shadow-[var(--nora-shadow-focus)] focus-within:border-transparent",
    "has-[>a,>button]:hover:bg-[var(--nora-surface)]",
    "data-[state=error]:border-[color-mix(in_srgb,var(--nora-error)_30%,transparent)]",
    "data-[state=error]:bg-[var(--nora-error-soft-bg)]",
    "data-[state=idle]:border-dashed data-[state=idle]:border-[var(--nora-border-strong)]",
    "data-[state=idle]:bg-transparent data-[state=idle]:hover:bg-[var(--nora-row-hover)]",
  ].join(" "),
  {
    variants: {
      size: {
        default:
          "gap-2 text-sm has-data-[slot=attachment-content]:px-2.5 has-data-[slot=attachment-content]:py-2 has-data-[slot=attachment-media]:p-2",
        sm: "gap-2.5 text-xs has-data-[slot=attachment-content]:px-2 has-data-[slot=attachment-content]:py-1.5 has-data-[slot=attachment-media]:p-1.5",
        xs: "gap-1.5 rounded-[var(--nora-radius-md)] text-xs has-data-[slot=attachment-content]:px-1.5 has-data-[slot=attachment-content]:py-1 has-data-[slot=attachment-media]:p-1",
      },
      orientation: {
        horizontal: "min-w-40 items-center",
        vertical: "w-24 flex-col has-data-[slot=attachment-content]:w-30",
      },
    },
  }
)

function Attachment({
  className,
  state = "done",
  size = "default",
  orientation = "horizontal",
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof attachmentVariants> & {
    state?: "idle" | "uploading" | "processing" | "error" | "done"
  }) {
  return (
    <div
      data-slot="attachment"
      data-state={state}
      data-size={size}
      data-orientation={orientation}
      className={cn(attachmentVariants({ size, orientation }), className)}
      {...props}
    />
  )
}

const attachmentMediaVariants = cva(
  [
    "relative flex aspect-square w-10 shrink-0 items-center justify-center overflow-hidden",
    "rounded-[var(--nora-radius-md)] bg-[var(--nora-inset)] text-[var(--nora-text)]",
    "group-data-[orientation=vertical]/attachment:w-full",
    "group-data-[size=sm]/attachment:w-8",
    "group-data-[size=xs]/attachment:w-7 group-data-[size=xs]/attachment:rounded-[var(--nora-radius-sm)]",
    "group-data-[state=error]/attachment:bg-[var(--nora-badge-red-bg)]",
    "group-data-[state=error]/attachment:text-[var(--nora-error)]",
    "group-data-[orientation=vertical]/attachment:*:data-[slot=spinner]:size-6!",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
    "group-data-[orientation=vertical]/attachment:[&_svg:not([class*='size-'])]:size-6",
    "group-data-[size=xs]/attachment:[&_svg:not([class*='size-'])]:size-3.5",
  ].join(" "),
  {
    variants: {
      variant: {
        icon: "",
        image:
          "bg-transparent opacity-60 group-data-[state=done]/attachment:opacity-100 group-data-[state=idle]/attachment:opacity-100 *:[img]:aspect-square *:[img]:w-full *:[img]:object-cover",
      },
    },
    defaultVariants: {
      variant: "icon",
    },
  }
)

function AttachmentMedia({
  className,
  variant = "icon",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof attachmentMediaVariants>) {
  return (
    <div
      data-slot="attachment-media"
      data-variant={variant}
      className={cn(attachmentMediaVariants({ variant }), className)}
      {...props}
    />
  )
}

function AttachmentContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="attachment-content"
      className={cn(
        "max-w-full min-w-0 flex-1 leading-tight group-data-[orientation=vertical]/attachment:px-1",
        className
      )}
      {...props}
    />
  )
}

function AttachmentTitle({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="attachment-title"
      className={cn(
        "block max-w-full min-w-0 truncate font-medium text-[var(--nora-text)]",
        "group-data-[state=error]/attachment:text-[var(--nora-error)]",
        "group-data-[state=processing]/attachment:nora-shimmer group-data-[state=uploading]/attachment:nora-shimmer",
        className
      )}
      {...props}
    />
  )
}

function AttachmentDescription({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="attachment-description"
      className={cn(
        "mt-0.5 block max-w-full min-w-0 truncate text-xs font-medium text-[var(--nora-text-secondary)]",
        "group-data-[state=error]/attachment:text-[var(--nora-badge-red-text)]",
        className
      )}
      {...props}
    />
  )
}

function AttachmentProgress({
  className,
  value = 0,
  ...props
}: React.ComponentProps<"div"> & { value?: number }) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div
      data-slot="attachment-progress"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[var(--nora-inset)]",
        "group-data-[state=error]/attachment:bg-[var(--nora-badge-red-bg)]",
        className
      )}
      {...props}
    >
      <div
        className="h-full rounded-full bg-[var(--nora-tint)] transition-[width] duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

function AttachmentActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="attachment-actions"
      className={cn(
        "relative z-20 flex shrink-0 items-center gap-0.5",
        "group-data-[orientation=vertical]/attachment:absolute group-data-[orientation=vertical]/attachment:top-3 group-data-[orientation=vertical]/attachment:right-3 group-data-[orientation=vertical]/attachment:gap-1",
        className
      )}
      {...props}
    />
  )
}

function AttachmentAction({
  className,
  variant,
  size = "icon-xs",
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="attachment-action"
      variant={variant ?? "ghost"}
      size={size}
      className={cn(
        "text-[var(--nora-text-tertiary)] hover:bg-[var(--nora-row-hover)] hover:text-[var(--nora-text)]",
        className
      )}
      {...props}
    />
  )
}

function AttachmentTrigger({
  className,
  render,
  type,
  ...props
}: useRender.ComponentProps<"button">) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        type: render ? type : (type ?? "button"),
        className: cn("absolute inset-0 z-10 outline-none", className),
      },
      props
    ),
    render,
    state: {
      slot: "attachment-trigger",
    },
  })
}

function AttachmentGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="attachment-group"
      className={cn(
        "flex min-w-0 scroll-fade-x snap-x snap-mandatory scroll-px-1 scrollbar-none gap-3 overflow-x-auto overscroll-x-contain py-1 *:data-[slot=attachment]:flex-none *:data-[slot=attachment]:snap-start",
        className
      )}
      {...props}
    />
  )
}

export {
  Attachment,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentProgress,
  AttachmentActions,
  AttachmentAction,
  AttachmentTrigger,
}
