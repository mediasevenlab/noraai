"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"

import { cn } from "@/lib/utils"
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "@/components/icons"

/** modal=false по умолчанию — без затемнения всего приложения */
function Select<Value, Multiple extends boolean | undefined = false>({
  modal = false,
  ...props
}: SelectPrimitive.Root.Props<Value, Multiple>) {
  return <SelectPrimitive.Root data-slot="select" modal={modal} {...props} />
}

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1", className)}
      {...props}
    />
  )
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("flex flex-1 text-left", className)}
      {...props}
    />
  )
}

function SelectTrigger({
  className,
  size = "default",
  hideIcon = false,
  iconVariant = "plain",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default"
  hideIcon?: boolean
  iconVariant?: "plain" | "circle"
}) {
  const chevron = (
    <ChevronDownIcon className="pointer-events-none size-3 text-[var(--nora-text-tertiary)]" />
  )
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        // Framer filter button: 30×, 8px radius, 0 10px pad, transparent border → #333 when open
        "box-border flex w-fit items-center justify-between gap-[var(--nora-space-2,10px)] overflow-hidden rounded-[var(--nora-radius-md,8px)] border border-transparent bg-[var(--nora-input-bg)] py-0 px-[var(--nora-space-2,10px)] font-[family-name:var(--nora-font)] text-xs font-medium leading-none text-[var(--nora-input-text)] whitespace-nowrap transition-[border-color,box-shadow] outline-none select-none",
        "data-[popup-open]:border-[var(--nora-menu-border)] focus-visible:border-[var(--nora-menu-border)] focus-visible:shadow-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-placeholder:text-[var(--nora-input-placeholder)]",
        "data-[size=default]:h-[var(--nora-control-h,30px)] data-[size=default]:min-h-[var(--nora-control-h,30px)] data-[size=sm]:h-[22px] data-[size=sm]:min-h-[22px]",
        "*:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:flex-1 *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3",
        className
      )}
      {...props}
    >
      {children}
      {hideIcon ? null : iconVariant === "circle" ? (
        <SelectPrimitive.Icon
          render={
            <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--nora-text)_3.5%,var(--nora-panel))] text-[var(--nora-text-tertiary)]">
              {chevron}
            </span>
          }
        />
      ) : (
        <SelectPrimitive.Icon render={chevron} />
      )}
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "start",
  alignOffset = 0,
  /** Nora: список под/над триггером, не «прилипает» к выбранному пункту */
  alignItemWithTrigger = false,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  >) {
  return (
    <SelectPrimitive.Portal className="relative z-[80]">
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-[80]"
        positionMethod="fixed"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn(
            "relative isolate z-50 max-h-(--available-height) w-max min-w-(--anchor-width) origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-[var(--nora-radius-menu,16px)] border border-[var(--nora-menu-border)] bg-[var(--nora-menu-bg,var(--nora-popover))] p-[var(--nora-space-1,5px)] font-[family-name:var(--nora-font)] text-xs text-[var(--nora-text)] shadow-[var(--nora-shadow-menu)] duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
        className={cn(
          "px-1.5 py-1 text-xs font-medium text-[var(--nora-text-tertiary)]",
          className
        )}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  indicator = "start",
  ...props
}: SelectPrimitive.Item.Props & {
  indicator?: "start" | "end"
}) {
  const check = (
    <span
      className={cn(
        "pointer-events-none flex shrink-0 items-center justify-center text-[var(--nora-text-tertiary)]",
        indicator === "start" ? "w-[27px]" : "w-4",
      )}
    >
      <SelectPrimitive.ItemIndicator>
        <CheckIcon className="size-3" />
      </SelectPrimitive.ItemIndicator>
    </span>
  )

  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        // Framer option: 30px, 8px radius, check column left (27px), hover #333
        "relative flex h-[var(--nora-control-h,30px)] w-full cursor-default items-center rounded-[var(--nora-radius-menu-item,12px)] py-0 font-[family-name:var(--nora-font)] text-xs font-medium leading-none text-[var(--nora-text-secondary)] outline-hidden select-none transition-[background-color,color] duration-100 hover:bg-[var(--nora-menu-item-hover)] hover:text-[var(--nora-text)] hover:[&_span]:text-[var(--nora-text)] data-highlighted:bg-[var(--nora-menu-item-hover)] data-highlighted:text-[var(--nora-text)] data-highlighted:[&_span]:text-[var(--nora-text)] focus:bg-[var(--nora-menu-item-hover)] focus:text-[var(--nora-text)] data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3",
        indicator === "start"
          ? "pr-[var(--nora-space-2,10px)] pl-0"
          : "pr-2 pl-[var(--nora-space-2,10px)]",
        className
      )}
      {...props}
    >
      {indicator === "start" ? check : null}
      <SelectPrimitive.ItemText className="flex min-w-0 flex-1 gap-2 whitespace-nowrap text-current">
        {children}
      </SelectPrimitive.ItemText>
      {indicator === "end" ? check : null}
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(
        "pointer-events-none -mx-1 my-1 h-px bg-[var(--nora-divider)]",
        className
      )}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-[var(--nora-popover)] py-1 text-[var(--nora-text-tertiary)] [&_svg:not([class*='size-'])]:size-3.5",
        className
      )}
      {...props}
    >
      <ChevronUpIcon
      />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-[var(--nora-popover)] py-1 text-[var(--nora-text-tertiary)] [&_svg:not([class*='size-'])]:size-3.5",
        className
      )}
      {...props}
    >
      <ChevronDownIcon
      />
    </SelectPrimitive.ScrollDownArrow>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
