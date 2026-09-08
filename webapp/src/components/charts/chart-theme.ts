import type { CSSProperties } from "react"

export type ChartShell = "docs" | "dashboard" | "square" | "sparkline"
export type ChartMargin = "default" | "compact" | "labeled"

/** Single source of visual rhythm for Nora / Nora charts. */
export const chartTheme = {
  axisTick: {
    fill: "var(--nora-text-tertiary)",
    fontSize: 11,
    fontFamily: "Inter, var(--nora-font), system-ui, sans-serif",
    fontFeatureSettings: '"cv01" 1, "zero" 0',
  } satisfies CSSProperties,
  grid: {
    vertical: false,
    stroke: "var(--nora-divider)",
  },
  series: {
    strokeWidth: 1.5,
    fillOpacity: 0.35,
  },
  margins: {
    default: { top: 8, right: 12, left: 12, bottom: 0 },
    compact: { top: 4, right: 8, left: 8, bottom: 0 },
    labeled: { top: 24, right: 12, left: 12, bottom: 0 },
  },
  shells: {
    docs: "aspect-auto h-[200px] w-full max-w-md",
    dashboard: "!aspect-auto size-full min-h-0",
    square: "mx-auto aspect-square h-[220px] w-full max-w-[220px]",
    sparkline: "aspect-auto h-[var(--nora-row-h)] w-[88px]",
  },
  dashboard: {
    plotHeight: 190,
    axisHeight: 24,
    frameHeight: 214,
    horizontalInset: 12,
  },
  bar: {
    sm: 14,
    md: 22,
    lg: 28,
    radius: 6,
  },
} as const

export const chartAxisLabelClass =
  "font-[family-name:Inter,var(--nora-font),system-ui,sans-serif] text-[11px] leading-none text-[var(--nora-text-tertiary)]"

export const chartMargin = (name: ChartMargin = "default") =>
  chartTheme.margins[name]

export const chartShell = (name: ChartShell = "docs") =>
  chartTheme.shells[name]
