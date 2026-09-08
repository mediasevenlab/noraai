import * as React from "react"
import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  Line,
  LineChart,
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
  ChartAxisY,
  ChartGrid,
  ChartTooltipPreset,
  chartShell as getChartShell,
  chartTheme,
} from "@/components/charts"

import type { DemoExample } from "./types"

const axisTick = chartTheme.axisTick
const chartShell = getChartShell("docs")
const tallShell = `${chartShell} h-[260px]`

/* ─── 1. Area ×3 ─────────────────────────────────────────── */

const weekData = [
  { day: "Mon", alpha: 42, beta: 18, gamma: 12 },
  { day: "Tue", alpha: 48, beta: 22, gamma: 16 },
  { day: "Wed", alpha: 38, beta: 14, gamma: 10 },
  { day: "Thu", alpha: 57, beta: 15, gamma: 15 },
  { day: "Fri", alpha: 52, beta: 28, gamma: 20 },
  { day: "Sat", alpha: 44, beta: 24, gamma: 18 },
  { day: "Sun", alpha: 50, beta: 30, gamma: 22 },
]

const weekConfig = {
  alpha: { label: "Series A", color: "var(--nora-tint)" },
  beta: { label: "Series B", color: "var(--nora-tint-dark)" },
  gamma: { label: "Series C", color: "var(--nora-success)" },
} satisfies ChartConfig

