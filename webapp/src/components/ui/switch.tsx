"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

/** Nora toggle — tint track when on, input-bg when off, panel thumb */
function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default" | "lg"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent outline-none transition-[background-color,box-shadow] duration-[var(--nora-duration,0.15s)] after:absolute after:-inset-x-2 after:-inset-y-1.5 focus-visible:shadow-[var(--nora-shadow-focus)] focus-visible:ring-0 aria-invalid:shadow-[inset_0_0_0_1px_var(--nora-error)] data-disabled:cursor-not-allowed data-disabled:opacity-50",
        "data-[size=default]:h-4 data-[size=default]:w-[26px] data-[size=sm]:h-3.5 data-[size=sm]:w-5 data-[size=lg]:h-[31px] data-[size=lg]:w-[51px] lg:data-[size=lg]:h-[22px] lg:data-[size=lg]:w-[40px]",
        "data-checked:bg-[var(--nora-tint)] data-unchecked:bg-[var(--nora-input-bg)]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-[var(--nora-panel)] shadow-[0_1px_2px_rgba(0,0,0,0.18)] ring-0 transition-transform duration-[var(--nora-duration,0.15s)]",
          "group-data-[size=default]/switch:size-3 group-data-[size=sm]/switch:size-2.5 group-data-[size=lg]/switch:size-[27px] lg:group-data-[size=lg]/switch:size-[18px]",
          "group-data-[size=default]/switch:data-checked:translate-x-[10px] group-data-[size=sm]/switch:data-checked:translate-x-[8px] group-data-[size=lg]/switch:data-checked:translate-x-[22px] lg:group-data-[size=lg]/switch:data-checked:translate-x-[20px]",
          "group-data-[size=default]/switch:data-unchecked:translate-x-0.5 group-data-[size=sm]/switch:data-unchecked:translate-x-0.5 group-data-[size=lg]/switch:data-unchecked:translate-x-[2px]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
