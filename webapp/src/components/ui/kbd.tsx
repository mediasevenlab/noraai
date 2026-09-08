import { cn } from "@/lib/utils"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "nora-kbd pointer-events-none inline-flex h-4 w-fit min-w-4 items-center justify-center gap-1 rounded-[var(--nora-radius-xs)] bg-[var(--nora-kbd-bg)] px-1 font-[family-name:var(--nora-font)] text-[10px] font-medium text-[var(--nora-kbd-text)] select-none in-data-[slot=tooltip-content]:bg-[var(--nora-kbd-on-tint-bg)] in-data-[slot=tooltip-content]:text-[var(--nora-kbd-on-tint-text)] [&_svg:not([class*='size-'])]:size-3",
        className
      )}
      {...props}
    />
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  )
}

export { Kbd, KbdGroup }