function ShowcaseAreaTriple() {
  return (
    <ChartContainer config={weekConfig} className={chartShell}>
      <AreaChart data={weekData} accessibilityLayer margin={{ left: 8, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="sc-a" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-alpha)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="var(--color-alpha)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="sc-b" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-beta)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--color-beta)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="sc-c" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-gamma)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--color-gamma)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <ChartGrid dashed />
        <ChartAxisX dataKey="day" />
        <ChartAxisY width={28} domain={[0, 60]} />
        <ChartTooltipPreset />
        <Area
          dataKey="alpha"
          type="monotone"
          fill="url(#sc-a)"
          stroke="var(--color-alpha)"
          strokeWidth={1.5}
          dot={{ r: 3, fill: "var(--color-alpha)", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
        <Area
          dataKey="beta"
          type="monotone"
          fill="url(#sc-b)"
          stroke="var(--color-beta)"
          strokeWidth={1.5}
          dot={{ r: 3, fill: "var(--color-beta)", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
        <Area
          dataKey="gamma"
          type="monotone"
          fill="url(#sc-c)"
          stroke="var(--color-gamma)"
          strokeWidth={1.5}
          dot={{ r: 3, fill: "var(--color-gamma)", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  )
}

/* ─── 2. Smooth dual line ────────────────────────────────── */

const knobsData = [
  { k: "K01", a: 40, b: 12 },
  { k: "K02", a: 28, b: 18 },
  { k: "K03", a: 36, b: 14 },
  { k: "K04", a: 22, b: 20 },
  { k: "K05", a: 30, b: 13 },
  { k: "K06", a: 18, b: 24 },
  { k: "K07", a: 26, b: 16 },
  { k: "K08", a: 14, b: 22 },
  { k: "K09", a: 20, b: 10 },
  { k: "K10", a: 16, b: 18 },
]

const knobsConfig = {
  a: { label: "Series A", color: "var(--nora-tint)" },
  b: { label: "Series B", color: "var(--nora-success)" },
} satisfies ChartConfig

function ShowcaseLineSmooth() {
  return (
    <ChartContainer config={knobsConfig} className={chartShell}>
      <LineChart data={knobsData} accessibilityLayer margin={{ left: 8, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="var(--nora-divider)" />
        <XAxis dataKey="k" tickLine={false} axisLine={false} tickMargin={8} tick={axisTick} />
        <YAxis tickLine={false} axisLine={false} width={28} tick={axisTick} domain={[0, 48]} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          dataKey="a"
          type="monotone"
          stroke="var(--color-a)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5 }}
        />
        <Line
          dataKey="b"
          type="monotone"
          stroke="var(--color-b)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5 }}
        />
        <ChartLegend content={<ChartLegendContent />} />
      </LineChart>
    </ChartContainer>
  )
}

/* ─── 3. 3D isometric bars ───────────────────────────────── */

const isoBars = [
  { month: "Jan", value: 25 },
  { month: "Feb", value: 76 },
  { month: "Mar", value: 39 },
  { month: "Apr", value: 52 },
]

function useGrowProgress(
  ref: React.RefObject<HTMLElement | null>,
  duration = 1000,
  /** Смена ключа — перезапуск grow (например при смене датасета) */
  resetKey?: string | number
) {
  const [progress, setProgress] = React.useState(0)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    let started = false
    setProgress(0)
    const run = () => {
      if (started) return
      started = true
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        setProgress(1 - (1 - t) ** 3)
        if (t < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          run()
          io.disconnect()
        }
      },
      { threshold: 0.35 }
    )
    io.observe(el)
    // если уже в viewport (смена датасета) — сразу
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      run()
      io.disconnect()
    }
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [ref, duration, resetKey])
  return progress
}

export type IsoBarDatum = { month: string; value: number }
export type CylBarDatum = { month: string; value: number; color: string }

type BarTip = {
  month: string
  value: number
  x: number
  y: number
  color?: string
}

/**
 * Как ChartTooltipContent. Позиция и анимация на разных слоях:
 * zoom-in на том же элементе сбивал -translate → тултип падал вниз.
 */
function ChartTip({ tip }: { tip: BarTip | null }) {
  if (!tip) return null

  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full transition-[left,top,opacity] duration-200 ease-out will-change-[left,top,opacity]"
      style={{
        left: tip.x,
        top: tip.y,
        opacity: 1,
        marginTop: -10,
      }}
    >
      <div className="grid min-w-28 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
        <div className="font-medium text-foreground">
          {tip.month}
        </div>
        <div className="flex items-center gap-2">
          <div
            className="size-2.5 shrink-0 rounded-[2px]"
            style={{
              background: tip.color ?? "var(--nora-success)",
            }}
          />
          <span className="text-muted-foreground">Value</span>
          <span className="ml-auto font-medium text-foreground tabular-nums">
            {tip.value}%
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Изометрия: угол к зрителю.
 * Ромб сплющен сильнее классики (~2.4:1).
 * Свет сверху-слева: top mint / left mid / right shadow.
 * Glass — только над fill (иначе серые швы и «рамки»).
 */
const ISO_COS = Math.cos(Math.PI / 6)
const ISO_SIN = 0.36 // сильнее сплющить ромб, как на референсе

function isoProject(
  ox: number,
  oy: number,
  x: number,
  y: number,
  z: number
) {
  return {
    x: ox + (x - y) * ISO_COS,
    y: oy - (x + y) * ISO_SIN - z,
  }
}

function isoPoly(
  ox: number,
  oy: number,
  pts: Array<[number, number, number]>
) {
  return (
    pts
      .map(([x, y, z], i) => {
        const p = isoProject(ox, oy, x, y, z)
        return `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`
      })
      .join(" ") + " Z"
  )
}

function IsoBar({
  ox,
  oy,
  value,
  progress,
  size = 30,
  maxH = 112,
  active,
}: {
  ox: number
  oy: number
  value: number
  progress: number
  size?: number
  maxH?: number
  active?: boolean
}) {
  const h = Math.max(0.5, (value / 100) * maxH * progress)
  const s = size
  const glow = active ? 1.15 : 1

  // сплошной столбец — мягкий объём, без жёсткой тени
  const faceTop = "color-mix(in srgb, var(--nora-success) 55%, white)"
  const faceLeft = "color-mix(in srgb, var(--nora-success) 90%, white)"
  const faceRight = "color-mix(in srgb, var(--nora-success) 82%, black)"

  const leftFace = (z0: number, z1: number) =>
    isoPoly(ox, oy, [
      [0, 0, z0],
      [0, s, z0],
      [0, s, z1],
      [0, 0, z1],
    ])
  const rightFace = (z0: number, z1: number) =>
    isoPoly(ox, oy, [
      [0, 0, z0],
      [s, 0, z0],
      [s, 0, z1],
      [0, 0, z1],
    ])
  const cap = (z: number) =>
    isoPoly(ox, oy, [
      [0, 0, z],
      [s, 0, z],
      [s, s, z],
      [0, s, z],
    ])

  const shellH0 = Math.min(h, maxH)
  const hasShell = shellH0 < maxH - 0.5

  /**
   * Один и тот же footprint (size): glass = внешний призмы, fill = внутри.
   * Порядок: полный glass → solid → верх glass снова,
   * чтобы рёбра крышки fill совпали с вертикалями shell (а не перекрывали их).
   */
  return (
    <g style={{ shapeRendering: "geometricPrecision" }}>
      {/* 1) полный полупрозрачный стакан */}
      <path
        d={leftFace(0, maxH)}
        fill="var(--nora-success)"
        fillOpacity={0.2 * glow}
      />
      <path
        d={rightFace(0, maxH)}
        fill="color-mix(in srgb, var(--nora-success) 85%, black)"
        fillOpacity={0.22 * glow}
      />
      <path
        d={cap(maxH)}
        fill="var(--nora-success)"
        fillOpacity={0.16 * glow}
      />

      {/* 2) непрозрачная заливка значения — тот же размер сечения */}
      {h > 1 && (
        <g>
          <path d={leftFace(0, h)} fill={faceLeft} />
          <path d={rightFace(0, h)} fill={faceRight} />
          <path d={cap(h)} fill={faceTop} />
        </g>
      )}

      {/* 3) верх shell поверх — грани стыкуются с крышкой fill */}
      {hasShell && (
        <g>
          <path
            d={leftFace(shellH0, maxH)}
            fill="var(--nora-success)"
            fillOpacity={0.2 * glow}
          />
          <path
            d={rightFace(shellH0, maxH)}
            fill="color-mix(in srgb, var(--nora-success) 85%, black)"
            fillOpacity={0.22 * glow}
          />
          <path
            d={cap(maxH)}
            fill="var(--nora-success)"
            fillOpacity={0.16 * glow}
          />
        </g>
      )}
    </g>
  )
}

export function ShowcaseIsoBars({
  data = isoBars,
  className,
  dashboard = false,
}: {
  data?: IsoBarDatum[]
  className?: string
  /** Единый plot dashboard: без оси, baseline у нижней границы */
  dashboard?: boolean
}) {
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const resetKey = data.map((d) => `${d.month}:${d.value}`).join("|")
  const progress = useGrowProgress(wrapRef, 1000, resetKey)
  const [tip, setTip] = React.useState<BarTip | null>(null)
  const size = 30
  const footprint = size * ISO_COS
  const maxH = dashboard ? 136 : 112
  const oy = dashboard ? 190 : 162
  const topY = oy - maxH - size * ISO_SIN * 2
  const percentY = dashboard ? 16 : topY - 14
  const monthY = oy + 16
  const viewH = dashboard ? 190 : monthY + 14

  return (
    <div ref={wrapRef} className={className ?? "relative w-full max-w-md"}>
      <ChartTip tip={tip} />
      <svg
        viewBox={`0 0 360 ${viewH}`}
        className={dashboard ? "h-full w-full" : "h-[200px] w-full"}
        preserveAspectRatio={dashboard ? "none" : undefined}
        role="img"
        aria-label="3D isometric bar chart"
      >
        {data.map((item, i) => {
          const ox = dashboard ? 60 + i * 80 : 52 + i * 82
          const top = isoProject(ox, oy, size / 2, size / 2, maxH)
          return (
            <g
              key={item.month}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => {
                const svg = wrapRef.current?.querySelector("svg")
                if (!svg) return
                const svgRect = svg.getBoundingClientRect()
                const scaleX = svgRect.width / 360
                const scaleY = svgRect.height / viewH
                setTip({
                  month: item.month,
                  value: item.value,
                  color: "var(--nora-success)",
                  x: top.x * scaleX,
                  y: (top.y - 6) * scaleY,
                })
              }}
              onMouseLeave={() => setTip(null)}
            >
              <text
                x={ox}
                y={percentY}
                textAnchor="middle"
                fill="var(--nora-text-secondary)"
                fontSize={12}
                fontFamily="Inter, var(--nora-font), system-ui, sans-serif"
                opacity={0.35 + progress * 0.65}
              >
                {item.value}%
              </text>
              <IsoBar
                ox={ox}
                oy={oy}
                value={item.value}
                progress={progress}
                size={size}
                maxH={maxH}
                active={tip?.month === item.month}
              />
              <rect
                x={ox - footprint - 8}
                y={topY - 8}
                width={footprint * 2 + 16}
                height={oy - topY + 24}
                fill="transparent"
              />
              {!dashboard ? (
                <text
                  x={ox}
                  y={monthY}
                  textAnchor="middle"
                  fill="var(--nora-text-tertiary)"
                  fontSize={11}
                  fontFamily="Inter, var(--nora-font), system-ui, sans-serif"
                >
                  {item.month}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* ─── 4. 3D cylinders (как на референсе) ─────────────────── */

const cylBars = [
  { month: "Jan", value: 25, color: "var(--nora-tint)" },
  {
    month: "Feb",
    value: 76,
    color: "color-mix(in srgb, var(--nora-tint) 55%, var(--nora-success))",
  },
  {
    month: "Mar",
    value: 39,
    color: "color-mix(in srgb, var(--nora-tint) 22%, var(--nora-success))",
  },
  { month: "Apr", value: 52, color: "var(--nora-success)" },
]

function CylinderBar({
  x,
  value,
  color,
  progress,
  maxH = 120,
  baseY = 155,
  rx = 24,
  ry = 8,
  active,
}: {
  x: number
  value: number
  color: string
  progress: number
  maxH?: number
  baseY?: number
  rx?: number
  ry?: number
  active?: boolean
}) {
  const h = Math.max(0.5, (value / 100) * maxH * progress)
  const fillTop = baseY - h
  const shellTop = baseY - maxH
  const lid = `color-mix(in srgb, ${color} 55%, white)`
  const glassOpacity = active ? 0.2 : 0.16
  // однородный тон крышки (не fillOpacity — иначе низ овала темнее из‑за стенки)
  const glassTop = `color-mix(in srgb, ${color} ${active ? 38 : 32}%, var(--nora-bg))`

  return (
    <g style={{ shapeRendering: "geometricPrecision" }}>
      {/* стенки + основание track */}
      <g opacity={glassOpacity}>
        <ellipse cx={x} cy={baseY} rx={rx} ry={ry} fill={color} />
        <rect
          x={x - rx}
          y={shellTop}
          width={rx * 2}
          height={maxH}
          fill={color}
        />
      </g>

      {/* fill: тело + светлая крышка */}
      {h > 1 && (
        <g>
          <ellipse cx={x} cy={baseY} rx={rx} ry={ry} fill={color} />
          <rect
            x={x - rx}
            y={fillTop}
            width={rx * 2}
            height={h}
            fill={color}
          />
          <ellipse cx={x} cy={fillTop} rx={rx} ry={ry} fill={lid} />
        </g>
      )}

      {/* верх track — сплошной однородный овал */}
      <ellipse cx={x} cy={shellTop} rx={rx} ry={ry} fill={glassTop} />
    </g>
  )
}

export function ShowcaseCylinders({
  data = cylBars,
  className,
  dashboard = false,
}: {
  data?: CylBarDatum[]
  className?: string
  /** Единый plot dashboard: без оси, baseline у нижней границы */
  dashboard?: boolean
}) {
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const resetKey = data.map((d) => `${d.month}:${d.value}`).join("|")
  const progress = useGrowProgress(wrapRef, 1000, resetKey)
  const [tip, setTip] = React.useState<BarTip | null>(null)
  // В dashboard сохраняем исходную пропорцию эллипса (24×8).
  const rx = 24
  const ry = 8
  const maxH = dashboard ? 136 : 128
  const percentY = dashboard ? 16 : 18
  // Нижняя точка овала = 190, совпадает с baseline остальных plot.
  const baseY = dashboard ? 182 : percentY + 14 + ry + maxH
  const shellTop = baseY - maxH
  const monthY = baseY + ry + 16
  const viewW = dashboard ? 360 : 380
  const viewH = dashboard ? 190 : monthY + 14

  return (
    <div ref={wrapRef} className={className ?? "relative w-full max-w-md"}>
      <ChartTip tip={tip} />
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        className={dashboard ? "h-full w-full" : "h-[220px] w-full"}
        preserveAspectRatio={dashboard ? "none" : undefined}
        role="img"
        aria-label="3D cylinder bar chart"
      >
        {data.map((item, i) => {
          const x = dashboard ? 60 + i * 80 : 52 + i * 90
          return (
            <g
              key={item.month}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => {
                const svg = wrapRef.current?.querySelector("svg")
                if (!svg) return
                const svgRect = svg.getBoundingClientRect()
                const scaleX = svgRect.width / viewW
                const scaleY = svgRect.height / viewH
                setTip({
                  month: item.month,
                  value: item.value,
                  color: item.color,
                  x: x * scaleX,
                  y: (shellTop - ry - 6) * scaleY,
                })
              }}
              onMouseLeave={() => setTip(null)}
            >
              <text
                x={x}
                y={percentY}
                textAnchor="middle"
                fill="var(--nora-text-secondary)"
                fontSize={12}
                fontFamily="Inter, var(--nora-font), system-ui, sans-serif"
                opacity={0.35 + progress * 0.65}
              >
                {item.value}%
              </text>
              <CylinderBar
                x={x}
                value={item.value}
                color={item.color}
                progress={progress}
                maxH={maxH}
                baseY={baseY}
                rx={rx}
                ry={ry}
                active={tip?.month === item.month}
              />
              <rect
                x={x - rx - 8}
                y={shellTop - ry - 8}
                width={rx * 2 + 16}
                height={maxH + ry * 2 + 24}
                fill="transparent"
              />
              {!dashboard ? (
                <text
                  x={x}
                  y={monthY}
                  textAnchor="middle"
                  fill="var(--nora-text-tertiary)"
                  fontSize={11}
                  fontFamily="Inter, var(--nora-font), system-ui, sans-serif"
                >
                  {item.month}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* ─── 5. Area + brush ────────────────────────────────────── */

const BRUSH_Y_MAX = 6000

const brushData = Array.from({ length: 48 }, (_, i) => {
  const month = Math.floor(i / 4) + 1
  const day = (i % 4) * 7 + 1
  // амплитуда ближе к шкале 0–6000, как на референсе
  const base =
    3200 +
    Math.sin(i / 2.4) * 1400 +
    Math.cos(i / 5.5) * 600 +
    (i % 6) * 70
  const drop = i > 40 ? (i - 40) * 320 : 0
  return {
    // уникальные даты — иначе activeDot и cursor разъезжаются
    date: `2021-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    value: Math.max(200, Math.min(BRUSH_Y_MAX, Math.round(base - drop))),
  }
})

const brushLast = brushData.length - 1
const brushMonth = (v: unknown) => String(v).slice(0, 7)

const brushConfig = {
  value: { label: "Value", color: "var(--nora-success)" },
} satisfies ChartConfig

function brushTraveller({
  x,
  y,
  width,
  height,
}: {
  x: number
  y: number
  width: number
  height: number
}) {
  const lineY = Math.floor(y + height / 2) - 1
  return (
    <>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="var(--nora-success)"
        stroke="none"
      />
      <line
        x1={x + 1}
        y1={lineY}
        x2={x + width - 1}
        y2={lineY}
        stroke="white"
      />
      <line
        x1={x + 1}
        y1={lineY + 2}
        x2={x + width - 1}
        y2={lineY + 2}
        stroke="white"
      />
    </>
  )
}

/** Sparkline в brush: тот же domain, что у основного Area (Recharts panorama сплющивает шкалу). */
function BrushSparkline({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  data,
  margin,
}: {
  x?: number
  y?: number
  width?: number
  height?: number
  data?: Array<{ value: number }>
  margin?: { top?: number; right?: number; bottom?: number; left?: number }
  compact?: boolean
}) {
  if (!data?.length || width <= 0 || height <= 0) return null
  const padT = margin?.top ?? 2
  const padB = margin?.bottom ?? 2
  const padL = margin?.left ?? 1
  const padR = margin?.right ?? 1
  const innerW = Math.max(1, width - padL - padR)
  const innerH = Math.max(1, height - padT - padB)
  const n = data.length
  const points = data
    .map((d, i) => {
      const px = x + padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
      const py =
        y + padT + (1 - Math.min(1, Math.max(0, d.value / BRUSH_Y_MAX))) * innerH
      return `${px.toFixed(2)},${py.toFixed(2)}`
    })
    .join(" ")

  return (
    <polyline
      points={points}
      fill="none"
      stroke="var(--nora-text-tertiary)"
      strokeWidth={1}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  )
}

function ShowcaseBrushArea() {
  return (
    <ChartContainer
      config={brushConfig}
      className={`${tallShell} [&_.recharts-brush>rect:first-child]:stroke-none [&_.recharts-brush-texts_text]:fill-[var(--nora-text-secondary)] [&_.recharts-brush-texts_text]:text-[11px]`}
    >
      <AreaChart
        data={brushData}
        accessibilityLayer
        margin={{ left: 8, right: 8, top: 8, bottom: 4 }}
      >
        <defs>
          <linearGradient id="sc-brush" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.4} />
            <stop
              offset="100%"
              stopColor="var(--color-value)"
              stopOpacity={0.02}
            />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          strokeDasharray="3 3"
          stroke="var(--nora-divider)"
        />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={axisTick}
          minTickGap={48}
          tickFormatter={brushMonth}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={36}
          tick={axisTick}
          domain={[0, BRUSH_Y_MAX]}
        />
        <ChartTooltip
          content={<ChartTooltipContent labelFormatter={(v) => brushMonth(v)} />}
        />
        <Area
          dataKey="value"
          type="monotone"
          fill="url(#sc-brush)"
          stroke="var(--color-value)"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <Brush
          dataKey="date"
          height={28}
          stroke="var(--nora-success)"
          fill="color-mix(in srgb, var(--nora-success) 14%, var(--nora-inset))"
          travellerWidth={8}
          traveller={brushTraveller}
          alwaysShowText
          tickFormatter={(v, index) =>
            index === 0 || index === brushLast ? "" : brushMonth(v)
          }
          padding={{ top: 3, bottom: 3, left: 2, right: 2 }}
        >
          <BrushSparkline />
        </Brush>
      </AreaChart>
    </ChartContainer>
  )
}

/* ─── Liquid fill ────────────────────────────────────────── */

/** Период волны в viewBox-единицах — сдвиг анимации ровно на 1 период. */
const LIQUID_WAVE_PERIOD = 40

function liquidWavePath(y: number, amp: number, width = 240) {
  // симметричная синусоида: путь стыкуется сам с собой через period
  const segs: string[] = [`M0 ${y}`]
  for (let x = 0; x < width; x += LIQUID_WAVE_PERIOD) {
    const mid = x + LIQUID_WAVE_PERIOD / 2
    const end = x + LIQUID_WAVE_PERIOD
    segs.push(
      `Q${x + LIQUID_WAVE_PERIOD / 4} ${y - amp} ${mid} ${y}`,
      `Q${x + (LIQUID_WAVE_PERIOD * 3) / 4} ${y + amp} ${end} ${y}`
    )
  }
  segs.push(`V120 H0 Z`)
  return segs.join(" ")
}

function LiquidGauge({
  value,
  color,
  colorDeep,
  label,
}: {
  value: number
  color: string
  colorDeep: string
  label: string
}) {
  const id = React.useId().replace(/:/g, "")
  const level = 100 - value
  const waveY = 16 + (level / 100) * 88

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        viewBox="0 0 120 120"
        className="size-[140px]"
        role="img"
        aria-label={`${label} liquid gauge ${value}%`}
      >
        <defs>
          <clipPath id={`liquid-clip-${id}`}>
            <circle cx="60" cy="60" r="52" />
          </clipPath>
          {/* только вертикальный градиент на статичном теле — не на движущейся волне */}
          <linearGradient
            id={`liquid-grad-${id}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={colorDeep} />
          </linearGradient>
          <style>{`
            @keyframes chart-wave-${id} {
              from { transform: translateX(0); }
              to { transform: translateX(-${LIQUID_WAVE_PERIOD}px); }
            }
            .chart-wave-${id},
            .chart-wave-slow-${id} {
              transform-box: view-box;
              transform-origin: 0 0;
              animation-timing-function: linear;
              animation-iteration-count: infinite;
            }
            .chart-wave-${id} {
              animation-name: chart-wave-${id};
              animation-duration: 2s;
            }
            .chart-wave-slow-${id} {
              animation-name: chart-wave-${id};
              animation-duration: 3s;
            }
          `}</style>
        </defs>
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="var(--nora-inset)"
          stroke="var(--nora-border-strong)"
          strokeWidth={1.5}
        />
        <g clipPath={`url(#liquid-clip-${id})`}>
          <rect
            x="0"
            y={waveY}
            width="120"
            height={120 - waveY}
            fill={`url(#liquid-grad-${id})`}
            opacity={0.4}
          />
          <g className={`chart-wave-slow-${id}`}>
            <path
              d={liquidWavePath(waveY + 3, 5)}
              fill={colorDeep}
              opacity={0.5}
            />
          </g>
          <g className={`chart-wave-${id}`}>
            <path
              d={liquidWavePath(waveY, 7)}
              fill={color}
              opacity={0.92}
            />
          </g>
        </g>
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="var(--nora-border-strong)"
          strokeWidth={1.5}
        />
        <text
          x="60"
          y="64"
          textAnchor="middle"
          fill="var(--nora-text)"
          fontSize={18}
          fontWeight={600}
          fontFamily="Inter, var(--nora-font), system-ui, sans-serif"
        >
          {value.toFixed(1)}%
        </text>
      </svg>
    </div>
  )
}

function ShowcaseLiquidGreen() {
  return (
    <LiquidGauge
      value={8.6}
      color="var(--nora-success)"
      colorDeep="color-mix(in srgb, var(--nora-success) 70%, #000)"
      label="Green"
    />
  )
}

function ShowcaseLiquidBlue() {
  return (
    <LiquidGauge
      value={54.1}
      color="var(--nora-tint)"
      colorDeep="color-mix(in srgb, var(--nora-tint) 65%, #000)"
      label="Blue"
    />
  )
}

function ShowcaseLiquidPurple() {
  return (
    <LiquidGauge
      value={92.1}
      color="var(--nora-component)"
      colorDeep="color-mix(in srgb, var(--nora-error) 45%, var(--nora-component))"
      label="Purple"
    />
  )
}

/* ─── Export ─────────────────────────────────────────────── */

export const chartShowcaseExamples: DemoExample[] = [
  {
    title: "Showcase — Area triple",
    description: "Three gradient areas with dots, legend and tooltip.",
    code: `<AreaChart data={weekData}>
  <Area dataKey="alpha" type="monotone" fill="url(#sc-a)" stroke="var(--nora-tint)" dot />
  <Area dataKey="beta" type="monotone" fill="url(#sc-b)" stroke="var(--nora-tint-dark)" dot />
  <Area dataKey="gamma" type="monotone" fill="url(#sc-c)" stroke="var(--nora-success)" dot />
  <ChartLegend content={<ChartLegendContent />} />
</AreaChart>`,
    render: () => <ShowcaseAreaTriple />,
  },
  {
    title: "Showcase — Smooth lines",
    description: "Dual monotone lines on a dotted grid (K01–K10).",
    code: `<LineChart data={knobsData}>
  <CartesianGrid strokeDasharray="2 4" />
  <Line dataKey="a" type="monotone" stroke="var(--nora-tint)" strokeWidth={2} dot={false} />
  <Line dataKey="b" type="monotone" stroke="var(--nora-success)" strokeWidth={2} dot={false} />
</LineChart>`,
    render: () => <ShowcaseLineSmooth />,
  },
  {
    title: "Showcase — 3D isometric bars",
    description: "Glass shell columns with grow animation and hover tooltip.",
    code: `// SVG isometric bars + requestAnimationFrame grow + hover tip
<ShowcaseIsoBars />`,
    render: () => <ShowcaseIsoBars />,
  },
  {
    title: "Showcase — 3D cylinders",
    description: "Cylindrical bars with grow animation and hover tooltip.",
    code: `// SVG cylinders + grow animation + hover tip
<ShowcaseCylinders />`,
    render: () => <ShowcaseCylinders />,
  },
  {
    title: "Showcase — Area with brush",
    description: "Area chart with range brush / mini-map.",
    code: `<Brush dataKey="date" height={28} alwaysShowText
  tickFormatter={(v, i) => (i === 0 || i === last ? "" : month(v))}>
  <BrushSparkline /> {/* same 0–6000 scale as main Area */}
</Brush>`,
    render: () => <ShowcaseBrushArea />,
  },
  {
    title: "Showcase — Liquid 8.6%",
    description: "Liquid-fill progress gauge (green).",
    code: `// SVG clipPath circle + animated wave paths
<LiquidGauge value={8.6} color="var(--nora-success)" />`,
    render: () => <ShowcaseLiquidGreen />,
  },
  {
    title: "Showcase — Liquid 54.1%",
    description: "Liquid-fill progress gauge (blue).",
    code: `<LiquidGauge value={54.1} color="var(--nora-tint)" />`,
    render: () => <ShowcaseLiquidBlue />,
  },
  {
    title: "Showcase — Liquid 92.1%",
    description: "Liquid-fill progress gauge (purple).",
    code: `<LiquidGauge value={92.1} color="var(--nora-component)" />`,
    render: () => <ShowcaseLiquidPurple />,
  },
]
