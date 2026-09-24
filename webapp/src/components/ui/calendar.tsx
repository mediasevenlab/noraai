import * as React from "react"
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  type Locale,
} from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react"

type CaptionDropdownProps = {
  options?: { value: number; label: string; disabled: boolean }[]
  value?: string | number | readonly string[]
  onChange?: React.ChangeEventHandler<HTMLSelectElement>
  disabled?: boolean
  "aria-label"?: string
  className?: string
}

/** Month/year: Nora Select вместо нативного OS-select. */
function CalendarCaptionDropdown({
  options,
  value,
  onChange,
  disabled,
  "aria-label": ariaLabel,
  className,
}: CaptionDropdownProps) {
  const stringValue = value == null ? undefined : String(value)

  return (
    <Select
      value={stringValue}
      disabled={disabled}
      onValueChange={(next) => {
        if (next == null || !onChange) return
        onChange({
          target: { value: next },
        } as React.ChangeEvent<HTMLSelectElement>)
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label={ariaLabel}
        className={cn(
          "h-[var(--nora-control-h-sm)] min-h-[var(--nora-control-h-sm)] gap-1 px-1.5",
          "bg-[var(--nora-input-bg)] text-[var(--nora-text)] shadow-none",
          "focus-visible:shadow-[var(--nora-shadow-focus)]",
          className
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        align="center"
        alignItemWithTrigger={false}
        sideOffset={4}
        className={cn(
          "z-[60] w-max max-h-56 min-w-[var(--anchor-width)] overflow-y-auto border-0 p-1",
          "rounded-[var(--nora-radius-menu,16px)] bg-[var(--nora-popover)] text-[var(--nora-text)]",
          "shadow-[var(--nora-shadow-popover)] ring-1 ring-[var(--nora-border)]"
        )}
      >
        {options?.map((option) => (
          <SelectItem
            key={option.value}
            value={String(option.value)}
            disabled={option.disabled}
            className="h-[var(--nora-control-h-sm)] rounded-[var(--nora-radius-menu-item,12px)] text-xs text-[var(--nora-text-secondary)] data-highlighted:text-[var(--nora-text)]"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Calendar (DayPicker) под Nora UI:
 * плотность контролов 22–26px, tint selection, Nora Select для caption.
 * Mobile sheets keep full-width day plaques and only shorten their height
 * so two months fit the viewport.
 */
export const noraSheetCalendarClass =
  'w-full bg-transparent p-0 [--cell-radius:14px] [--cell-size:2.5rem]'

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  compactDays = false,
  locale,
  formatters,
  components,
  onRangeEdgeDrag,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
  compactDays?: boolean
  onRangeEdgeDrag?: (edge: "start" | "end", date: Date) => void
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      weekStartsOn={1}
      className={cn(
        "group/calendar bg-[var(--nora-panel)] p-2.5 [--nora-calendar-hover:color-mix(in_srgb,black_16%,var(--nora-panel))]",
        "font-[family-name:var(--nora-font)] text-xs font-medium text-[var(--nora-text)]",
        "[--cell-radius:var(--nora-radius-md)] [--cell-size:26px]",
        "in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code ?? "en-US", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-3 md:flex-row md:gap-4",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-2", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant, size: "icon-xs" }),
          "size-(--cell-size) p-0 select-none text-[var(--nora-text-secondary)] aria-disabled:opacity-50",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant, size: "icon-xs" }),
          "size-(--cell-size) p-0 select-none text-[var(--nora-text-secondary)] aria-disabled:opacity-50",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1 text-xs font-medium",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn("relative", defaultClassNames.dropdown_root),
        dropdown: cn("sr-only", defaultClassNames.dropdown),
        caption_label: cn(
          "font-medium select-none text-[var(--nora-text)]",
          captionLayout === "label"
            ? "text-xs"
            : "flex items-center gap-1 text-xs [&>svg]:size-3 [&>svg]:text-[var(--nora-text-tertiary)]",
          defaultClassNames.caption_label
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 rounded-(--cell-radius) text-[10px] font-medium text-[var(--nora-text-tertiary)] select-none",
          defaultClassNames.weekday
        ),
        week: cn(
          compactDays ? "mt-0.5 flex w-full" : "mt-1 flex w-full",
          defaultClassNames.week
        ),
        week_number_header: cn(
          "w-(--cell-size) select-none",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-[10px] text-[var(--nora-text-secondary)] select-none",
          defaultClassNames.week_number
        ),
        day: cn(
          compactDays
            ? "group/day relative h-(--cell-size) w-full rounded-(--cell-radius) p-0 text-center select-none hover:z-20 hover:!bg-[var(--nora-calendar-hover)] hover:after:hidden [&:hover>button]:z-20 [&:hover>button]:!rounded-(--cell-radius) [&:hover>button]:!bg-[var(--nora-calendar-hover)] [&:hover>button]:!text-[var(--nora-text)] [&:last-child[data-selected=true]_button]:rounded-e-(--cell-radius)"
            : "group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-e-(--cell-radius)",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-s-(--cell-radius)"
            : "[&:first-child[data-selected=true]_button]:rounded-s-(--cell-radius)",
          defaultClassNames.day
        ),
        range_start: cn(
          "relative isolate z-0 rounded-s-(--cell-radius) bg-[var(--nora-tint-dimmed)] after:absolute after:inset-y-0 after:end-0 after:w-3 after:bg-[var(--nora-tint-dimmed)]",
          defaultClassNames.range_start
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn(
          "relative isolate z-0 rounded-e-(--cell-radius) bg-[var(--nora-tint-dimmed)] after:absolute after:inset-y-0 after:start-0 after:w-3 after:bg-[var(--nora-tint-dimmed)]",
          defaultClassNames.range_end
        ),
        today: cn(
          "rounded-(--cell-radius) bg-[var(--nora-inset)] text-[var(--nora-text)] data-[selected=true]:rounded-none",
          defaultClassNames.today
        ),
        outside: cn(
          "text-[var(--nora-text-dimmed)] aria-selected:text-[var(--nora-text-dimmed)]",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-[var(--nora-text-dimmed)] opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-3.5", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon className={cn("size-3.5", className)} {...props} />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-3", className)} {...props} />
          )
        },
        Dropdown: CalendarCaptionDropdown,
        DayButton: ({ ...props }) => (
          <CalendarDayButton
            compactDays={compactDays}
            locale={locale}
            onRangeEdgeDrag={onRangeEdgeDrag}
            {...props}
          />
        ),
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  compactDays = false,
  day,
  modifiers,
  locale,
  onRangeEdgeDrag,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  ...props
}: React.ComponentProps<typeof DayButton> & {
  compactDays?: boolean
  locale?: Partial<Locale>
  onRangeEdgeDrag?: (edge: "start" | "end", date: Date) => void
}) {
  const defaultClassNames = getDefaultClassNames()
  const ref = React.useRef<HTMLButtonElement>(null)
  const edge = modifiers.range_start ? "start" : modifiers.range_end ? "end" : null
  const edgeRef = React.useRef(edge)
  const dragCallbackRef = React.useRef(onRangeEdgeDrag)
  edgeRef.current = edge
  dragCallbackRef.current = onRangeEdgeDrag

  const suppressFocusRef = React.useRef(false)
  React.useEffect(() => {
    if (suppressFocusRef.current) return
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  React.useEffect(() => {
    const node = ref.current
    if (!node || !compactDays) return
    const onDown = (event: PointerEvent) => {
      const currentEdge = edgeRef.current
      if (!currentEdge || !dragCallbackRef.current) return
      if (event.pointerType === "mouse" && event.button !== 0) return
      const drag = {
        edge: currentEdge,
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        moved: false,
      }
      const move = (ev: PointerEvent) => {
        if (ev.pointerId !== drag.pointerId) return
        if (!drag.moved && Math.hypot(ev.clientX - drag.x, ev.clientY - drag.y) < 6) return
        if (!drag.moved) {
          suppressFocusRef.current = true
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
        }
        drag.moved = true
        const hit = document.elementFromPoint(ev.clientX, ev.clientY)
        const host = hit instanceof Element ? hit.closest("[data-day-time]") : null
        const time = Number(host?.getAttribute("data-day-time"))
        if (!time) return
        dragCallbackRef.current?.(drag.edge, new Date(time))
      }
      const up = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", move)
        window.removeEventListener("pointerup", up)
        window.removeEventListener("pointercancel", up)
        if (!drag.moved || ev.pointerId !== drag.pointerId) return
        suppressFocusRef.current = true
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
        window.addEventListener(
          "click",
          (clickEvent) => {
            clickEvent.preventDefault()
            clickEvent.stopPropagation()
          },
          { capture: true, once: true },
        )
      }
      window.addEventListener("pointermove", move)
      window.addEventListener("pointerup", up)
      window.addEventListener("pointercancel", up)
    }
    node.addEventListener("pointerdown", onDown)
    return () => node.removeEventListener("pointerdown", onDown)
  }, [compactDays])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-day-time={day.date.getTime()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        compactDays
          ? "relative isolate z-10 flex !size-auto !h-(--cell-size) !w-full min-w-0 flex-col gap-0.5 overflow-hidden border-0 leading-none font-normal data-[range-start=true]:touch-none data-[range-end=true]:touch-none data-[range-start=true]:cursor-grab data-[range-end=true]:cursor-grab"
          : "relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-0.5 border-0 leading-none font-normal",
        "rounded-(--cell-radius) text-xs text-[var(--nora-text)]",
        compactDays
          ? "hover:!rounded-(--cell-radius) hover:!bg-[var(--nora-calendar-hover)] hover:shadow-none hover:!text-[var(--nora-text)] hover:[&_[data-plan-occupied]]:hidden"
          : "hover:bg-[var(--nora-row-hover)] hover:text-[var(--nora-text)]",
        "group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 focus-visible:shadow-[var(--nora-shadow-focus)]",
        "data-[selected-single=true]:bg-[var(--nora-tint)] data-[selected-single=true]:text-[var(--nora-on-accent)] data-[selected-single=true]:hover:bg-[var(--nora-tint-dark)] data-[selected-single=true]:hover:text-[var(--nora-on-accent)]",
        "data-[range-start=true]:rounded-(--cell-radius) data-[range-start=true]:rounded-s-(--cell-radius) data-[range-start=true]:bg-[var(--nora-tint)] data-[range-start=true]:text-[var(--nora-on-accent)]",
        "data-[range-end=true]:rounded-(--cell-radius) data-[range-end=true]:rounded-e-(--cell-radius) data-[range-end=true]:bg-[var(--nora-tint)] data-[range-end=true]:text-[var(--nora-on-accent)]",
        "data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-[var(--nora-tint-dimmed)] data-[range-middle=true]:text-[var(--nora-text)]",
        "data-[range-start=true]:hover:!bg-[var(--nora-calendar-hover)] data-[range-middle=true]:hover:!bg-[var(--nora-calendar-hover)] data-[range-end=true]:hover:!bg-[var(--nora-calendar-hover)] data-[range-middle=true]:hover:!rounded-(--cell-radius)",
        "[&>span]:text-[9px] [&>span]:font-medium [&>span]:opacity-70",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
