import * as React from "react"
import { addDays, format } from "date-fns"
import { type DateRange } from "react-day-picker"
import { enUS } from "react-day-picker/locale"

import { Button } from "@/components/ui/button"
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

import type { ComponentDoc } from "./types"

const shell =
  "overflow-hidden rounded-[var(--nora-radius-lg)] bg-[var(--nora-panel)] shadow-[var(--nora-shadow-popover)] ring-1 ring-[var(--nora-border)]"

const calProps = { locale: enUS } as const

function CalendarBasic() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  return (
    <Calendar
      {...calProps}
      mode="single"
      selected={date}
      onSelect={setDate}
      className={shell}
    />
  )
}

function CalendarRange() {
  const [range, setRange] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 7),
  })
  return (
    <Calendar
      {...calProps}
      mode="range"
      defaultMonth={range?.from}
      selected={range}
      onSelect={setRange}
      numberOfMonths={2}
      className={shell}
    />
  )
}

function CalendarDropdown() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const year = new Date().getFullYear()
  return (
    <Calendar
      {...calProps}
      mode="single"
      selected={date}
      onSelect={setDate}
      captionLayout="dropdown"
      startMonth={new Date(year - 10, 0)}
      endMonth={new Date(year + 10, 11)}
      className={shell}
    />
  )
}

function CalendarPresets() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [month, setMonth] = React.useState<Date>(new Date())
  const presets = [
    { label: "Today", value: 0 },
    { label: "Tomorrow", value: 1 },
    { label: "In 3 days", value: 3 },
    { label: "In a week", value: 7 },
    { label: "In 2 weeks", value: 14 },
  ] as const

  return (
    // ширина = сетка 7×cell + padding календаря; footer не раздувает карточку
    <div
      className={cn(
        shell,
        "flex w-[calc(var(--cell-size)*7+20px)] flex-col [--cell-size:26px]"
      )}
    >
      <Calendar
        {...calProps}
        mode="single"
        selected={date}
        onSelect={setDate}
        month={month}
        onMonthChange={setMonth}
        classNames={{ root: "w-full" }}
        className="w-full rounded-none bg-transparent shadow-none ring-0"
      />
      <div className="grid w-full grid-cols-6 gap-1.5 border-t border-[var(--nora-border)] p-2">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            className={cn(
              "h-[var(--nora-control-h-sm)] min-w-0 px-1 text-[11px] shadow-none",
              // 3+2 как в shadcn: первые три по 2 колонки, последние две по 3
              preset.value < 7 ? "col-span-2" : "col-span-3"
            )}
            onClick={() => {
              const next = addDays(new Date(), preset.value)
              setDate(next)
              setMonth(new Date(next.getFullYear(), next.getMonth(), 1))
            }}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

function CalendarDateTime() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [startTime, setStartTime] = React.useState("09:00")
  const [endTime, setEndTime] = React.useState("17:00")

  return (
    <div className={cn(shell, "w-fit")}>
      <Calendar
        {...calProps}
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-none bg-transparent shadow-none ring-0"
      />
      <div className="grid gap-2 border-t border-[var(--nora-border)] p-2.5 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="cal-start-time" className="text-[11px] text-[var(--nora-text-secondary)]">
            Start Time
          </Label>
          <Input
            id="cal-start-time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="cal-end-time" className="text-[11px] text-[var(--nora-text-secondary)]">
            End Time
          </Label>
          <Input
            id="cal-end-time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>
      {date ? (
        <p className="border-t border-[var(--nora-border)] px-2.5 py-2 text-[11px] text-[var(--nora-text-secondary)]">
          {format(date, "PPP")} · {startTime} – {endTime}
        </p>
      ) : null}
    </div>
  )
}

function CalendarBooked() {
  const [date, setDate] = React.useState<Date | undefined>()
  const booked = React.useMemo(
    () => [
      addDays(new Date(), 2),
      addDays(new Date(), 5),
      addDays(new Date(), 6),
      addDays(new Date(), 10),
    ],
    []
  )

  return (
    <Calendar
      {...calProps}
      mode="single"
      selected={date}
      onSelect={setDate}
      disabled={booked}
      modifiers={{ booked }}
      modifiersClassNames={{
        booked:
          "[&>button]:line-through [&>button]:text-[var(--nora-text-dimmed)]",
      }}
      className={shell}
    />
  )
}

