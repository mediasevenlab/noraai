import * as React from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts"

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  ChartAxisX,
  ChartGrid,
  ChartTooltipPreset,
  chartShell as getChartShell,
  chartTheme,
} from "@/components/charts"

import { chartShowcaseExamples } from "./chart-showcase"
import type { ComponentDoc } from "./types"

const chartData = [
  { month: "Jan", desktop: 186, mobile: 80 },
  { month: "Feb", desktop: 305, mobile: 200 },
  { month: "Mar", desktop: 237, mobile: 120 },
  { month: "Apr", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "Jun", desktop: 214, mobile: 140 },
]

const chartConfig = {
  desktop: { label: "Desktop", color: "var(--nora-tint)" },
  mobile: { label: "Mobile", color: "var(--nora-component)" },
} satisfies ChartConfig

const pieData = [
  { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
  { browser: "firefox", visitors: 187, fill: "var(--color-firefox)" },
  { browser: "edge", visitors: 173, fill: "var(--color-edge)" },
  { browser: "other", visitors: 90, fill: "var(--color-other)" },
]

const pieConfig = {
  visitors: { label: "Visitors" },
  chrome: { label: "Chrome", color: "var(--nora-tint)" },
  safari: { label: "Safari", color: "var(--nora-component)" },
  firefox: { label: "Firefox", color: "var(--nora-success)" },
  edge: { label: "Edge", color: "var(--nora-warning)" },
  other: { label: "Other", color: "var(--nora-error)" },
} satisfies ChartConfig

const negativeData = [
  { month: "Jan", visitors: 186 },
  { month: "Feb", visitors: 205 },
  { month: "Mar", visitors: -207 },
  { month: "Apr", visitors: 173 },
  { month: "May", visitors: -209 },
  { month: "Jun", visitors: 214 },
]

const negativeConfig = {
  visitors: { label: "Visitors" },
} satisfies ChartConfig

const radialSingleData = [
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
]

const radialTextConfig = {
  visitors: { label: "Visitors" },
  safari: { label: "Safari", color: "var(--nora-component)" },
} satisfies ChartConfig

const chartShell = getChartShell("docs")
const chartShellClass = chartShell
const squareShell = getChartShell("square")
const axisTick = chartTheme.axisTick

function MonthAxis() {
  return <ChartAxisX dataKey="month" />
}

function AreaStacked() {
  return (
    <ChartContainer config={chartConfig} className={chartShellClass}>
      <AreaChart data={chartData} accessibilityLayer>
        <ChartGrid />
        <MonthAxis />
        <ChartTooltipPreset />
        <Area
          dataKey="mobile"
          type="monotone"
          fill="var(--color-mobile)"
          fillOpacity={0.35}
          stroke="var(--color-mobile)"
          strokeWidth={1.5}
          stackId="a"
        />
        <Area
          dataKey="desktop"
          type="monotone"
          fill="var(--color-desktop)"
          fillOpacity={0.35}
          stroke="var(--color-desktop)"
          strokeWidth={1.5}
          stackId="a"
        />
      </AreaChart>
    </ChartContainer>
  )
}

function AreaLinear() {
  return (
    <ChartContainer config={chartConfig} className={chartShellClass}>
      <AreaChart data={chartData} accessibilityLayer margin={{ left: 12, right: 12 }}>
        <ChartGrid />
        <MonthAxis />
        <ChartTooltipPreset />
        <Area
          dataKey="desktop"
          type="linear"
          fill="var(--color-desktop)"
          fillOpacity={0.35}
          stroke="var(--color-desktop)"
          strokeWidth={1.5}
        />
      </AreaChart>
    </ChartContainer>
  )
}

function AreaStep() {
  return (
    <ChartContainer config={chartConfig} className={chartShell}>
      <AreaChart data={chartData} accessibilityLayer margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} stroke="var(--nora-divider)" />
        <MonthAxis />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Area
          dataKey="desktop"
          type="step"
          fill="var(--color-desktop)"
          fillOpacity={0.35}
          stroke="var(--color-desktop)"
          strokeWidth={1.5}
        />
      </AreaChart>
    </ChartContainer>
  )
}

