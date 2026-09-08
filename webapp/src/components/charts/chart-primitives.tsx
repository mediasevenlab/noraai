import * as React from "react"
import {
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { ChartTooltipContent } from "@/components/ui/chart"

import { chartTheme } from "./chart-theme"

export function ChartGrid({
  dashed = false,
}: {
  dashed?: boolean
}) {
  return (
    <CartesianGrid
      {...chartTheme.grid}
      strokeDasharray={dashed ? "3 3" : undefined}
    />
  )
}

export function ChartAxisX({
  dataKey,
  hide = false,
  tickMargin = 8,
  type,
  domain,
}: {
  dataKey?: string
  hide?: boolean
  tickMargin?: number
  type?: "number" | "category"
  domain?: [number | string, number | string]
}) {
  return (
    <XAxis
      dataKey={dataKey}
      hide={hide}
      type={type}
      domain={domain}
      tickLine={false}
      axisLine={false}
      tickMargin={tickMargin}
      tick={chartTheme.axisTick}
    />
  )
}

export function ChartAxisY({
  dataKey,
  hide = false,
  width,
  type,
  domain,
}: {
  dataKey?: string
  hide?: boolean
  width?: number
  type?: "number" | "category"
  domain?: [number | string, number | string]
}) {
  return (
    <YAxis
      dataKey={dataKey}
      hide={hide}
      width={width}
      type={type}
      domain={domain}
      tickLine={false}
      axisLine={false}
      tick={chartTheme.axisTick}
    />
  )
}

export function ChartTooltipPreset({
  cursor = false,
  content,
}: {
  cursor?: boolean
  content?: React.ComponentProps<typeof Tooltip>["content"]
}) {
  return (
    <Tooltip
      cursor={cursor}
      content={content ?? <ChartTooltipContent />}
    />
  )
}

