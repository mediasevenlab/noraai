import * as React from "react"
import { ChevronDownIcon, ChevronUpIcon } from "@/components/icons"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/* Color helpers                                                       */
/* ------------------------------------------------------------------ */

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, "")
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw
      .split("")
      .map((c) => c + c)
      .join("")
      .toUpperCase()}`
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`
  return null
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const n = normalizeHex(hex) ?? "#0099FF"
  const r = parseInt(n.slice(1, 3), 16) / 255
  const g = parseInt(n.slice(3, 5), 16) / 255
  const b = parseInt(n.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  return { h, s, v: max }
}

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  const [r, g, b] =
    h < 60 ? [c, x, 0] :
    h < 120 ? [x, c, 0] :
    h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] :
    h < 300 ? [x, 0, c] :
    [c, 0, x]
  const to = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0")
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase()
}

function hueToCss(h: number) {
  return `hsl(${h} 100% 50%)`
}

/* ------------------------------------------------------------------ */
/* Property Row — строка свойства из панели редактора Nora           */
/* ------------------------------------------------------------------ */

type PropertyRowProps = {
  label: string
  children: React.ReactNode
  className?: string
}

export function PropertyRow({ label, children, className }: PropertyRowProps) {
  return (
    <div
      className={cn(
        "grid min-h-[var(--nora-row-h,30px)] w-full min-w-0 grid-cols-[72px_minmax(0,1fr)] items-center gap-2 font-[family-name:var(--nora-font)] text-xs",
        className
      )}
    >
      <span className="truncate font-medium text-[var(--nora-text-secondary)]">
        {label}
      </span>
      <div className="flex min-w-0 items-center gap-1 [&_[data-slot=select-trigger]]:!h-[var(--nora-control-h)] [&_[data-slot=select-trigger]]:min-w-0 [&_[data-slot=select-trigger]]:w-full">
        {children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Color Well — свотч + hex + alpha + Nora popover                   */
/* ------------------------------------------------------------------ */

type ColorWellProps = {
  defaultValue?: string
  defaultAlpha?: number
  className?: string
}

function ColorPickerPopover({
  color,
  onChange,
}: {
  color: string
  onChange: (hex: string) => void
}) {
  const hsv = hexToHsv(color)
  const svRef = React.useRef<HTMLDivElement>(null)
  const hueRef = React.useRef<HTMLDivElement>(null)
  const dragging = React.useRef<"sv" | "hue" | null>(null)

  const setFromSv = React.useCallback((clientX: number, clientY: number) => {
    const el = svRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const s = clamp((clientX - rect.left) / rect.width, 0, 1)
    const v = 1 - clamp((clientY - rect.top) / rect.height, 0, 1)
    onChange(hsvToHex(hsv.h, s, v))
  }, [hsv.h, onChange])

  const setFromHue = React.useCallback((clientX: number) => {
    const el = hueRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const h = clamp(((clientX - rect.left) / rect.width) * 360, 0, 359.99)
    onChange(hsvToHex(h, hsv.s, hsv.v))
  }, [hsv.s, hsv.v, onChange])

  React.useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (dragging.current === "sv") setFromSv(e.clientX, e.clientY)
      if (dragging.current === "hue") setFromHue(e.clientX)
    }
    const onUp = () => {
      dragging.current = null
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [setFromHue, setFromSv])

  return (
    <div className="flex w-[200px] flex-col gap-2">
      <div
        ref={svRef}
        className="relative h-[140px] w-full cursor-crosshair overflow-hidden rounded-[var(--nora-radius-md,8px)] touch-none"
        style={{
          background: `
            linear-gradient(to top, #000, transparent),
            linear-gradient(to right, #fff, ${hueToCss(hsv.h)})
          `,
        }}
        onPointerDown={(e) => {
          dragging.current = "sv"
          ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
          setFromSv(e.clientX, e.clientY)
        }}
      >
        <span
          className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35),0_1px_2px_rgba(0,0,0,0.25)]"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            background: color,
          }}
        />
      </div>

      <div
        ref={hueRef}
        className="relative h-3 w-full cursor-pointer rounded-full touch-none"
        style={{
          background:
            "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        }}
        onPointerDown={(e) => {
          dragging.current = "hue"
          setFromHue(e.clientX)
        }}
      >
        <span
          className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_1px_2px_rgba(0,0,0,0.25)]"
          style={{ left: `${(hsv.h / 360) * 100}%` }}
        />
      </div>

      <div className="flex items-center gap-2">
        <span
          className="relative size-6 shrink-0 overflow-hidden rounded-[5px]"
          style={{ background: color }}
        >
          <span className="pointer-events-none absolute inset-0 rounded-[5px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18)]" />
        </span>
        <div className="flex h-[var(--nora-control-h,30px)] min-w-0 flex-1 items-center rounded-[var(--nora-radius-md,8px)] bg-[var(--nora-input-bg)] px-2 font-mono text-[11px] text-[var(--nora-input-text)] transition-[box-shadow] duration-[var(--nora-duration,0.15s)] focus-within:shadow-[var(--nora-shadow-focus)]">
          <input
            value={color.replace("#", "")}
            onChange={(e) => {
              const next = normalizeHex(e.target.value)
              if (next) onChange(next)
            }}
            className="w-full min-w-0 bg-transparent uppercase outline-none"
            aria-label="Hex"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  )
}

