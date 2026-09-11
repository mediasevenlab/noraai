import * as React from "react"

import { useTheme } from "@/components/theme-provider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const font = "font-[family-name:var(--nora-font)] text-xs font-normal"
/** Same weight as SelectTrigger / Framer filter (500) — not the shared font-normal. */
const selectFont = "font-[family-name:var(--nora-font)] text-xs font-medium leading-none"
const controlH = "h-[var(--nora-control-h)]"
const radiusMd = "rounded-[var(--nora-radius-md)]"

/** Isolated themed surface for component and block previews. */
export function NoraPreviewRoot({
  scheme,
  className,
  children,
}: {
  scheme?: "editor-dark" | "editor-light" | "marketing" | null
  className?: string
  children: React.ReactNode
}) {
  const { scheme: appScheme } = useTheme()
  const appliedScheme = scheme ?? appScheme

  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center justify-center gap-3 text-[var(--nora-text)]",
        `scheme-${appliedScheme}`,
        className
      )}
      data-scheme={appliedScheme}
    >
      {children}
    </div>
  )
}

/* ---------- Button ---------- */

type NoraButtonVariant =
  | "default"
  | "primary"
  | "component"
  | "destructive"
  | "destructiveSecondary"
  | "ghost"
  | "tinted"
  | "mk"
  | "mkBlue"
  | "mkOutline"

type NoraButtonSize = "sm" | "default" | "lg" | "xl" | "pill"

type NoraButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: NoraButtonVariant
  size?: NoraButtonSize
  depth?: boolean
}

const buttonVariants: Record<NoraButtonVariant, string> = {
  default:
    "bg-[var(--nora-button-bg)] text-[var(--nora-button-text)] hover:bg-[var(--nora-button-bg-hover)]",
  primary:
    "bg-[var(--nora-tint)] text-[var(--nora-on-accent)] hover:bg-[var(--nora-tint-dark)]",
  component:
    "bg-[var(--nora-component)] text-[var(--nora-on-accent)] hover:bg-[var(--nora-component-hover)]",
  destructive:
    "bg-[var(--nora-error)] text-[var(--nora-on-accent)] hover:bg-[var(--nora-error-hover)]",
  destructiveSecondary:
    "bg-[var(--nora-error-soft-bg)] text-[var(--nora-error-hover)] hover:bg-[var(--nora-error-soft-bg-hover)]",
  ghost:
    "bg-transparent text-[var(--nora-text-secondary)] hover:bg-[var(--nora-row-hover)] hover:text-[var(--nora-text)]",
  tinted:
    "bg-[var(--nora-tint-dimmed)] text-[var(--nora-tint)] hover:bg-[var(--nora-tint-soft-hover)]",
  mk: "h-11 rounded-xl bg-[var(--nora-mk-btn-bg)] px-5 text-[15px] font-semibold text-[var(--nora-mk-btn-text)] hover:bg-[var(--nora-mk-btn-hover)]",
  mkBlue:
    "h-11 rounded-xl bg-[var(--nora-tint)] px-5 text-[15px] font-semibold text-[var(--nora-on-accent)] hover:bg-[var(--nora-tint-dark)]",
  mkOutline:
    "h-11 rounded-xl bg-[var(--nora-mk-outline-bg)] px-5 text-[15px] font-semibold text-[var(--nora-on-accent)] shadow-[inset_0_0_0_1px_var(--nora-mk-outline-ring)] hover:bg-[var(--nora-mk-outline-hover)]",
}

const buttonSizes: Record<NoraButtonSize, string> = {
  sm: "h-[var(--nora-control-h-sm)] rounded-[var(--nora-radius-sm)] px-2 text-[11px]",
  default: controlH,
  lg: "h-[var(--nora-row-h)] rounded-[var(--nora-radius-lg)] px-3.5 text-[13px]",
  xl: "h-10 rounded-[var(--nora-radius-lg)] px-[18px] text-sm",
  pill: "rounded-full",
}

