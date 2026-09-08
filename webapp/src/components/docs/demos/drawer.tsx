import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

import type { ComponentDoc } from "./types"

/** Ряд инспектора Nora: лейбл и контрол на одной линии, общий левый край */
function PropRow({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex h-[var(--nora-row-h,30px)] items-center gap-3",
        className
      )}
    >
      <Label
        htmlFor={htmlFor}
        className="w-[110px] shrink-0 text-[var(--nora-text-secondary)]"
      >
        {label}
      </Label>
      <div className="flex min-w-0 flex-1 items-center justify-end">{children}</div>
    </div>
  )
}

export const drawerDoc: ComponentDoc = {
  id: "drawer",
  examples: [
    {
      title: "Basic",
      description: "Bottom sheet ~400px, не на всю ширину экрана.",
      code: `<Drawer>…</Drawer>`,
      render: () => (
        <Drawer>
          <DrawerTrigger render={<Button variant="outline" />}>
            Open Drawer
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader className="text-center">
              <DrawerTitle>Publish site</DrawerTitle>
              <DrawerDescription>
                Review the domain before going live.
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col gap-1 px-[15px] pt-2.5">
              <PropRow label="Domain" htmlFor="drawer-domain">
                <Input
                  id="drawer-domain"
                  className="max-w-none"
                  defaultValue="truepoints.Nora.website"
                />
              </PropRow>
              <p className="pt-1 text-xs font-medium text-[var(--nora-text-tertiary)]">
                Drag the handle or tap outside to dismiss.
              </p>
            </div>
            <DrawerFooter>
              <DrawerClose render={<Button variant="outline" />}>
                Cancel
              </DrawerClose>
              <DrawerClose render={<Button />}>Publish</DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ),
    },
    {
      title: "Swipe right",
      description: "Side panel 260px — ряды инспектора, один левый край.",
      code: `<Drawer swipeDirection="right" showSwipeHandle={false}>...</Drawer>`,
      render: () => (
        <Drawer swipeDirection="right" showSwipeHandle={false}>
          <DrawerTrigger render={<Button variant="outline" />}>
            Open right
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader className="border-b border-[var(--nora-divider)] pb-3">
              <DrawerTitle>Page</DrawerTitle>
              <DrawerDescription>Layout and visibility.</DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col gap-0.5 px-[15px] py-2">
              <PropRow label="Name" htmlFor="drawer-page-name">
                <Input id="drawer-page-name" defaultValue="Home" />
              </PropRow>
              <PropRow label="Visible" htmlFor="drawer-visible">
                <Switch id="drawer-visible" defaultChecked />
              </PropRow>
              <PropRow label="Locked" htmlFor="drawer-locked">
                <Switch id="drawer-locked" />
              </PropRow>
            </div>
            <DrawerFooter className="border-t border-[var(--nora-divider)]">
              <DrawerClose render={<Button variant="outline" />}>
                Close
              </DrawerClose>
              <DrawerClose render={<Button />}>Apply</DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ),
    },
  ],
}