function AreaGradient() {
  return (
    <ChartContainer config={chartConfig} className={chartShell}>
      <AreaChart data={chartData} accessibilityLayer margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} stroke="var(--nora-divider)" />
        <MonthAxis />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <defs>
          <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-desktop)"
              style={{ stopOpacity: "var(--dash-chart-fill, 0.35)" }}
            />
            <stop offset="100%" stopColor="var(--color-desktop)" stopOpacity={0.04} />
          </linearGradient>
          <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-mobile)"
              style={{ stopOpacity: "var(--dash-chart-fill, 0.35)" }}
            />
            <stop offset="100%" stopColor="var(--color-mobile)" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <Area
          dataKey="mobile"
          type="monotone"
          fill="url(#fillMobile)"
          stroke="var(--color-mobile)"
          strokeWidth={1.5}
          stackId="a"
        />
        <Area
          dataKey="desktop"
          type="monotone"
          fill="url(#fillDesktop)"
          stroke="var(--color-desktop)"
          strokeWidth={1.5}
          stackId="a"
        />
      </AreaChart>
    </ChartContainer>
  )
}

function AreaLegend() {
  return (
    <ChartContainer config={chartConfig} className={chartShell}>
      <AreaChart data={chartData} accessibilityLayer>
        <CartesianGrid vertical={false} stroke="var(--nora-divider)" />
        <MonthAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Area
          dataKey="mobile"
          type="monotone"
          fill="var(--color-mobile)"
          fillOpacity={0.35}
          stroke="var(--color-mobile)"
          strokeWidth={1.5}
          stackId="a"
        />
        <Area
          dataKey="desktop"
          type="monotone"
          fill="var(--color-desktop)"
          fillOpacity={0.35}
          stroke="var(--color-desktop)"
          strokeWidth={1.5}
          stackId="a"
        />
      </AreaChart>
    </ChartContainer>
  )
}

function BarMultiple() {
  return (
    <ChartContainer config={chartConfig} className={chartShell}>
      <BarChart data={chartData} accessibilityLayer>
        <CartesianGrid vertical={false} stroke="var(--nora-divider)" />
        <MonthAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} barSize={24} />
        <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} barSize={24} />
      </BarChart>
    </ChartContainer>
  )
}

function BarHorizontal() {
  return (
    <ChartContainer config={chartConfig} className={chartShell}>
      <BarChart
        data={chartData}
        accessibilityLayer
        layout="vertical"
        margin={{ left: 4, right: 12, top: 4, bottom: 0 }}
      >
        <XAxis type="number" dataKey="desktop" hide />
        <YAxis
          dataKey="month"
          type="category"
          width={36}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={axisTick}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Bar
          dataKey="desktop"
          fill="var(--color-desktop)"
          radius={[0, 6, 6, 0]}
          barSize={22}
        />
      </BarChart>
    </ChartContainer>
  )
}

function BarStacked() {
  return (
    <ChartContainer config={chartConfig} className={chartShell}>
      <BarChart data={chartData} accessibilityLayer>
        <CartesianGrid vertical={false} stroke="var(--nora-divider)" />
        <MonthAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="desktop"
          stackId="a"
          fill="var(--color-desktop)"
          radius={[0, 0, 4, 4]}
          barSize={36}
        />
        <Bar
          dataKey="mobile"
          stackId="a"
          fill="var(--color-mobile)"
          radius={[4, 4, 0, 0]}
          barSize={36}
        />
      </BarChart>
    </ChartContainer>
  )
}