export function NoraButton({
  className,
  variant = "default",
  size = "default",
  depth = false,
  disabled,
  children,
  ...props
}: NoraButtonProps) {
  const isMarketing = variant === "mk" || variant === "mkBlue" || variant === "mkOutline"

  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-1.5 border-0 px-2.5 whitespace-nowrap transition-[background-color,box-shadow,color] duration-150 select-none active:translate-y-px",
        font,
        radiusMd,
        !isMarketing && buttonVariants[variant],
        !isMarketing && size !== "default" && buttonSizes[size],
        !isMarketing && size === "default" && controlH,
        isMarketing && buttonVariants[variant],
        depth && "shadow-[var(--nora-shadow-button)]",
        "[&_svg]:size-3 [&_svg]:shrink-0",
        disabled &&
          "cursor-not-allowed bg-[var(--nora-surface)] text-[var(--nora-text-dimmed)] active:translate-y-0",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/* ---------- Icon Button ---------- */

type NoraIconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
}

export function NoraIconButton({
  className,
  active,
  children,
  ...props
}: NoraIconButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-[var(--nora-control-h)] cursor-pointer items-center justify-center border-0 bg-transparent text-[var(--nora-text-secondary)] transition-[background-color,color] duration-150",
        radiusMd,
        "hover:bg-[var(--nora-row-hover)] hover:text-[var(--nora-text)]",
        active && "bg-[var(--nora-tint-dimmed)] text-[var(--nora-tint)]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--nora-text-secondary)]",
        "[&_svg]:size-4",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/* ---------- Input / Textarea ---------- */

type NoraInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean
}

export function NoraInput({ className, error, ...props }: NoraInputProps) {
  return (
    <input
      className={cn(
        "block w-full border-0 px-2 outline-none transition-shadow duration-150",
        font,
        controlH,
        radiusMd,
        "bg-[var(--nora-input-bg)] text-[var(--nora-input-text)] placeholder:text-[var(--nora-input-placeholder)]",
        "focus:shadow-[var(--nora-shadow-focus)]",
        error && "shadow-[inset_0_0_0_1px_var(--nora-error)]",
        className
      )}
      {...props}
    />
  )
}

export function NoraTextarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "block min-h-16 w-full resize-y border-0 p-2 outline-none transition-shadow duration-150",
        font,
        "leading-normal",
        radiusMd,
        "bg-[var(--nora-input-bg)] text-[var(--nora-input-text)] placeholder:text-[var(--nora-input-placeholder)]",
        "focus:shadow-[var(--nora-shadow-focus)]",
        className
      )}
      {...props}
    />
  )
}

export function NoraField({
  className,
  icon,
  children,
}: {
  className?: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className={cn("relative flex items-center", className)}>
      {icon ? (
        <span className="pointer-events-none absolute left-2 size-3 text-[var(--nora-text-tertiary)] [&_svg]:size-3">
          {icon}
        </span>
      ) : null}
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<{ className?: string }>, {
              className: cn(
                (child as React.ReactElement<{ className?: string }>).props.className,
                icon && "pl-[26px]"
              ),
            })
          : child
      )}
    </div>
  )
}

/* ---------- Select ---------- */

type NoraSelectProps = {
  className?: string
  contentClassName?: string
  itemClassName?: string
  value?: string
  defaultValue?: string
  onValueChange?: (value: string | null) => void
  placeholder?: string
  items: {
    value: string
    label: string
    menuLabel?: string
    className?: string
    separatorAfter?: boolean
  }[]
  disabled?: boolean
  leadingIcon?: React.ReactNode
  hideChevron?: boolean
  chevron?: "plain" | "circle"
  itemIndicator?: "start" | "end"
}

export function NoraSelect({
  className,
  contentClassName,
  itemClassName,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  items,
  disabled,
  leadingIcon,
  hideChevron = false,
  chevron = "plain",
  itemIndicator = "end",
}: NoraSelectProps) {
  const selectedLabel =
    value == null ? undefined : items.find((item) => item.value === value)?.label

  return (
    <Select
      value={value}
      defaultValue={defaultValue}
      disabled={disabled}
      onValueChange={onValueChange}
    >
      <SelectTrigger
        className={cn(
          "box-border w-full min-w-0 shadow-none ring-0",
          "h-[var(--nora-control-h)] min-h-[var(--nora-control-h)] max-h-[var(--nora-control-h)]",
          selectFont,
          radiusMd,
          "bg-[var(--nora-input-bg)] text-[var(--nora-input-text)]",
          "[&>svg]:size-3 [&>svg]:opacity-70 [&>svg]:text-[var(--nora-text-tertiary)]",
          hideChevron && "justify-start",
          className,
        )}
        disabled={disabled}
        hideIcon={hideChevron}
        iconVariant={chevron}
      >
        {leadingIcon ? (
          <span className="inline-flex shrink-0 items-center text-current [&_svg]:size-[15px] [&_svg]:opacity-100">
            {leadingIcon}
          </span>
        ) : null}
        <SelectValue placeholder={placeholder}>
          {selectedLabel ?? value}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        sideOffset={4}
        className={cn(
          "w-max min-w-[var(--anchor-width)] text-[var(--nora-text)]",
          contentClassName,
        )}
      >
        {items.map((item) => (
          <React.Fragment key={item.value}>
            <SelectItem
              value={item.value}
              indicator={itemIndicator}
              className={cn(selectFont, "h-[var(--nora-control-h)]", itemClassName, item.className)}
            >
              {item.menuLabel ?? item.label}
            </SelectItem>
            {item.separatorAfter ? <SelectSeparator /> : null}
          </React.Fragment>
        ))}
      </SelectContent>
    </Select>
  )
}

