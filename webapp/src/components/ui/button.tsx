import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/** Плотность Nora: контрол 26px, кегль 12/500, радиус 8px */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[var(--nora-radius-md,8px)] border border-transparent bg-clip-padding text-xs font-medium whitespace-nowrap transition-[background-color,box-shadow,color,transform] duration-[var(--nora-duration,0.15s)] outline-none select-none focus-visible:shadow-[var(--nora-shadow-focus)] focus-visible:ring-0 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-[var(--nora-tint-dark)]",
        outline:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-[var(--nora-button-bg-hover)] aria-expanded:bg-secondary",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[var(--nora-button-bg-hover)] aria-expanded:bg-secondary",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-[var(--nora-row-hover)] hover:text-foreground aria-expanded:bg-[var(--nora-row-hover)]",
        destructive:
          "bg-destructive text-[var(--nora-button-on-tint-text)] hover:bg-[var(--nora-error-hover)] focus-visible:shadow-[inset_0_0_0_1px_var(--nora-error),0_0_5px_var(--nora-error)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-[var(--nora-control-h,30px)] gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-[var(--nora-control-h-sm,22px)] gap-1 rounded-[var(--nora-radius-sm,6px)] px-2 text-[11px] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-[var(--nora-control-h-sm,22px)] gap-1 rounded-[var(--nora-radius-sm,6px)] px-2 text-[11px] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-[var(--nora-row-h,30px)] gap-1.5 rounded-[var(--nora-radius-lg,10px)] px-3.5 text-[13px]",
        icon: "size-[var(--nora-control-h,30px)]",
        "icon-xs": "size-[var(--nora-control-h-sm,22px)] rounded-[var(--nora-radius-sm,6px)] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-[var(--nora-control-h-sm,22px)] rounded-[var(--nora-radius-sm,6px)]",
        "icon-lg": "size-[var(--nora-row-h,30px)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

// Calendar composes Button styles directly for its navigation controls.
export { Button, buttonVariants }
