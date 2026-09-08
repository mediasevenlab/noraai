import * as React from "react"
import { addDays, format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { type DateRange } from "react-day-picker"
import { enUS } from "react-day-picker/locale"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import type { ComponentDoc } from "./types"

const calLocale = { locale: enUS } as const

/** Фон на Popover: Calendar внутри `data-slot=popover-content` сам становится transparent */
const pickerPopoverClass =
  "w-auto overflow-hidden border-0 bg-[var(--nora-popover)] p-0 shadow-[var(--nora-shadow-popover)] ring-1 ring-[var(--nora-border)]"

/** Триггер как Nora input — ширина по контенту */
function DatePickerTrigger({
  className,
  empty,
  children,
  ...props
}: React.ComponentProps<"button"> & { empty?: boolean }) {
  return (
    <button
      type="button"
      data-slot="date-picker-trigger"
      className={cn(
        "inline-flex h-[var(--nora-control-h,30px)] w-fit max-w-full items-center gap-2 rounded-[var(--nora-radius-md,8px)] bg-[var(--nora-input-bg)] px-2.5 text-left text-xs font-medium outline-none transition-[box-shadow,background-color]",
        "text-[var(--nora-text)] hover:bg-[color-mix(in_srgb,var(--nora-input-bg)_88%,var(--nora-text))]",
        "focus-visible:bg-[var(--nora-panel)] focus-visible:shadow-[var(--nora-shadow-focus)]",
        empty && "text-[var(--nora-text-tertiary)]",
        className
      )}
      {...props}
    >
      <CalendarIcon className="size-3.5 shrink-0 text-[var(--nora-text-tertiary)]" />
      <span className="truncate">{children}</span>
    </button>
  )
}

function DatePickerFilled() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <DatePickerTrigger empty={!date} aria-label="Pick a date" />
        }
      >
        {date ? format(date, "PPP") : "Pick a date"}
      </PopoverTrigger>
      <PopoverContent className={pickerPopoverClass} align="start">
        <Calendar
          {...calLocale}
          mode="single"
          selected={date}
          onSelect={(next) => {
            setDate(next)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

function DatePickerEmpty() {
  const [date, setDate] = React.useState<Date | undefined>()
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <DatePickerTrigger empty={!date} aria-label="Pick a date" />
        }
      >
        {date ? format(date, "PPP") : "Pick a date"}
      </PopoverTrigger>
      <PopoverContent className={pickerPopoverClass} align="start">
        <Calendar
          {...calLocale}
          mode="single"
          selected={date}
          onSelect={(next) => {
            setDate(next)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

function DatePickerRange() {
  const [range, setRange] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 7),
  })

  const label =
    range?.from && range?.to
      ? `${format(range.from, "LLL d, y")} – ${format(range.to, "LLL d, y")}`
      : range?.from
        ? format(range.from, "LLL d, y")
        : "Pick a date range"

  return (
    <Popover>
      <PopoverTrigger
        render={
          <DatePickerTrigger
            empty={!range?.from}
            aria-label="Pick a date range"
          />
        }
      >
        {label}
      </PopoverTrigger>
      <PopoverContent className={pickerPopoverClass} align="start">
        <Calendar
          {...calLocale}
          mode="range"
          defaultMonth={range?.from}
          selected={range}
          onSelect={setRange}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}

function DatePickerPresets() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [month, setMonth] = React.useState<Date>(new Date())
  const [open, setOpen] = React.useState(false)

  const presets = [
    { label: "Today", days: 0 },
    { label: "Tomorrow", days: 1 },
    { label: "In 3 days", days: 3 },
    { label: "In a week", days: 7 },
    { label: "In 2 weeks", days: 14 },
  ] as const

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <DatePickerTrigger empty={!date} aria-label="Pick a date" />
        }
      >
        {date ? format(date, "PPP") : "Pick a date"}
      </PopoverTrigger>
      <PopoverContent className={pickerPopoverClass} align="start">
        <Calendar
          {...calLocale}
          mode="single"
          selected={date}
          onSelect={(next) => {
            setDate(next)
            if (next) setMonth(new Date(next.getFullYear(), next.getMonth(), 1))
          }}
          month={month}
          onMonthChange={setMonth}
        />
        <div className="grid grid-cols-6 gap-1.5 border-t border-[var(--nora-divider)] p-2">
          {presets.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              className={cn(
                "h-[var(--nora-control-h-sm)] min-w-0 px-1 text-[11px] shadow-none",
                preset.days < 7 ? "col-span-2" : "col-span-3"
              )}
              onClick={() => {
                const next = addDays(new Date(), preset.days)
                setDate(next)
                setMonth(new Date(next.getFullYear(), next.getMonth(), 1))
                setOpen(false)
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export const datePickerDoc: ComponentDoc = {
  id: "date-picker",
  examples: [
    {
      title: "Date picker",
      description: "Nora input trigger + Calendar in Popover.",
      code: `import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

<Popover>
  <PopoverTrigger render={<DatePickerTrigger />}>
    {date ? format(date, "PPP") : "Pick a date"}
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0">
    <Calendar mode="single" selected={date} onSelect={setDate} />
  </PopoverContent>
</Popover>`,
      render: () => <DatePickerFilled />,
    },
    {
      title: "With placeholder",
      description: "Empty initial selection with tertiary placeholder.",
      code: `const [date, setDate] = React.useState<Date>()`,
      render: () => <DatePickerEmpty />,
    },
    {
      title: "Date range",
      description: "Two-month range selection.",
      code: `<Calendar mode="range" numberOfMonths={2} selected={range} onSelect={setRange} />`,
      render: () => <DatePickerRange />,
    },
    {
      title: "With presets",
      description: "Quick offsets below the calendar.",
      code: `// Today / Tomorrow / In a week presets under Calendar`,
      render: () => <DatePickerPresets />,
    },
  ],
}