/* ---------- Segmented Control ---------- */

type NoraSegmentedOption = string | { value: string; label: string }

type NoraSegmentedProps = {
  className?: string
  options: NoraSegmentedOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** sm — compact 22px; default — same 30px row as select/search (Framer toolbar) */
  size?: "sm" | "default"
  "aria-label"?: string
}

function normalizeSegmentedOption(option: NoraSegmentedOption) {
  return typeof option === "string" ? { value: option, label: option } : option
}

export function NoraSegmented({
  className,
  options,
  value,
  defaultValue,
  onValueChange,
  size = "sm",
  "aria-label": ariaLabel,
}: NoraSegmentedProps) {
  const normalized = options.map(normalizeSegmentedOption)
  const [internal, setInternal] = React.useState(
    defaultValue ?? normalized[0]?.value,
  )
  const current = value ?? internal
  /** Явная ширина (w-*) — сегменты делят ряд; иначе ширина по контенту с равными паддингами */
  const stretch = Boolean(className && /\bw-(?:\[|full|[\d])/.test(className))

  function select(optionValue: string) {
    if (value === undefined) setInternal(optionValue)
    onValueChange?.(optionValue)
  }

  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        "box-border inline-flex max-w-full items-center gap-0.5 rounded-[var(--nora-radius-md)] bg-[var(--nora-input-bg)] p-0.5",
        size === "default"
          ? "h-[var(--nora-control-h,30px)]"
          : "h-[var(--nora-control-h-sm,22px)]",
        stretch ? "w-full" : "w-max",
        className
      )}
      role="group"
    >
      {normalized.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={current === option.value}
          onClick={() => select(option.value)}
          className={cn(
            "box-border h-full cursor-pointer border-0 whitespace-nowrap transition-[background-color,color,box-shadow] duration-150",
            "inline-flex items-center justify-center font-[family-name:var(--nora-font)] font-medium leading-none",
            "rounded-[var(--nora-radius-md,8px)]",
            size === "default" ? "px-3 text-xs" : "px-2.5 text-[11px]",
            stretch ? "min-w-0 flex-1" : "shrink-0",
            current === option.value
              ? "bg-[var(--nora-segmented-active)] text-[var(--nora-text)] shadow-[var(--nora-shadow-button)]"
              : "bg-transparent text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)]"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- Checkbox ---------- */

type NoraCheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label: React.ReactNode
}

export function NoraCheckbox({ className, label, id, ...props }: NoraCheckboxProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 select-none",
        font,
        "text-[var(--nora-text)]",
        className
      )}
    >
      <input id={inputId} type="checkbox" className="peer sr-only" {...props} />
      <span
        className={cn(
          "inline-flex size-3.5 items-center justify-center rounded-[var(--nora-radius-xs)] bg-[var(--nora-input-bg)] shadow-[inset_0_0_0_1px_var(--nora-border-strong)] transition-[background-color,box-shadow] duration-100",
          "peer-checked:bg-[var(--nora-tint)] peer-checked:shadow-none peer-checked:[&_svg]:opacity-100"
        )}
      >
        <svg
          viewBox="0 0 8 8"
          fill="none"
          className="size-2 text-[var(--nora-on-accent)] opacity-0"
        >
          <path
            d="M1 4.2 3 6.2 7 1.8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {label}
    </label>
  )
}

/* ---------- Switch ---------- */

type NoraSwitchProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">

