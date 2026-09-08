import { Slider as SliderPrimitive } from "@base-ui/react/slider"

import { cn } from "@/lib/utils"

function resolveThumbValues(
  value: number | readonly number[] | undefined,
  defaultValue: number | readonly number[] | undefined,
  min: number
): number[] {
  if (Array.isArray(value)) return [...value]
  if (typeof value === "number") return [value]
  if (Array.isArray(defaultValue)) return [...defaultValue]
  if (typeof defaultValue === "number") return [defaultValue]
  return [min]
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderPrimitive.Root.Props) {
  const thumbValues = resolveThumbValues(value, defaultValue, min)

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-full bg-[var(--nora-input-bg)] select-none data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-[var(--nora-tint)] select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {thumbValues.map((_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            className="relative block size-3.5 shrink-0 rounded-full border-0 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.28)] transition-[box-shadow] select-none after:absolute after:-inset-2 hover:shadow-[var(--nora-shadow-focus)] focus-visible:shadow-[var(--nora-shadow-focus)] focus-visible:outline-hidden active:shadow-[var(--nora-shadow-focus)] disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
