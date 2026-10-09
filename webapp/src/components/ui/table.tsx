import * as React from "react"

import { cn } from "@/lib/utils"

/** Safari ignores display:grid and display:contents on table, thead, tbody, and tr, so column padding collapses there. */
const TableFrameContext = React.createContext(false)

/** Nora data table — 30px rows, soft zebra, tertiary heads, row-hover */
function Table({
  className,
  columns = false,
  ...props
}: React.ComponentProps<"table"> & {
  columns?: boolean
}) {
  return (
    <TableFrameContext.Provider value={columns}>
      <div
        data-slot="table-container"
        className="relative w-full overflow-x-auto"
      >
        {columns ? (
          <div
            data-slot="table"
            role="table"
            className={cn(
              "w-full font-[family-name:var(--nora-font)] text-xs text-[var(--nora-text)]",
              className
            )}
            {...(props as React.ComponentProps<"div">)}
          />
        ) : (
          <table
            data-slot="table"
            className={cn(
              "w-full caption-bottom font-[family-name:var(--nora-font)] text-xs text-[var(--nora-text)]",
              className
            )}
            {...props}
          />
        )}
      </div>
    </TableFrameContext.Provider>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  const columns = React.useContext(TableFrameContext)
  const classes = cn(
    "[&_tr]:border-b [&_tr]:border-[var(--nora-divider)]",
    columns && "contents",
    className
  )
  if (columns) {
    return (
      <div
        data-slot="table-header"
        role="rowgroup"
        className={classes}
        {...(props as React.ComponentProps<"div">)}
      />
    )
  }
  return (
    <thead
      data-slot="table-header"
      className={classes}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  const columns = React.useContext(TableFrameContext)
  const classes = cn(
    // лёгкая зебра — even rows; hover/selected перекрывают
    "[&_tr:nth-child(even)]:bg-[color-mix(in_srgb,var(--nora-text)_1.2%,transparent)] [&_tr:last-child]:border-0",
    columns && "contents",
    className
  )
  if (columns) {
    return (
      <div
        data-slot="table-body"
        role="rowgroup"
        className={classes}
        {...(props as React.ComponentProps<"div">)}
      />
    )
  }
  return (
    <tbody
      data-slot="table-body"
      className={classes}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t border-[var(--nora-divider)] bg-[var(--nora-input-bg)] font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  const columns = React.useContext(TableFrameContext)
  const classes = cn(
    "border-b border-[var(--nora-divider)] transition-colors duration-[var(--nora-duration,0.15s)] hover:bg-[var(--nora-row-hover)] has-aria-expanded:bg-[var(--nora-row-hover)] data-[state=selected]:bg-[color-mix(in_srgb,var(--nora-tint)_12%,transparent)]",
    className
  )
  if (columns) {
    return (
      <div
        data-slot="table-row"
        role="row"
        className={classes}
        {...(props as React.ComponentProps<"div">)}
      />
    )
  }
  return (
    <tr
      data-slot="table-row"
      className={classes}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  const columns = React.useContext(TableFrameContext)
  const classes = cn(
    "h-[var(--nora-row-h,30px)] px-3 text-left align-middle text-[11px] font-medium whitespace-nowrap text-[var(--nora-text-tertiary)] [&:has([role=checkbox])]:pr-0",
    className
  )
  if (columns) {
    return (
      <div
        data-slot="table-head"
        role="columnheader"
        className={classes}
        {...(props as React.ComponentProps<"div">)}
      />
    )
  }
  return (
    <th
      data-slot="table-head"
      className={classes}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  const columns = React.useContext(TableFrameContext)
  const classes = cn(
    "min-h-[var(--nora-row-h,30px)] px-3 py-0 align-middle text-xs whitespace-nowrap text-[var(--nora-text)] [&:has([role=checkbox])]:pr-0",
    className
  )
  if (columns) {
    return (
      <div
        data-slot="table-cell"
        role="cell"
        className={classes}
        {...(props as React.ComponentProps<"div">)}
      />
    )
  }
  return (
    <td
      data-slot="table-cell"
      className={classes}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn(
        "mt-2 px-3 pb-3 text-[11px] font-medium text-[var(--nora-text-tertiary)]",
        className
      )}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