export function NoraSwitch({ className, id, ...props }: NoraSwitchProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId

  return (
    <label
      htmlFor={inputId}
      data-slot="switch"
      className={cn("relative inline-block h-4 w-[26px] shrink-0 cursor-pointer", className)}
    >
      <input id={inputId} type="checkbox" className="peer sr-only" {...props} />
      <span
        className={cn(
          "absolute inset-0 rounded-full bg-[var(--nora-inset)] shadow-[inset_0_0_0_1px_var(--nora-border-strong)] transition-colors duration-250",
          "peer-checked:bg-[var(--nora-tint)] peer-checked:shadow-none",
          "after:absolute after:top-0.5 after:left-0.5 after:size-3 after:rounded-full after:bg-[var(--nora-on-accent)] after:shadow-sm after:transition-transform after:duration-250",
          "peer-checked:after:translate-x-2.5"
        )}
      />
    </label>
  )
}

/* ---------- Slider ---------- */

export function NoraSlider({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="range"
      className={cn(
        "h-4 w-full min-w-0 cursor-pointer appearance-none bg-transparent outline-none",
        "[&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-sm [&::-webkit-slider-runnable-track]:bg-[var(--nora-inset)]",
        "[&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--nora-on-accent)] [&::-webkit-slider-thumb]:shadow-sm",
        "[&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-sm [&::-moz-range-track]:bg-[var(--nora-inset)]",
        "[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--nora-on-accent)] [&::-moz-range-thumb]:shadow-sm",
        className
      )}
      {...props}
    />
  )
}

/* ---------- Stepper ---------- */

type NoraStepperProps = {
  className?: string
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  showButtons?: boolean
}

export function NoraStepper({
  className,
  value,
  defaultValue = "0",
  onChange,
  showButtons = true,
}: NoraStepperProps) {
  const [internal, setInternal] = React.useState(defaultValue)
  const current = value ?? internal

  function update(next: string) {
    if (value === undefined) setInternal(next)
    onChange?.(next)
  }

  function stepBy(delta: number) {
    const match = String(current).match(/^(-?\d*\.?\d+)(.*)$/)
    if (!match) {
      update(String(delta))
      return
    }
    const next = Number(match[1]) + delta
    update(`${Number.isInteger(next) ? next : next.toFixed(1)}${match[2] ?? ""}`)
  }

  return (
    <div
      className={cn(
        "box-border flex min-w-0 items-center overflow-hidden",
        controlH,
        radiusMd,
        "bg-[var(--nora-input-bg)]",
        className
      )}
    >
      {showButtons ? (
        <button
          type="button"
          onClick={() => stepBy(-1)}
          aria-label="Decrease"
          className="inline-flex h-full w-[22px] shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[13px] leading-none text-[var(--nora-text-tertiary)] transition-colors hover:bg-[var(--nora-row-hover)] hover:text-[var(--nora-text)]"
        >
          −
        </button>
      ) : null}
      <input
        value={current}
        onChange={(e) => update(e.target.value)}
        className={cn(
          "h-full min-w-0 flex-1 border-0 bg-transparent px-0.5 text-center outline-none",
          font,
          "text-[var(--nora-input-text)]"
        )}
      />
      {showButtons ? (
        <button
          type="button"
          onClick={() => stepBy(1)}
          aria-label="Increase"
          className="inline-flex h-full w-[22px] shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[13px] leading-none text-[var(--nora-text-tertiary)] transition-colors hover:bg-[var(--nora-row-hover)] hover:text-[var(--nora-text)]"
        >
          +
        </button>
      ) : null}
    </div>
  )
}

/* ---------- Badge ---------- */

type NoraBadgeVariant = "neutral" | "blue" | "purple" | "green" | "red" | "yellow"

const badgeVariants: Record<NoraBadgeVariant, string> = {
  neutral: "bg-[var(--nora-badge-neutral-bg)] text-[var(--nora-badge-neutral-text)]",
  blue: "bg-[var(--nora-tint-dimmed)] text-[var(--nora-tint)]",
  purple: "bg-[var(--nora-badge-purple-bg)] text-[var(--nora-badge-purple-text)]",
  green: "bg-[var(--nora-badge-green-bg)] text-[var(--nora-badge-green-text)]",
  red: "bg-[var(--nora-badge-red-bg)] text-[var(--nora-badge-red-text)]",
  yellow: "bg-[var(--nora-badge-yellow-bg)] text-[var(--nora-badge-yellow-text)]",
}