function BarLabel() {
  return (
    <ChartContainer config={chartConfig} className={chartShell}>
      <BarChart data={chartData} accessibilityLayer margin={{ top: 24 }}>
        <CartesianGrid vertical={false} stroke="var(--nora-divider)" />
        <MonthAxis />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} barSize={36}>
          <LabelList
            position="top"
            offset={8}
            fill="var(--nora-text-secondary)"
            fontSize={11}
            fontFamily="Inter, var(--nora-font), system-ui, sans-serif"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

function BarNegative() {
  return (
    <ChartContainer config={negativeConfig} className={chartShell}>
      <BarChart data={negativeData} accessibilityLayer margin={{ top: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--nora-divider)" />
        <MonthAxis />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel hideIndicator />}
        />
        <Bar dataKey="visitors" radius={4} barSize={36}>
          {negativeData.map((item) => (
            <Cell
              key={item.month}
              fill={
                item.visitors > 0 ? "var(--nora-tint)" : "var(--nora-component)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

function LineMultiple() {
  return (
    <ChartContainer config={chartConfig} className={chartShell}>
      <LineChart data={chartData} accessibilityLayer margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} stroke="var(--nora-divider)" />
        <MonthAxis />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Line
          dataKey="desktop"
          type="monotone"
          stroke="var(--color-desktop)"
          strokeWidth={1.5}
          dot={false}
        />
        <Line
          dataKey="mobile"
          type="monotone"
          stroke="var(--color-mobile)"
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  )
}

function LineDots() {
  return (
    <ChartContainer config={chartConfig} className={chartShell}>
      <LineChart data={chartData} accessibilityLayer margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} stroke="var(--nora-divider)" />
        <MonthAxis />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Line
          dataKey="desktop"
          type="monotone"
          stroke="var(--color-desktop)"
          strokeWidth={1.5}
          dot={{ fill: "var(--color-desktop)", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ChartContainer>
  )
}

function LineStep() {
  return (
    <ChartContainer config={chartConfig} className={chartShell}>
      <LineChart data={chartData} accessibilityLayer margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} stroke="var(--nora-divider)" />
        <MonthAxis />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Line
          dataKey="desktop"
          type="step"
          stroke="var(--color-desktop)"
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  )
}

function LineLabel() {
  return (
    <ChartContainer config={chartConfig} className={chartShell}>
      <LineChart
        data={chartData}
        accessibilityLayer
        margin={{ top: 24, left: 12, right: 12 }}
      >
        <CartesianGrid vertical={false} stroke="var(--nora-divider)" />
        <MonthAxis />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
        <Line
          dataKey="desktop"
          type="monotone"
          stroke="var(--color-desktop)"
          strokeWidth={1.5}
          dot={{ fill: "var(--color-desktop)", r: 3 }}
          activeDot={{ r: 5 }}
        >
          <LabelList
            position="top"
            offset={10}
            fill="var(--nora-text-secondary)"
            fontSize={11}
            fontFamily="Inter, var(--nora-font), system-ui, sans-serif"
          />
        </Line>
      </LineChart>
    </ChartContainer>
  )
}

function PieDefault() {
  return (
    <ChartContainer config={pieConfig} className={squareShell}>
      <PieChart>
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Pie
          data={pieData}
          dataKey="visitors"
          nameKey="browser"
          strokeWidth={0}
          paddingAngle={2}
        />
        <ChartLegend
          content={
            <ChartLegendContent
              nameKey="browser"
              className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
            />
          }
        />
      </PieChart>
    </ChartContainer>
  )
}

function PieDonut() {
  return (
    <ChartContainer config={pieConfig} className={squareShell}>
      <PieChart>
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Pie
          data={pieData}
          dataKey="visitors"
          nameKey="browser"
          innerRadius={56}
          outerRadius={78}
          strokeWidth={0}
          paddingAngle={2}
        />
      </PieChart>
    </ChartContainer>
  )
}

function PieDonutText() {
  const total = React.useMemo(
    () => pieData.reduce((acc, curr) => acc + curr.visitors, 0),
    []
  )

  return (
    <ChartContainer config={pieConfig} className={squareShell}>
      <PieChart>
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Pie
          data={pieData}
          dataKey="visitors"
          nameKey="browser"
          innerRadius={56}
          outerRadius={78}
          strokeWidth={0}
          paddingAngle={2}
        >
          <Label
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-[var(--nora-text)] text-[20px] font-semibold"
                    >
                      {total.toLocaleString()}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 18}
                      className="fill-[var(--nora-text-tertiary)] text-[10px]"
                    >
                      Visitors
                    </tspan>
                  </text>
                )
              }
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}

function PieLabels() {
  return (
    <ChartContainer config={pieConfig} className={squareShell}>
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Pie
          data={pieData}
          dataKey="visitors"
          nameKey="browser"
          label
          strokeWidth={0}
          paddingAngle={2}
        />
      </PieChart>
    </ChartContainer>
  )
}

function PieNoSeparator() {
  return (
    <ChartContainer config={pieConfig} className={squareShell}>
      <PieChart>
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Pie
          data={pieData}
          dataKey="visitors"
          nameKey="browser"
          strokeWidth={0}
        />
      </PieChart>
    </ChartContainer>
  )
}

function RadarDefault() {
  return (
    <ChartContainer config={chartConfig} className={squareShell}>
      <RadarChart data={chartData}>
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <PolarAngleAxis dataKey="month" tick={axisTick} />
        <PolarGrid stroke="var(--nora-divider)" />
        <Radar
          dataKey="desktop"
          fill="var(--color-desktop)"
          fillOpacity={0.35}
          stroke="var(--color-desktop)"
          strokeWidth={1.5}
        />
      </RadarChart>
    </ChartContainer>
  )
}

function RadarMultiple() {
  return (
    <ChartContainer config={chartConfig} className={squareShell}>
      <RadarChart data={chartData}>
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <PolarAngleAxis dataKey="month" tick={axisTick} />
        <PolarGrid stroke="var(--nora-divider)" />
        <Radar
          dataKey="desktop"
          fill="var(--color-desktop)"
          fillOpacity={0.35}
          stroke="var(--color-desktop)"
          strokeWidth={1.5}
        />
        <Radar
          dataKey="mobile"
          fill="var(--color-mobile)"
          fillOpacity={0.25}
          stroke="var(--color-mobile)"
          strokeWidth={1.5}
        />
        <ChartLegend content={<ChartLegendContent />} />
      </RadarChart>
    </ChartContainer>
  )
}

function RadarLinesOnly() {
  return (
    <ChartContainer config={chartConfig} className={squareShell}>
      <RadarChart data={chartData}>
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <PolarAngleAxis dataKey="month" tick={axisTick} />
        <PolarGrid radialLines={false} stroke="var(--nora-divider)" />
        <Radar
          dataKey="desktop"
          fill="var(--color-desktop)"
          fillOpacity={0}
          stroke="var(--color-desktop)"
          strokeWidth={1.5}
        />
      </RadarChart>
    </ChartContainer>
  )
}

function RadarDots() {
  return (
    <ChartContainer config={chartConfig} className={squareShell}>
      <RadarChart data={chartData}>
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <PolarAngleAxis dataKey="month" tick={axisTick} />
        <PolarGrid stroke="var(--nora-divider)" />
        <Radar
          dataKey="desktop"
          fill="var(--color-desktop)"
          fillOpacity={0.35}
          stroke="var(--color-desktop)"
          strokeWidth={1.5}
          dot={{ r: 3, fillOpacity: 1 }}
        />
      </RadarChart>
    </ChartContainer>
  )
}

function RadarGridFilled() {
  return (
    <ChartContainer config={chartConfig} className={squareShell}>
      <RadarChart data={chartData}>
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <PolarGrid
          className="fill-[var(--nora-tint)] opacity-15"
          gridType="circle"
          stroke="var(--nora-divider)"
        />
        <PolarAngleAxis dataKey="month" tick={axisTick} />
        <Radar
          dataKey="desktop"
          fill="var(--color-desktop)"
          fillOpacity={0.4}
          stroke="var(--color-desktop)"
          strokeWidth={1.5}
        />
      </RadarChart>
    </ChartContainer>
  )
}

function RadialSimple() {
  return (
    <ChartContainer config={pieConfig} className={squareShell}>
      <RadialBarChart data={pieData} innerRadius={28} outerRadius={90}>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel nameKey="browser" />}
        />
        <RadialBar dataKey="visitors" background cornerRadius={4}>
          {pieData.map((entry) => (
            <Cell key={entry.browser} fill={entry.fill} />
          ))}
        </RadialBar>
      </RadialBarChart>
    </ChartContainer>
  )
}

function RadialText() {
  return (
    <ChartContainer config={radialTextConfig} className={squareShell}>
      <RadialBarChart
        data={radialSingleData}
        startAngle={0}
        endAngle={250}
        innerRadius={72}
        outerRadius={96}
      >
        <PolarGrid
          gridType="circle"
          radialLines={false}
          stroke="none"
          className="first:fill-[var(--nora-inset)] last:fill-[var(--nora-canvas)]"
          polarRadius={[78, 66]}
        />
        <RadialBar dataKey="visitors" background cornerRadius={10} />
        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
          <Label
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-[var(--nora-text)] text-[20px] font-semibold"
                    >
                      {radialSingleData[0].visitors.toLocaleString()}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 18}
                      className="fill-[var(--nora-text-tertiary)] text-[10px]"
                    >
                      Visitors
                    </tspan>
                  </text>
                )
              }
            }}
          />
        </PolarRadiusAxis>
      </RadialBarChart>
    </ChartContainer>
  )
}

