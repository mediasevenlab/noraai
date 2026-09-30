import { cn } from "@/lib/utils"
import { Loader2Icon } from "@/components/icons"

/** Nora loading indicator — tint-friendly spin, default 14px */
function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn(
        "size-3.5 shrink-0 animate-spin motion-reduce:animate-none text-[var(--nora-text-secondary)]",
        className
      )}
      {...props}
    />
  )
}

export { Spinner }