export function NoraBadge({
  className,
  variant = "neutral",
  children,
}: {
  className?: string
  variant?: NoraBadgeVariant
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "ios-glass-glare inline-flex h-5 items-center gap-1 rounded-full px-2",
        "font-[family-name:var(--nora-font)] text-[11px] font-medium tracking-normal",
        badgeVariants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

/* ---------- Tooltip / Kbd ---------- */

export function NoraTooltip({
  className,
  tint,
  children,
}: {
  className?: string
  tint?: boolean
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-[var(--nora-radius-sm)] px-2 py-[5px] font-[family-name:var(--nora-font)] text-[11px] font-medium whitespace-nowrap shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
        tint
          ? "bg-[var(--nora-tint)] text-[var(--nora-on-accent)]"
          : "bg-[var(--nora-tooltip-bg)] text-[var(--nora-tooltip-text)]",
        className
      )}
    >
      {children}
    </span>
  )
}

export function NoraKbd({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "nora-kbd inline-flex h-4 min-w-4 items-center justify-center rounded px-1 font-[family-name:var(--nora-font)] text-[10px] font-medium",
        // Тёмный фон чипа: на tint/dark читается; в light на popover — через токен
        "bg-[var(--nora-kbd-bg)] text-[var(--nora-kbd-text)]",
        className
      )}
    >
      {children}
    </span>
  )
}

/* ---------- Menu ---------- */

export function NoraMenu({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex min-w-[200px] flex-col gap-0.5 rounded-[var(--nora-radius-menu,16px)] border border-[var(--nora-menu-border)] bg-[var(--nora-menu-bg,var(--nora-popover))] p-[var(--nora-space-1,5px)] shadow-[var(--nora-shadow-menu)]",
        className
      )}
    >
      {children}
    </div>
  )
}

export function NoraMenuLabel({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "px-2 pt-1.5 pb-1 font-[family-name:var(--nora-font)] text-[10px] font-semibold tracking-widest text-[var(--nora-text-tertiary)] uppercase",
        className
      )}
    >
      {children}
    </div>
  )
}

export function NoraMenuItem({
  className,
  active,
  danger,
  checked,
  icon,
  shortcut,
  children,
}: {
  className?: string
  active?: boolean
  danger?: boolean
  checked?: boolean
  icon?: React.ReactNode
  shortcut?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex h-[var(--nora-control-h)] min-w-0 cursor-pointer items-center rounded-[var(--nora-radius-menu-item,12px)] pr-[var(--nora-space-2,10px)] pl-0 whitespace-nowrap transition-[background-color,color] duration-100",
        font,
        danger
          ? "text-[var(--nora-error)] hover:bg-[var(--nora-error)] hover:text-white"
          : "text-[var(--nora-text-secondary)] hover:bg-[var(--nora-menu-item-hover)] hover:text-[var(--nora-text)]",
        (active || checked) && !danger && "bg-[var(--nora-menu-item-hover)] text-[var(--nora-text)]",
        "[&_svg]:size-3 [&_svg]:shrink-0",
        className
      )}
    >
      <span
        className="inline-flex w-[27px] shrink-0 items-center justify-center text-[var(--nora-text-tertiary)]"
        aria-hidden={!checked}
      >
        {checked ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.2 6.2 4.7 8.6 9.8 3.4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : icon ? (
          icon
        ) : null}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut ? (
        <span className="ml-1 inline-flex shrink-0 gap-1">
          {shortcut}
        </span>
      ) : null}
    </div>
  )
}

export function NoraMenuDivider({ className }: { className?: string }) {
  return (
    <div className={cn("my-1 h-px bg-[var(--nora-divider)]", className)} />
  )
}

/* ---------- Tabs ---------- */

