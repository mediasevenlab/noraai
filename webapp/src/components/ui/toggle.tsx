import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/** Nora toolbar toggle — hover row, pressed tint-dimmed (как Icon Button) */
const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-1.5 rounded-[var(--nora-radius-md,8px)] font-[family-name:var(--nora-font)] text-xs font-medium whitespace-nowrap text-[var(--nora-text-secondary)] transition-[background-color,color,box-shadow] duration-[var(--nora-duration,0.15s)] outline-none hover:bg-[var(--nora-row-hover)] hover:text-[var(--nora-text)] focus-visible:shadow-[var(--nora-shadow-focus)] focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50 aria-invalid:shadow-[inset_0_0_0_1px_var(--nora-error)] aria-pressed:bg-[var(--nora-tint-dimmed)] aria-pressed:text-[var(--nora-tint)] data-[state=on]:bg-[var(--nora-tint-dimmed)] data-[state=on]:text-[var(--nora-tint)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border-0 bg-[var(--nora-input-bg)] hover:bg-[var(--nora-row-hover)] data-[state=on]:bg-[var(--nora-tint-dimmed)]",
      },
      size: {
        default:
          "h-[var(--nora-control-h,30px)] min-w-[var(--nora-control-h,30px)] px-2.5",
        sm: "h-[var(--nora-control-h-sm,22px)] min-w-[var(--nora-control-h-sm,22px)] rounded-[var(--nora-radius-sm,6px)] px-2 text-[11px] [&_svg:not([class*='size-'])]:size-3",
        lg: "h-[var(--nora-row-h,30px)] min-w-[var(--nora-row-h,30px)] px-3 text-[13px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

// ToggleGroup composes this shared style helper.
export { Toggle, toggleVariants }