function RadialStacked() {
  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square h-[240px] w-full max-w-[240px]"
    >
      <RadialBarChart
        data={[{ month: "january", desktop: 1260, mobile: 570 }]}
        endAngle={180}
        innerRadius={68}
        outerRadius={100}
        cy="58%"
      >
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
          <Label
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) - 12}
                      className="fill-[var(--nora-text)] text-[20px] font-semibold"
                    >
                      1,830
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 8}
                      className="fill-[var(--nora-text-tertiary)] text-[10px]"
                    >
                      Visitors
                    </tspan>
                  </text>
                )
              }
            }}
          />
        </PolarRadiusAxis>
        <RadialBar
          dataKey="desktop"
          stackId="a"
          cornerRadius={5}
          fill="var(--color-desktop)"
          className="stroke-transparent stroke-2"
        />
        <RadialBar
          dataKey="mobile"
          stackId="a"
          cornerRadius={5}
          fill="var(--color-mobile)"
          className="stroke-transparent stroke-2"
        />
      </RadialBarChart>
    </ChartContainer>
  )
}

function RadialLabel() {
  return (
    <ChartContainer config={pieConfig} className={squareShell}>
      <RadialBarChart
        data={pieData}
        startAngle={-90}
        endAngle={380}
        innerRadius={28}
        outerRadius={96}
      >
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel nameKey="browser" />}
        />
        <RadialBar dataKey="visitors" background cornerRadius={4}>
          <LabelList
            position="insideStart"
            dataKey="browser"
            className="fill-[var(--nora-on-accent)] capitalize mix-blend-luminosity"
            fontSize={10}
          />
          {pieData.map((entry) => (
            <Cell key={entry.browser} fill={entry.fill} />
          ))}
        </RadialBar>
      </RadialBarChart>
    </ChartContainer>
  )
}

