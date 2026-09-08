import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/** Nora empty: shopping plaque — 32px icon badge, 15/500 title, 12/300 description. */
function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "ios-glass-glare-soft flex w-full min-w-0 items-center gap-2.5 rounded-[14px] bg-[var(--nora-input-bg)]/72 px-2.5 py-2 font-[family-name:var(--nora-font)] text-[var(--nora-text-secondary)] backdrop-blur-[16px]",
        className
      )}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn("flex min-w-0 flex-1 flex-col items-start text-left", className)}
      {...props}
    />
  )
}

const emptyMediaVariants = cva(
  "ios-glass-glare-soft inline-flex size-8 shrink-0 items-center justify-center rounded-full border-0 bg-[var(--nora-panel)]/80 text-[var(--nora-text)] backdrop-blur-[8px] [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "",
        icon: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function EmptyMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-title"
      className={cn(
        "text-[15px] font-medium leading-6 tracking-normal text-[var(--nora-text)]",
        className
      )}
      {...props}
    />
  )
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        "text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)] [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-[var(--nora-tint)]",
        className
      )}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-content"
      className={cn("shrink-0 [&_button]:rounded-full", className)}
      {...props}
    />
  )
}

export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
}