type NoraTabsProps = {
  className?: string
  variant?: "underline" | "pill"
  tabs: string[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

export function NoraTabs({
  className,
  variant = "underline",
  tabs,
  value,
  defaultValue,
  onValueChange,
}: NoraTabsProps) {
  const [internal, setInternal] = React.useState(defaultValue ?? tabs[0])
  const current = value ?? internal

  function select(tab: string) {
    if (value === undefined) setInternal(tab)
    onValueChange?.(tab)
  }

  return (
    <div
      className={cn(
        "flex gap-0.5",
        variant === "underline" && "border-b border-[var(--nora-divider)]",
        variant === "pill" && "gap-1",
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={current === tab}
          onClick={() => select(tab)}
          className={cn(
            "cursor-pointer border-0 bg-transparent px-2.5 font-[family-name:var(--nora-font)] text-xs font-medium transition-colors duration-150",
            variant === "underline" && [
              "mb-[-1px] h-8 border-b-2 border-transparent text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)]",
              current === tab && "border-[var(--nora-tint)] text-[var(--nora-text)]",
            ],
            variant === "pill" && [
              controlH,
              radiusMd,
              "text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)]",
              current === tab && "bg-[var(--nora-row-active-bg)] text-[var(--nora-text)]",
            ]
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

/* ---------- List Item ---------- */

export function NoraList({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={cn("flex flex-col gap-0.5", className)}>{children}</div>
}

export function NoraListItem({
  className,
  selected,
  active,
  icon,
  suffix,
  children,
  style,
}: {
  className?: string
  selected?: boolean
  active?: boolean
  icon?: React.ReactNode
  suffix?: React.ReactNode
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div
      style={style}
      className={cn(
        "flex h-[var(--nora-row-h)] cursor-pointer items-center gap-2 rounded-[var(--nora-radius-md)] px-2 transition-[background-color,color] duration-100",
        font,
        !selected &&
          "text-[var(--nora-text-secondary)] hover:bg-[var(--nora-row-hover)] hover:text-[var(--nora-text)]",
        selected &&
          "bg-[var(--nora-tint-dimmed)] text-[var(--nora-tint)] hover:bg-[var(--nora-tint-dimmed)] hover:text-[var(--nora-tint)]",
        active && !selected && "bg-[var(--nora-row-active-bg)] text-[var(--nora-text)]",
        "[&_svg]:opacity-80",
        className
      )}
    >
      {icon ? (
        <span className="inline-flex size-3.5 shrink-0 items-center justify-center text-current [&_svg]:size-full [&_svg]:shrink-0">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {suffix}
    </div>
  )
}

/* ---------- Panel ---------- */

export function NoraPanel({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "w-60 rounded-[var(--nora-radius-lg)] bg-[var(--nora-panel)] p-2.5 shadow-[0_0_0_1px_var(--nora-border)]",
        className
      )}
    >
      {children}
    </div>
  )
}

export function NoraSectionTitle({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex min-h-[var(--nora-row-h)] items-center justify-between font-[family-name:var(--nora-font)] text-xs font-semibold text-[var(--nora-text)]",
        className
      )}
    >
      {children}
    </div>
  )
}

export function NoraPanelRow({
  className,
  label,
  children,
}: {
  className?: string
  label: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "grid h-[var(--nora-row-h)] grid-cols-[84px_minmax(0,1fr)] items-center gap-2",
        className
      )}
    >
      <label className={cn(font, "truncate text-[var(--nora-text-secondary)]")}>
        {label}
      </label>
      <div className="flex h-[var(--nora-control-h)] min-w-0 items-center [&>*]:min-w-0 [&>*:not([data-slot=switch])]:w-full">
        {children}
      </div>
    </div>
  )
}

/* ---------- Modal ---------- */

export function NoraModal({
  className,
  title,
  children,
  footer,
  onClose,
}: {
  className?: string
  title: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  onClose?: () => void
}) {
  return (
    <div
      className={cn(
        "w-[340px] overflow-hidden rounded-[var(--nora-radius-xl)] bg-[var(--nora-modal)] shadow-[var(--nora-shadow-modal)]",
        className
      )}
    >
      <div className="flex items-center justify-between px-[15px] pt-3.5 font-[family-name:var(--nora-font)] text-[13px] font-semibold text-[var(--nora-text)]">
        {title}
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-5 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--nora-surface)] text-[11px] text-[var(--nora-text-tertiary)] hover:text-[var(--nora-text)]"
        >
          ✕
        </button>
      </div>
      <div
        className={cn(
          "px-[15px] pt-2.5 pb-[15px] font-[family-name:var(--nora-font)] text-xs font-medium leading-normal text-[var(--nora-text-secondary)]"
        )}
      >
        {children}
      </div>
      {footer ? (
        <div className="flex justify-end gap-2 px-[15px] pb-[15px]">{footer}</div>
      ) : null}
    </div>
  )
}

/* ---------- Toast ---------- */

type NoraToastVariant = "default" | "success" | "error"

export function NoraToast({
  className,
  variant = "default",
  action,
  children,
}: {
  className?: string
  variant?: NoraToastVariant
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "inline-flex h-10 items-center gap-2.5 rounded-[var(--nora-radius-lg)] bg-[var(--nora-toast-bg)] pr-2 pl-3.5 font-[family-name:var(--nora-font)] text-xs font-medium text-[var(--nora-toast-text)] shadow-[var(--nora-toast-shadow)]",
        variant === "success" &&
          "before:size-2 before:shrink-0 before:rounded-full before:bg-[var(--nora-success)] before:content-['']",
        variant === "error" &&
          "before:size-2 before:shrink-0 before:rounded-full before:bg-[var(--nora-error)] before:content-['']",
        className
      )}
    >
      {children}
      {action ? (
        <span className="ml-0.5 [&_button]:h-6 [&_button]:bg-[var(--nora-toast-action-bg)] [&_button]:text-[var(--nora-toast-action-text)] [&_button]:hover:bg-[var(--nora-toast-action-hover)]">
          {action}
        </span>
      ) : null}
    </div>
  )
}

/* ---------- Avatar ---------- */

type NoraAvatarSize = "sm" | "default" | "lg"

const avatarSizes: Record<NoraAvatarSize, string> = {
  sm: "size-5 text-[9px]",
  default: "size-[var(--nora-control-h)] text-[11px]",
  lg: "size-9 text-sm",
}

export function NoraAvatar({
  className,
  size = "default",
  style,
  children,
}: {
  className?: string
  size?: NoraAvatarSize
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <span
      style={style}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--nora-avatar-gradient-from)] to-[var(--nora-avatar-gradient-to)] font-[family-name:var(--nora-font)] font-semibold text-[var(--nora-on-accent)]",
        avatarSizes[size],
        className
      )}
    >
      {children}
    </span>
  )
}

