import { useMemo } from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        // legend+desc плотно; FieldGroup сам даёт отступ сверху
        "flex flex-col gap-1 has-[>[data-slot=checkbox-group]]:gap-2.5 has-[>[data-slot=radio-group]]:gap-2.5",
        className
      )}
      {...props}
    />
  )
}

function FieldLegend({
  className,
  variant = "legend",
  ...props
}: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        // сброс UA-отступов у <legend>
        "w-full p-0 font-[family-name:var(--nora-font)] font-semibold text-[var(--nora-text)]",
        "data-[variant=legend]:text-[13px] data-[variant=label]:text-xs",
        className
      )}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        // отступ от legend/desc + 10px между полями (как dialog form)
        "group/field-group @container/field-group mt-2.5 flex w-full flex-col gap-2.5 data-[slot=checkbox-group]:gap-2 *:data-[slot=field-group]:gap-2.5",
        className
      )}
      {...props}
    />
  )
}

const fieldVariants = cva(
  "group/field flex w-full data-invalid:text-[var(--nora-error)]",
  {
    variants: {
      orientation: {
        // label→control 6px; hint/error чуть ближе к контролу
        vertical:
          "flex-col gap-1.5 *:w-full [&>.sr-only]:w-auto [&_[data-slot=field-description]]:mt-[-2px] [&_[data-slot=field-error]]:mt-[-2px]",
        horizontal:
          "flex-row items-start gap-2.5 *:data-[slot=field-label]:flex-auto [&>[role=checkbox],&>[role=radio],&>[data-slot=checkbox]]:mt-0.5",
        responsive:
          "flex-col gap-1.5 *:w-full [&>.sr-only]:w-auto [&_[data-slot=field-description]]:mt-[-2px] [&_[data-slot=field-error]]:mt-[-2px] @md/field-group:flex-row @md/field-group:items-start @md/field-group:gap-2.5 @md/field-group:*:w-auto @md/field-group:*:data-[slot=field-label]:flex-auto @md/field-group:[&>[role=checkbox],&>[role=radio],&>[data-slot=checkbox]]:mt-0.5",
      },
    },
    defaultVariants: {
      orientation: "vertical",
    },
  }
)

function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  )
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn(
        "group/field-content flex min-w-0 flex-1 flex-col gap-1 leading-snug",
        className
      )}
      {...props}
    />
  )
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        "w-fit text-xs font-medium leading-none text-[var(--nora-text-secondary)] select-none",
        "group-data-[disabled=true]/field:opacity-50",
        // Choice card: Label wraps Field + radio/checkbox
        "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-[var(--nora-radius-md)] has-[>[data-slot=field]]:bg-[var(--nora-input-bg)] has-[>[data-slot=field]]:p-2.5",
        "has-data-checked:bg-[var(--nora-tint-dimmed)] has-data-checked:shadow-[inset_0_0_0_1px_var(--nora-tint)]",
        "*:data-[slot=field]:w-full",
        className
      )}
      {...props}
    />
  )
}

function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-title"
      className={cn(
        "flex w-fit items-center gap-2 text-xs font-semibold text-[var(--nora-text)] group-data-[disabled=true]/field:opacity-50",
        className
      )}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        "text-left text-[11px] font-normal leading-normal text-[var(--nora-text-tertiary)]",
        "group-has-data-horizontal/field:text-balance",
        "[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-[var(--nora-tint)]",
        className
      )}
      {...props}
    />
  )
}

function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  children?: React.ReactNode
}) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn("relative my-1.5 h-5 text-xs", className)}
      {...props}
    >
      <Separator className="absolute inset-x-0 top-1/2 bg-[var(--nora-divider)]" />
      {children && (
        <span
          className="relative mx-auto block w-fit bg-[var(--nora-canvas)] px-2 text-[var(--nora-text-tertiary)]"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  )
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<"div"> & {
  errors?: Array<{ message?: string } | undefined>
}) {
  const content = useMemo(() => {
    if (children) {
      return children
    }

    if (!errors?.length) {
      return null
    }

    const uniqueErrors = [
      ...new Map(errors.map((error) => [error?.message, error])).values(),
    ]

    if (uniqueErrors?.length == 1) {
      return uniqueErrors[0]?.message
    }

    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {uniqueErrors.map(
          (error, index) =>
            error?.message && <li key={index}>{error.message}</li>
        )}
      </ul>
    )
  }, [children, errors])

  if (!content) {
    return null
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn(
        "text-xs font-normal text-[var(--nora-error)]",
        className
      )}
      {...props}
    >
      {content}
    </div>
  )
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
}