function priceForDay(date: Date) {
  const day = date.getDay()
  if (day === 0 || day === 6) return 120
  return 100
}

function CalendarCustomCell() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  return (
    <Calendar
      {...calProps}
      mode="single"
      selected={date}
      onSelect={setDate}
      className={cn(shell, "[--cell-size:2.75rem]")}
      components={{
        DayButton: ({ children, modifiers, day, ...props }) => (
          <CalendarDayButton day={day} modifiers={modifiers} {...props}>
            {children}
            {!modifiers.outside && (
              <span>${priceForDay(day.date)}</span>
            )}
          </CalendarDayButton>
        ),
      }}
    />
  )
}

function CalendarWeekNumbers() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  return (
    <Calendar
      {...calProps}
      mode="single"
      selected={date}
      onSelect={setDate}
      showWeekNumber
      className={shell}
    />
  )
}

function CalendarTimezone() {
  const [date, setDate] = React.useState<Date | undefined>()
  const [timeZone] = React.useState(() =>
    Intl.DateTimeFormat().resolvedOptions().timeZone
  )

  return (
    <div className="flex flex-col items-center gap-2">
      <Calendar
        {...calProps}
        mode="single"
        selected={date}
        onSelect={setDate}
        timeZone={timeZone}
        className={shell}
      />
      {timeZone ? (
        <p className="text-[11px] text-[var(--nora-text-secondary)]">
          Timezone: {timeZone}
          {date ? ` · ${date.toLocaleDateString("en-US")}` : null}
        </p>
      ) : null}
    </div>
  )
}

export const calendarDoc: ComponentDoc = {
  id: "calendar",
  examples: [
    {
      title: "Basic",
      description: "Одиночный выбор даты. Стили Nora: panel, tint, радиус 8px.",
      code: `import { Calendar } from "@/components/ui/calendar"

const [date, setDate] = React.useState<Date | undefined>(new Date())

<Calendar
  mode="single"
  selected={date}
  onSelect={setDate}
  className="rounded-[var(--nora-radius-lg)] ring-1 ring-[var(--nora-border)]"
/>`,
      render: () => <CalendarBasic />,
    },
    {
      title: "Range",
      description: "mode=\"range\" — выбор периода, два месяца рядом.",
      code: `<Calendar mode="range" numberOfMonths={2} selected={range} onSelect={setRange} />`,
      render: () => <CalendarRange />,
    },
    {
      title: "Month and Year Selector",
      description:
        "captionLayout=\"dropdown\" — Nora Select (compact popover), не native OS-list.",
      code: `<Calendar captionLayout="dropdown" mode="single" locale={enUS} />`,
      render: () => <CalendarDropdown />,
    },
    {
      title: "Presets",
      description: "Пресеты снизу в footer (как shadcn): outline-кнопки, flex-wrap.",
      code: `<CardFooter className="flex flex-wrap gap-2 border-t">
  <Button variant="outline" size="sm" className="flex-1">Today</Button>
  …
</CardFooter>`,
      render: () => <CalendarPresets />,
    },
    {
      title: "Date and Time",
      description: "Дата + Start/End time в той же панели.",
      code: `<Calendar mode="single" />
<Input type="time" />`,
      render: () => <CalendarDateTime />,
    },
    {
      title: "Booked dates",
      description: "Занятые дни: disabled + modifiers.",
      code: `<Calendar disabled={booked} modifiers={{ booked }} />`,
      render: () => <CalendarBooked />,
    },
    {
      title: "Custom Cell Size",
      description: "--cell-size + цена в ячейке через DayButton.",
      code: `<Calendar className="[--cell-size:2.75rem]" components={{ DayButton }} />`,
      render: () => <CalendarCustomCell />,
    },
    {
      title: "Week Numbers",
      description: "showWeekNumber — номера недель.",
      code: `<Calendar showWeekNumber />`,
      render: () => <CalendarWeekNumbers />,
    },
    {
      title: "Timezone",
      description: "timeZone из Intl — без смещения выбранной даты.",
      code: `<Calendar timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone} />`,
      render: () => <CalendarTimezone />,
    },
  ],
}