export function ColorWell({
  defaultValue = "var(--nora-tint)",
  defaultAlpha = 100,
  className,
}: ColorWellProps) {
  const [color, setColor] = React.useState(
    normalizeHex(defaultValue.startsWith("var(") ? "#0099FF" : defaultValue) ??
      "#0099FF"
  )
  const [alpha, setAlpha] = React.useState(defaultAlpha)
  const [hexDraft, setHexDraft] = React.useState(color)

  const updateColor = (next: string) => {
    setColor(next)
    setHexDraft(next)
  }

  return (
    <div
      className={cn(
        "flex h-[var(--nora-control-h,30px)] w-full items-center gap-1.5 rounded-[var(--nora-radius-md,8px)] bg-[var(--nora-input-bg)] px-1.5 text-xs text-[var(--nora-input-text)] transition-[box-shadow] duration-[var(--nora-duration,0.15s)]",
        "focus-within:shadow-[var(--nora-shadow-focus)]",
        className
      )}
    >
      <Popover>
        <PopoverTrigger
          aria-label="Pick color"
          className={cn(
            "relative size-3.5 shrink-0 cursor-pointer overflow-hidden rounded-[4px] border-0 p-0",
            "bg-transparent shadow-none outline-none ring-0",
            "focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none"
          )}
        >
          <span
            className="block size-full rounded-[4px]"
            style={{ background: color }}
          />
          <span className="pointer-events-none absolute inset-0 rounded-[4px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18)]" />
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={8} className="w-auto p-2.5">
          <ColorPickerPopover color={color} onChange={updateColor} />
        </PopoverContent>
      </Popover>
      <input
        value={hexDraft.toUpperCase()}
        onChange={(e) => {
          setHexDraft(e.target.value)
          const next = normalizeHex(e.target.value)
          if (next) setColor(next)
        }}
        onBlur={() => setHexDraft(color)}
        className="w-full min-w-0 bg-transparent font-mono text-[11px] uppercase outline-none"
        aria-label="Hex value"
      />
      <span className="flex shrink-0 items-center text-[var(--nora-text-tertiary)]">
        <input
          type="number"
          min={0}
          max={100}
          value={alpha}
          onChange={(e) => setAlpha(Number(e.target.value))}
          className="w-7 bg-transparent text-right text-[11px] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          aria-label="Alpha"
        />
        %
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Segmented Control — сегменты панелей Nora                         */
/* ------------------------------------------------------------------ */

type SegmentedControlProps = {
  options: { value: string; label: React.ReactNode }[]
  defaultValue?: string
  onValueChange?: (value: string) => void
  className?: string
}

export function SegmentedControl({
  options,
  defaultValue,
  onValueChange,
  className,
}: SegmentedControlProps) {
  const [value, setValue] = React.useState(defaultValue ?? options[0]?.value)

  return (
    <div
      role="radiogroup"
      className={cn(
        "flex h-[var(--nora-control-h,30px)] w-full items-center gap-1 rounded-[var(--nora-radius-md,8px)] bg-[var(--nora-input-bg)] p-0.5",
        className
      )}
    >
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              setValue(opt.value)
              onValueChange?.(opt.value)
            }}
            className={cn(
              "inline-flex h-full min-w-0 flex-1 items-center justify-center rounded-[var(--nora-radius-sm,6px)] text-sm font-medium leading-none transition-[background-color,color,box-shadow] duration-[var(--nora-duration,0.15s)]",
              active
                ? "bg-[var(--nora-panel)] text-[var(--nora-text)] shadow-[var(--nora-shadow-button)]"
                : "text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)]"
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Number Stepper — числовое поле Nora со стрелками                  */
/* ------------------------------------------------------------------ */

type NumberStepperProps = {
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  step?: number
  min?: number
  max?: number
  unit?: string
  className?: string
}

function clampNumber(n: number, min?: number, max?: number) {
  let next = n
  if (min != null) next = Math.max(min, next)
  if (max != null) next = Math.min(max, next)
  return next
}

export function NumberStepper({
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  step = 1,
  min,
  max,
  unit,
  className,
}: NumberStepperProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
  const value = valueProp ?? uncontrolled
  const [draft, setDraft] = React.useState(String(value))
  const focusedRef = React.useRef(false)

  React.useEffect(() => {
    if (!focusedRef.current) setDraft(String(value))
  }, [value])

  function apply(next: number) {
    const clamped = clampNumber(next, min, max)
    if (valueProp === undefined) setUncontrolled(clamped)
    setDraft(String(clamped))
    onValueChange?.(clamped)
  }

  function parseAndApply(raw: string, commitEmpty = false) {
    const trimmed = raw.trim()
    if (trimmed === "" || trimmed === "-" || trimmed === ".") {
      if (commitEmpty) {
        apply(min ?? 0)
      }
      return
    }
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed)) {
      if (commitEmpty) setDraft(String(value))
      return
    }
    apply(parsed)
  }

  return (
    <div
      className={cn(
        "group flex h-[var(--nora-control-h,30px)] w-full items-center rounded-[var(--nora-radius-md,8px)] bg-[var(--nora-input-bg)] pl-2 pr-0.5 text-xs text-[var(--nora-input-text)] transition-[box-shadow] duration-[var(--nora-duration,0.15s)]",
        "focus-within:shadow-[var(--nora-shadow-focus)]",
        className
      )}
    >
      <input
        type="text"
        inputMode="decimal"
        value={draft}
        onFocus={() => {
          focusedRef.current = true
        }}
        onBlur={() => {
          focusedRef.current = false
          parseAndApply(draft, true)
        }}
        onChange={(e) => {
          const raw = e.target.value
          if (raw !== "" && !/^-?\d*\.?\d*$/.test(raw)) return
          setDraft(raw)
          parseAndApply(raw)
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault()
            apply(value + step)
          } else if (e.key === "ArrowDown") {
            e.preventDefault()
            apply(value - step)
          } else if (e.key === "Enter") {
            e.preventDefault()
            parseAndApply(draft, true)
            ;(e.target as HTMLInputElement).blur()
          }
        }}
        className="w-full min-w-0 bg-transparent text-[11px] tabular-nums outline-none"
        aria-label="Value"
      />
      {unit ? (
        <span className="mr-1 shrink-0 text-[10px] text-[var(--nora-text-tertiary)]">
          {unit}
        </span>
      ) : null}
      <span className="flex shrink-0 flex-col opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          onClick={() => apply(value + step)}
          className="flex h-3 w-4 items-center justify-center rounded-t-[3px] text-[var(--nora-text-tertiary)] hover:bg-[var(--nora-row-hover)] hover:text-[var(--nora-text)]"
          aria-label="Increment"
        >
          <ChevronUpIcon className="size-2.5" />
        </button>
        <button
          type="button"
          onClick={() => apply(value - step)}
          className="flex h-3 w-4 items-center justify-center rounded-b-[3px] text-[var(--nora-text-tertiary)] hover:bg-[var(--nora-row-hover)] hover:text-[var(--nora-text)]"
          aria-label="Decrement"
        >
          <ChevronDownIcon className="size-2.5" />
        </button>
      </span>
    </div>
  )
}
