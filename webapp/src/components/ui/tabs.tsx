"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-3 font-[family-name:var(--nora-font)] data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-[var(--nora-radius-md,8px)] p-[3px] text-xs font-medium text-[var(--nora-text-secondary)] group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col group-data-vertical/tabs:items-stretch data-[variant=line]:rounded-none data-[variant=line]:p-0",
  {
    variants: {
      variant: {
        // как Button default: трек ~30px, сегменты читаемые
        default:
          "h-[var(--nora-row-h,30px)] bg-[var(--nora-input-bg)] group-data-vertical/tabs:h-auto",
        line: "h-auto gap-0 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex flex-1 items-center justify-center gap-1.5 rounded-[var(--nora-radius-sm,6px)] border border-transparent px-3 text-xs font-medium whitespace-nowrap text-[var(--nora-text-secondary)] transition-[color,background-color,box-shadow] duration-[var(--nora-duration,0.15s)] group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-[var(--nora-text)] focus-visible:shadow-[var(--nora-shadow-focus)] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        // default segment — заполняет трек 30px
        "group-data-[variant=default]/tabs-list:h-full",
        // vertical — нормальная высота строки, не сжатая
        "group-data-vertical/tabs:min-h-[var(--nora-row-h,30px)]",
        // line — выше и с паддингом, как nav-табы
        "group-data-[variant=line]/tabs-list:h-8 group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:px-3 group-data-[variant=line]/tabs-list:data-active:bg-transparent group-data-[variant=line]/tabs-list:data-active:shadow-none",
        "data-active:bg-[var(--nora-panel)] data-active:text-[var(--nora-text)] data-active:shadow-[0_1px_2px_rgba(0,0,0,0.06)]",
        "after:absolute after:bg-[var(--nora-tint)] after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-0 group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-1 group-data-vertical/tabs:after:-right-px group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(
        "flex-1 text-xs font-medium text-[var(--nora-text-secondary)] outline-none",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