export function NoraAvatarStack({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <span className={cn("inline-flex [&>*:not(:first-child)]:-ml-1.5", className)}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<{ className?: string }>, {
              className: cn(
                (child as React.ReactElement<{ className?: string }>).props.className,
                "shadow-[0_0_0_2px_var(--nora-panel)]"
              ),
            })
          : child
      )}
    </span>
  )
}

/* ---------- Progress / Spinner ---------- */

export function NoraProgress({
  className,
  value = 0,
}: {
  className?: string
  value?: number
}) {
  return (
    <div
      className={cn(
        "h-1 w-full overflow-hidden rounded-sm bg-[var(--nora-inset)]",
        className
      )}
    >
      <div
        className="h-full rounded-sm bg-[var(--nora-tint)] transition-[width] duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

export function NoraSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "size-4 animate-spin rounded-full border-2 border-[var(--nora-inset)] border-t-[var(--nora-tint)]",
        className
      )}
    />
  )
}

/* ---------- Breadcrumb ---------- */

export function NoraBreadcrumb({
  className,
  items,
}: {
  className?: string
  items: { label: string; current?: boolean; href?: string }[]
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 font-[family-name:var(--nora-font)] text-xs font-medium text-[var(--nora-text-tertiary)]",
        className
      )}
    >
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 ? <span className="opacity-50">/</span> : null}
          {item.current ? (
            <span className="rounded-[var(--nora-radius-sm)] px-1.5 py-0.5 text-[var(--nora-text)]">
              {item.label}
            </span>
          ) : (
            <a
              href={item.href ?? "#"}
              className="rounded-[var(--nora-radius-sm)] px-1.5 py-0.5 text-[var(--nora-text-secondary)] no-underline transition-colors hover:bg-[var(--nora-row-hover)] hover:text-[var(--nora-text)]"
            >
              {item.label}
            </a>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

/* ---------- Empty ---------- */

/** Meal / ration sheet title — cards, modals, and plaques. */
export const noraProductTitleClass =
  'font-[family-name:var(--nora-font)] text-[15px] font-medium leading-6 tracking-normal text-[var(--nora-text)]'

/** Meal date / card ingredients — empty copy. */
export const noraProductMetaClass =
  'font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]'

/** Shopping / editor plaque — frost row, not a floating centered empty. */
export const noraPlaqueClass = cn(
  'ios-glass-glare-soft flex items-center gap-2.5 rounded-[14px] px-2.5 py-2',
  'bg-[var(--nora-input-bg)]/72 text-[var(--nora-text-secondary)] backdrop-blur-[16px]',
)

export const noraPlaqueIconClass = cn(
  'ios-glass-glare-soft inline-flex size-8 shrink-0 items-center justify-center rounded-full border-0',
  'bg-[var(--nora-panel)]/80 text-[var(--nora-text)] backdrop-blur-[8px]',
  '[&_svg]:size-3.5',
)

export function NoraEmpty({
  className,
  icon,
  title,
  description,
  action,
}: {
  className?: string
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className={cn(noraPlaqueClass, className)}>
      {icon ? <span className={noraPlaqueIconClass}>{icon}</span> : null}
      <div className="min-w-0 flex-1 text-left">
        <div className={noraProductTitleClass}>{title}</div>
        {description ? (
          <div className={noraProductMetaClass} data-slot="empty-description">
            {description}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0 [&_button]:rounded-full">{action}</div> : null}
    </div>
  )
}

/* ---------- Divider ---------- */

export function NoraDivider({
  className,
  title,
}: {
  className?: string
  title?: string
}) {
  if (title) {
    return (
      <div
        className={cn(
          "flex h-auto items-center gap-2.5 font-[family-name:var(--nora-font)] text-[10px] font-semibold tracking-widest text-[var(--nora-text-tertiary)] uppercase",
          "before:h-px before:flex-1 before:bg-[var(--nora-divider)] before:content-['']",
          "after:h-px after:flex-1 after:bg-[var(--nora-divider)] after:content-['']",
          className
        )}
      >
        {title}
      </div>
    )
  }

  return <hr className={cn("h-px border-0 bg-[var(--nora-divider)]", className)} />
}

/* ---------- Collapsible ---------- */

export function NoraCollapsible({
  className,
  title,
  children,
  defaultOpen,
}: {
  className?: string
  title: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details
      className={cn(
        "group/collapse border-b border-[var(--nora-divider)]",
        className
      )}
      open={defaultOpen}
    >
      <summary
        className={cn(
          "flex h-[38px] cursor-pointer list-none items-center justify-between font-[family-name:var(--nora-font)] text-xs font-semibold text-[var(--nora-text)] select-none",
          "after:size-1.5 after:rotate-45 after:border-r-[1.5px] after:border-b-[1.5px] after:border-[var(--nora-text-tertiary)] after:transition-transform after:duration-150 after:content-['']",
          "[&::-webkit-details-marker]:hidden",
          "group-open/collapse:after:rotate-[225deg]"
        )}
      >
        {title}
      </summary>
      <div className="pb-3 font-[family-name:var(--nora-font)] text-xs leading-normal text-[var(--nora-text-secondary)]">
        {children}
      </div>
    </details>
  )
}

/* ---------- Search ---------- */

export const NoraSearch = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    icon?: React.ReactNode
    inputClassName?: string
  }
>(function NoraSearch({ className, inputClassName, icon, ...props }, ref) {
  return (
    <div
      className={cn(
        "box-border flex items-center gap-[7px] border border-transparent px-[var(--nora-space-2,10px)]",
        controlH,
        radiusMd,
        "bg-[var(--nora-input-bg)] transition-[box-shadow,background-color,border-color]",
        "focus-within:bg-[color-mix(in_srgb,var(--nora-input-bg)_72%,var(--nora-panel))] focus-within:shadow-[inset_0_0_0_1.5px_var(--nora-tint)]",
        className
      )}
    >
      <span className="shrink-0 text-[var(--nora-text-tertiary)] [&_svg]:size-3.5">
        {icon}
      </span>
      <input
        ref={ref}
        className={cn(
          "min-w-0 flex-1 border-0 bg-transparent outline-none",
          font,
          "text-[var(--nora-input-text)] placeholder:text-[var(--nora-input-placeholder)]",
          inputClassName
        )}
        {...props}
      />
    </div>
  )
})

/* ---------- Color Well ---------- */

export function NoraColorWell({
  className,
  color,
  label,
  chipStyle,
}: {
  className?: string
  color?: string
  label: React.ReactNode
  chipStyle?: React.CSSProperties
}) {
  return (
    <div
      className={cn(
        "inline-flex cursor-pointer items-center gap-2",
        controlH,
        radiusMd,
        "bg-[var(--nora-input-bg)] px-2 font-[family-name:var(--nora-font-mono)] text-xs leading-none font-medium text-[var(--nora-input-text)]",
        className
      )}
    >
      <span
        className="size-3.5 shrink-0 rounded-[var(--nora-radius-xs)] shadow-[inset_0_0_0_1px_var(--nora-border)]"
        style={{ background: color, ...chipStyle }}
      />
      <span className="leading-none">{label}</span>
    </div>
  )
}
