import * as React from "react"

import { cn } from "@/lib/utils"

import { chartAxisLabelClass } from "./chart-theme"

export type ChartAxisMode = "points" | "bands" | "bars" | "none"

type ChartFrameProps = {
  labels?: string[]
  axis?: ChartAxisMode
  className?: string
  plotClassName?: string
  /** Centers of SVG bars in a viewBox. */
  barLayout?: { viewWidth: number; originX: number; step: number }
  children: React.ReactNode
}

/**
 * Shared dashboard frame: one plot baseline and one axis row.
 * SVG custom renderers use `axis="bars"` with their viewBox coordinates.
 */
export function ChartFrame({
  labels,
  axis = "none",
  className,
  plotClassName,
  barLayout = { viewWidth: 360, originX: 60, step: 80 },
  children,
}: ChartFrameProps) {
  const showAxis = axis !== "none" && Boolean(labels?.length)

  return (
    <div
      className={cn(
        "flex h-[var(--chart-frame-h,214px)] w-full flex-col",
        className
      )}
    >
      <div
        className={cn(
          "min-h-0 flex-1 pb-2",
          plotClassName
        )}
      >
        {children}
      </div>
      {showAxis ? (
        <ChartFrameAxis
          labels={labels!}
          mode={axis}
          barLayout={barLayout}
        />
      ) : null}
    </div>
  )
}

function ChartFrameAxis({
  labels,
  mode,
  barLayout,
}: {
  labels: string[]
  mode: Exclude<ChartAxisMode, "none">
  barLayout: { viewWidth: number; originX: number; step: number }
}) {
  return (
    <div
      className={cn(
        "relative h-[var(--chart-axis-h,24px)] shrink-0",
        chartAxisLabelClass
      )}
    >
      {labels.map((label, index) => {
        const left =
          mode === "bars"
            ? `${((barLayout.originX + index * barLayout.step) / barLayout.viewWidth) * 100}%`
            : mode === "bands"
              ? `calc(8px + (100% - 16px) * ${(index + 0.5) / labels.length})`
              : labels.length === 1
                ? "50%"
                : `calc(12px + (100% - 24px) * ${index / (labels.length - 1)})`

        return (
          <span
            key={`${label}-${index}`}
            className="absolute top-2 -translate-x-1/2 whitespace-nowrap"
            style={{ left }}
          >
            {label}
          </span>
        )
      })}
    </div>
  )
}

/** Same width and center positioning for pie / radial labels. */
export function ChartCenterLabel({
  value,
  label,
  className,
}: {
  value: React.ReactNode
  label?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 flex flex-col items-center justify-center",
        className
      )}
    >
      <span className="font-heading text-[20px] font-semibold tracking-[-0.02em] text-[var(--nora-text)]">
        {value}
      </span>
      {label ? (
        <span className="text-[10px] text-[var(--nora-text-tertiary)]">
          {label}
        </span>
      ) : null}
    </div>
  )
}