const snippet = {
  areaStacked: `<AreaChart data={chartData}>
  <CartesianGrid vertical={false} stroke="var(--nora-divider)" />
  <XAxis dataKey="month" tick={{ fill: "var(--nora-text-tertiary)", fontSize: 11 }} />
  <Area dataKey="desktop" type="monotone" fill="var(--nora-tint)" stroke="var(--nora-tint)" strokeWidth={1.5} />
</AreaChart>`,
  areaLinear: `<Area dataKey="desktop" type="linear" fill="var(--nora-tint)" fillOpacity={0.35} stroke="var(--nora-tint)" />`,
  areaStep: `<Area dataKey="desktop" type="step" fill="var(--nora-tint)" fillOpacity={0.35} stroke="var(--nora-tint)" />`,
  areaGradient: `<defs>
  <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="var(--nora-tint)" style={{ stopOpacity: "var(--dash-chart-fill)" }} />
    <stop offset="100%" stopColor="var(--nora-tint)" stopOpacity={0.04} />
  </linearGradient>
</defs>`,
  areaLegend: `<ChartLegend content={<ChartLegendContent />} />`,
  barMultiple: `<Bar dataKey="desktop" fill="var(--nora-tint)" radius={4} barSize={24} />
<Bar dataKey="mobile" fill="var(--nora-component)" radius={4} barSize={24} />`,
  barHorizontal: `<BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 12 }}>
  <XAxis type="number" hide />
  <YAxis dataKey="month" type="category" width={36} tick={{ fill: "var(--nora-text-tertiary)", fontSize: 11 }} />
  <Bar dataKey="desktop" fill="var(--nora-tint)" radius={[0, 6, 6, 0]} barSize={22} />
</BarChart>`,
  barStacked: `<Bar dataKey="desktop" stackId="a" fill="var(--nora-tint)" />
<Bar dataKey="mobile" stackId="a" fill="var(--nora-component)" />`,
  barLabel: `<Bar dataKey="desktop" fill="var(--nora-tint)">
  <LabelList position="top" fill="var(--nora-text-secondary)" fontSize={11} />
</Bar>`,
  barNegative: `<Bar dataKey="visitors">
  {data.map((item) => (
    <Cell key={item.month} fill={item.visitors > 0 ? "var(--nora-tint)" : "var(--nora-component)"} />
  ))}
</Bar>`,
  lineMultiple: `<Line dataKey="desktop" type="monotone" stroke="var(--nora-tint)" strokeWidth={1.5} dot={false} />
<Line dataKey="mobile" type="monotone" stroke="var(--nora-component)" strokeWidth={1.5} dot={false} />`,
  lineDots: `<Line dataKey="desktop" type="monotone" stroke="var(--nora-tint)" strokeWidth={1.5} dot={{ r: 3 }} />`,
  lineStep: `<Line dataKey="desktop" type="step" stroke="var(--nora-tint)" strokeWidth={1.5} />`,
  lineLabel: `<Line dataKey="desktop" type="monotone" stroke="var(--nora-tint)">
  <LabelList position="top" fill="var(--nora-text-secondary)" fontSize={11} />
</Line>`,
  pieDefault: `<Pie data={pieData} dataKey="visitors" nameKey="browser" strokeWidth={0} paddingAngle={2} />`,
  pieDonut: `<Pie innerRadius={56} outerRadius={78} strokeWidth={0} paddingAngle={2} />`,
  pieDonutText: `<Pie innerRadius={56} outerRadius={78}>
  <Label content={/* center total */} />
</Pie>`,
  pieLabels: `<Pie data={pieData} dataKey="visitors" nameKey="browser" label strokeWidth={0} />`,
  pieNoSeparator: `<Pie strokeWidth={0} />`,
  radarDefault: `<RadarChart data={chartData}>
  <PolarAngleAxis dataKey="month" tick={{ fill: "var(--nora-text-tertiary)", fontSize: 11 }} />
  <PolarGrid stroke="var(--nora-divider)" />
  <Radar dataKey="desktop" fill="var(--nora-tint)" fillOpacity={0.35} strokeWidth={1.5} />
</RadarChart>`,
  radarMultiple: `<Radar dataKey="desktop" fill="var(--nora-tint)" fillOpacity={0.35} />
<Radar dataKey="mobile" fill="var(--nora-component)" fillOpacity={0.25} />`,
  radarLinesOnly: `<Radar fillOpacity={0} stroke="var(--nora-tint)" strokeWidth={1.5} />`,
  radarDots: `<Radar fill="var(--nora-tint)" fillOpacity={0.35} dot={{ r: 3 }} />`,
  radarGridFilled: `<PolarGrid className="fill-[var(--nora-tint)] opacity-15" gridType="circle" />`,
  radialSimple: `<RadialBar dataKey="visitors" background cornerRadius={4} />`,
  radialText: `<RadialBarChart innerRadius={80} outerRadius={110}>
  <RadialBar dataKey="visitors" background cornerRadius={10} />
</RadialBarChart>`,
  radialStacked: `<RadialBar dataKey="desktop" stackId="a" fill="var(--nora-tint)" />
<RadialBar dataKey="mobile" stackId="a" fill="var(--nora-component)" />`,
  radialLabel: `<RadialBar dataKey="visitors" background>
  <LabelList position="insideStart" dataKey="browser" />
</RadialBar>`,
}

