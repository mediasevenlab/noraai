import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const typographyVariants = cva("min-w-0 tracking-normal", {
  variants: {
    variant: {
      // Nora UI type scale (DsTypographyPage): denser Inter / Inter Display rhythm
      h1: "font-heading text-[36px] leading-[1.1] font-bold tracking-[-0.02em]",
      h2: "font-heading text-[26px] leading-[1.2] font-bold tracking-[-0.02em]",
      h3: "font-heading text-[20px] leading-[1.3] font-semibold tracking-[-0.01em]",
      h4: "font-heading text-[18px] leading-[1.3] font-semibold tracking-[-0.01em]",
      h5: "font-heading text-[15px] leading-[1.3] font-semibold tracking-[-0.01em]",
      h6: "font-heading text-[14px] leading-[1.35] font-semibold",
      lead: "text-[15px] leading-[1.5] font-medium",
      body: "text-[13px] leading-[1.4] font-medium",
      bodySm: "text-xs leading-[1.4] font-medium",
      bodyXs: "text-[11px] leading-[1.3] font-medium",
      bodySmMedium: "text-xs leading-[1.4] font-medium",
      emphasis: "font-medium",
      label: "text-xs leading-none font-medium",
      control: "text-xs leading-none font-medium whitespace-nowrap",
      controlXs: "text-[11px] leading-none font-medium whitespace-nowrap",
      kbd: "font-sans text-[10px] leading-none font-medium whitespace-nowrap",
      input:
        "text-[13px] leading-normal font-medium file:text-xs file:font-medium",
      caption: "text-[11px] leading-[1.3] font-medium",
      shortcut: "text-[10px] leading-normal tracking-widest font-medium",
      code: "font-mono text-xs leading-normal font-medium",
      avatar: "text-xs leading-none font-medium group-data-[size=sm]/avatar:text-[11px]",
      avatarCount:
        "text-xs leading-none font-medium group-has-data-[size=sm]/avatar-group:text-[11px]",
      calendar:
        "text-xs leading-normal font-medium [&_.rdp-caption_label]:text-xs [&_.rdp-caption_label]:font-medium [&_.rdp-dropdowns]:text-xs [&_.rdp-dropdowns]:font-medium [&_.rdp-week_number]:text-[10px] [&_.rdp-weekday]:text-[10px] [&_.rdp-weekday]:font-medium",
      calendarDay:
        "text-xs leading-none font-medium [&>span]:text-[11px]",
      commandGroup:
        "text-xs leading-normal font-medium **:[[cmdk-group-heading]]:text-[11px] **:[[cmdk-group-heading]]:leading-normal **:[[cmdk-group-heading]]:font-semibold",
      srOnly: "sr-only",
    },
    tone: {
      current: "",
      default: "text-foreground",
      muted: "text-muted-foreground",
      destructive: "text-destructive",
      primary: "text-primary",
      card: "text-card-foreground",
      popover: "text-popover-foreground",
      sidebar: "text-sidebar-foreground",
      inverse: "text-background",
    },
    align: {
      start: "text-left",
      center: "text-center",
      end: "text-right",
    },
    balance: {
      true: "text-balance",
    },
    pretty: {
      true: "text-pretty",
    },
    truncate: {
      true: "truncate",
    },
    wrap: {
      normal: "",
      nowrap: "whitespace-nowrap",
      break: "break-all",
    },
  },
  defaultVariants: {
    variant: "body",
    tone: "current",
  },
})

type TypographyVariant = NonNullable<
  VariantProps<typeof typographyVariants>["variant"]
>

const defaultElementByVariant: Record<TypographyVariant, React.ElementType> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  lead: "p",
  body: "p",
  bodySm: "p",
  bodyXs: "p",
  bodySmMedium: "p",
  emphasis: "strong",
  label: "span",
  control: "span",
  controlXs: "span",
  kbd: "kbd",
  input: "span",
  caption: "span",
  shortcut: "span",
  code: "code",
  avatar: "span",
  avatarCount: "span",
  calendar: "div",
  calendarDay: "span",
  commandGroup: "div",
  srOnly: "span",
}

type TypographyOwnProps<TElement extends React.ElementType = "span"> =
  VariantProps<typeof typographyVariants> & {
    as?: TElement
    asChild?: boolean
  }

type TypographyProps<TElement extends React.ElementType = "span"> =
  TypographyOwnProps<TElement> &
    Omit<
      React.ComponentPropsWithoutRef<TElement>,
      keyof TypographyOwnProps<TElement>
    >

function Typography<TElement extends React.ElementType = "span">({
  as,
  asChild = false,
  className,
  variant,
  tone,
  align,
  balance,
  pretty,
  truncate,
  wrap,
  ...props
}: TypographyProps<TElement>) {
  const resolvedVariant = variant ?? "body"
  const typographyClassName = cn(
    typographyVariants({
      variant: resolvedVariant,
      tone,
      align,
      balance,
      pretty,
      truncate,
      wrap,
    }),
    className,
  )

  if (asChild) {
    const { children, ...childProps } = props
    const child = React.Children.only(children) as React.ReactElement<{
      className?: string
    }>

    return React.cloneElement(child, {
      ...childProps,
      "data-variant": resolvedVariant,
      className: cn(typographyClassName, child.props.className),
    })
  }

  const Comp = as ?? defaultElementByVariant[resolvedVariant]

  return (
    <Comp
      data-slot="typography"
      data-variant={resolvedVariant}
      className={typographyClassName}
      {...props}
    />
  )
}

export { Typography }
export type { TypographyProps }
