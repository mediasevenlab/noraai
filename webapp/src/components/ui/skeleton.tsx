import { cn } from "@/lib/utils"

/** Nora loading placeholder — soft surface pulse */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-[var(--nora-radius-md,8px)] bg-[var(--nora-input-bg)]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