export const chartDoc: ComponentDoc = {
  id: "chart",
  examples: [
    {
      title: "Area — Stacked",
      description: "Stacked area series with tooltip.",
      code: snippet.areaStacked,
      render: () => <AreaStacked />,
    },
    {
      title: "Area — Linear",
      description: "Single series with linear interpolation.",
      code: snippet.areaLinear,
      render: () => <AreaLinear />,
    },
    {
      title: "Area — Step",
      description: "Step curve for discrete changes.",
      code: snippet.areaStep,
      render: () => <AreaStep />,
    },
    {
      title: "Area — Gradient",
      description: "Stacked areas with Nora gradient fills.",
      code: snippet.areaGradient,
      render: () => <AreaGradient />,
    },
    {
      title: "Area — Legend",
      description: "Stacked area with chart legend.",
      code: snippet.areaLegend,
      render: () => <AreaLegend />,
    },
    {
      title: "Bar — Multiple",
      description: "Side-by-side bar comparison.",
      code: snippet.barMultiple,
      render: () => <BarMultiple />,
    },
    {
      title: "Bar — Horizontal",
      description: "Horizontal bars with month labels.",
      code: snippet.barHorizontal,
      render: () => <BarHorizontal />,
    },
    {
      title: "Bar — Stacked",
      description: "Stacked bars with legend.",
      code: snippet.barStacked,
      render: () => <BarStacked />,
    },
    {
      title: "Bar — Label",
      description: "Values rendered above each bar.",
      code: snippet.barLabel,
      render: () => <BarLabel />,
    },
    {
      title: "Bar — Negative",
      description: "Positive and negative values colored differently.",
      code: snippet.barNegative,
      render: () => <BarNegative />,
    },
    {
      title: "Line — Multiple",
      description: "Multi-series line chart.",
      code: snippet.lineMultiple,
      render: () => <LineMultiple />,
    },
    {
      title: "Line — Dots",
      description: "Line with visible dots and active marker.",
      code: snippet.lineDots,
      render: () => <LineDots />,
    },
    {
      title: "Line — Step",
      description: "Step interpolation.",
      code: snippet.lineStep,
      render: () => <LineStep />,
    },
    {
      title: "Line — Label",
      description: "Value labels on data points.",
      code: snippet.lineLabel,
      render: () => <LineLabel />,
    },
    {
      title: "Pie — Default",
      description: "Pie chart with legend.",
      code: snippet.pieDefault,
      render: () => <PieDefault />,
    },
    {
      title: "Pie — Donut",
      description: "Pie with inner radius.",
      code: snippet.pieDonut,
      render: () => <PieDonut />,
    },
    {
      title: "Pie — Donut with text",
      description: "Center label showing total.",
      code: snippet.pieDonutText,
      render: () => <PieDonutText />,
    },
    {
      title: "Pie — Labels",
      description: "Slice labels around the pie.",
      code: snippet.pieLabels,
      render: () => <PieLabels />,
    },
    {
      title: "Pie — No separator",
      description: "Solid pie without stroke gaps.",
      code: snippet.pieNoSeparator,
      render: () => <PieNoSeparator />,
    },
    {
      title: "Radar — Default",
      description: "Filled radar polygon.",
      code: snippet.radarDefault,
      render: () => <RadarDefault />,
    },
    {
      title: "Radar — Multiple",
      description: "Two series with legend.",
      code: snippet.radarMultiple,
      render: () => <RadarMultiple />,
    },
    {
      title: "Radar — Lines only",
      description: "Stroke-only radar outline.",
      code: snippet.radarLinesOnly,
      render: () => <RadarLinesOnly />,
    },
    {
      title: "Radar — Dots",
      description: "Radar with vertex dots.",
      code: snippet.radarDots,
      render: () => <RadarDots />,
    },
    {
      title: "Radar — Grid filled",
      description: "Circular grid with translucent fill.",
      code: snippet.radarGridFilled,
      render: () => <RadarGridFilled />,
    },
    {
      title: "Radial — Simple",
      description: "Multi-ring radial bars.",
      code: snippet.radialSimple,
      render: () => <RadialSimple />,
    },
    {
      title: "Radial — Text",
      description: "Gauge-like radial with center text.",
      code: snippet.radialText,
      render: () => <RadialText />,
    },
    {
      title: "Radial — Stacked",
      description: "Stacked radial bars with total.",
      code: snippet.radialStacked,
      render: () => <RadialStacked />,
    },
    {
      title: "Radial — Label",
      description: "Labels inside radial segments.",
      code: snippet.radialLabel,
      render: () => <RadialLabel />,
    },
    ...chartShowcaseExamples,
  ],
}
