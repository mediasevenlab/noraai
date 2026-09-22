"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { MobileSheetGrabber } from "@/components/ui/mobile-sheet-grabber"

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 duration-[var(--nora-duration,0.15s)] data-ending-style:opacity-0 data-starting-style:opacity-0",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  overlayClassName,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
  overlayClassName?: string
}) {
  return (
    <SheetPortal>
      <SheetOverlay className={overlayClassName} />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "group/sheet-content fixed z-50 flex flex-col gap-0 bg-[var(--nora-modal)] font-[family-name:var(--nora-font)] text-xs text-[var(--nora-text)] shadow-[var(--nora-shadow-modal)] transition duration-200 ease-in-out outline-none data-ending-style:opacity-0 data-starting-style:opacity-0",
          // top / bottom — по контенту, не на всю высоту
          "data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:max-h-[min(480px,85vh)] data-[side=bottom]:rounded-t-[var(--modal-sheet-radius)] data-[side=bottom]:border-t data-[side=bottom]:border-[var(--nora-divider)] data-[side=bottom]:data-ending-style:translate-y-[2.5rem] data-[side=bottom]:data-starting-style:translate-y-[2.5rem]",
          "data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:max-h-[min(480px,85vh)] data-[side=top]:rounded-b-[var(--nora-radius-xl,14px)] data-[side=top]:border-b data-[side=top]:border-[var(--nora-divider)] data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem]",
          // left / right — на всю высоту, футер прижат вниз
          "data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:border-[var(--nora-divider)] data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-[side=left]:sm:max-w-sm",
          "data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:border-[var(--nora-divider)] data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem] data-[side=right]:sm:max-w-sm",
          className
        )}
        {...props}
      >
        {side === "bottom" ? (
          <MobileSheetGrabber
            dismiss={
              <SheetPrimitive.Close
                aria-hidden
                className="sr-only"
                data-sheet-dismiss=""
                tabIndex={-1}
              />
            }
          />
        ) : null}
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            className={cn(
              "absolute top-3.5 right-[15px] inline-flex size-5 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--nora-surface)] text-[var(--nora-text-tertiary)] outline-none transition-colors",
              "hover:text-[var(--nora-text)] focus-visible:shadow-[var(--nora-shadow-focus)]"
            )}
          >
            <XIcon className="size-3" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn(
        "flex shrink-0 flex-col gap-0.5 px-[15px] pt-3.5 pr-10",
        className
      )}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        // без mt-auto по умолчанию — футер сразу под контентом (как Dialog).
        // Для sticky-футера на tall side sheet: className="mt-auto"
        "flex shrink-0 flex-col-reverse gap-2 px-[15px] pt-2.5 pb-[15px] sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "text-[13px] leading-none font-semibold text-[var(--nora-text)]",
        className
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn(
        "text-xs font-medium leading-normal text-[var(--nora-text-secondary)]",
        className
      )}
      {...props}
    />
  )
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-body"
      className={cn("min-h-0 px-[15px] pt-2.5 pb-2.5", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetBody,
}
