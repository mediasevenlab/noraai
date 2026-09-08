import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { NoraBadge } from "@/components/nora/primitives"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { ComponentDoc } from "./types"

type Invoice = {
  id: string
  status: "Paid" | "Pending" | "Unpaid"
  method: string
  amount: string
}

type ColumnKey = "status" | "method" | "amount"

const invoices: Invoice[] = [
  { id: "INV001", status: "Paid", method: "Credit Card", amount: "$250.00" },
  { id: "INV002", status: "Pending", method: "PayPal", amount: "$150.00" },
  { id: "INV003", status: "Unpaid", method: "Bank Transfer", amount: "$350.00" },
  { id: "INV004", status: "Paid", method: "Credit Card", amount: "$450.00" },
  { id: "INV005", status: "Paid", method: "PayPal", amount: "$550.00" },
]

const COLUMN_LABELS: Record<ColumnKey, string> = {
  status: "Status",
  method: "Method",
  amount: "Amount",
}

function statusBadge(status: Invoice["status"]) {
  if (status === "Paid") return <NoraBadge variant="green">Paid</NoraBadge>
  if (status === "Pending")
    return <NoraBadge variant="yellow">Pending</NoraBadge>
  return <NoraBadge variant="neutral">Unpaid</NoraBadge>
}

function SelectableTable() {
  const [query, setQuery] = React.useState("")
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [page, setPage] = React.useState(0)
  const [columns, setColumns] = React.useState<Record<ColumnKey, boolean>>({
    status: true,
    method: true,
    amount: true,
  })
  const pageSize = 5

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return invoices
    return invoices.filter(
      (row) =>
        row.id.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q) ||
        row.method.toLowerCase().includes(q)
    )
  }, [query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice(page * pageSize, page * pageSize + pageSize)
  const allPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))
  const visibleCols = (Object.keys(columns) as ColumnKey[]).filter(
    (k) => columns[k]
  )
  const colSpan = 2 + visibleCols.length

  function toggleAll(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const row of pageRows) {
        if (checked) next.add(row.id)
        else next.delete(row.id)
      }
      return next
    })
  }

  function toggleRow(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function setColumn(key: ColumnKey, value: boolean) {
    setColumns((prev) => {
      const next = { ...prev, [key]: value }
      // хотя бы одна колонка кроме Invoice
      if (!Object.values(next).some(Boolean)) return prev
      return next
    })
  }

  return (
    <div className="w-full max-w-2xl space-y-3">
      <div className="flex items-center gap-2">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(0)
          }}
          placeholder="Filter invoices…"
          className="h-[var(--nora-control-h)] w-[220px] max-w-[45%]"
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm" className="ml-auto gap-1.5" />
            }
          >
            Columns
            <ChevronDownIcon className="size-3.5 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(Object.keys(COLUMN_LABELS) as ColumnKey[]).map((key) => (
              <DropdownMenuCheckboxItem
                key={key}
                checked={columns[key]}
                onCheckedChange={(v) => setColumn(key, v === true)}
              >
                {COLUMN_LABELS[key]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-hidden rounded-[var(--nora-radius-lg)] border border-[var(--nora-divider)] bg-[var(--nora-panel)]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 px-3">
                <Checkbox
                  aria-label="Select all"
                  checked={allPageSelected}
                  onCheckedChange={(v) => toggleAll(v === true)}
                />
              </TableHead>
              <TableHead>Invoice</TableHead>
              {columns.status ? <TableHead>Status</TableHead> : null}
              {columns.method ? <TableHead>Method</TableHead> : null}
              {columns.amount ? (
                <TableHead className="text-right">Amount</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={colSpan}
                  className="h-16 text-center text-[var(--nora-text-tertiary)]"
                >
                  No invoices match this filter.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((invoice) => {
                const isSelected = selected.has(invoice.id)
                return (
                  <TableRow
                    key={invoice.id}
                    data-state={isSelected ? "selected" : undefined}
                  >
                    <TableCell className="px-3">
                      <Checkbox
                        aria-label={`Select ${invoice.id}`}
                        checked={isSelected}
                        onCheckedChange={(v) =>
                          toggleRow(invoice.id, v === true)
                        }
                      />
                    </TableCell>
                    <TableCell className="font-semibold">{invoice.id}</TableCell>
                    {columns.status ? (
                      <TableCell>{statusBadge(invoice.status)}</TableCell>
                    ) : null}
                    {columns.method ? (
                      <TableCell className="text-[var(--nora-text-secondary)]">
                        {invoice.method}
                      </TableCell>
                    ) : null}
                    {columns.amount ? (
                      <TableCell className="text-right tabular-nums text-[var(--nora-text-secondary)]">
                        {invoice.amount}
                      </TableCell>
                    ) : null}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-[12px] text-[var(--nora-text-tertiary)]">
        <span>
          {selected.size} of {filtered.length} row(s) selected
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

function CompactTable() {
  return (
    <div className="max-w-lg overflow-hidden rounded-[var(--nora-radius-lg)] border border-[var(--nora-divider)] bg-[var(--nora-panel)]">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-semibold">{row.id}</TableCell>
              <TableCell>{statusBadge(row.status)}</TableCell>
              <TableCell className="text-right tabular-nums text-[var(--nora-text-secondary)]">
                {row.amount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export const dataTableDoc: ComponentDoc = {
  id: "data-table",
  examples: [
    {
      title: "Selectable rows",
      description:
        "Filter, column toggles, row selection and pagination.",
      code: `// Table + Columns dropdown + Checkbox selection
<SelectableTable />`,
      render: () => <SelectableTable />,
    },
    {
      title: "Compact",
      description: "Dense invoice list with soft zebra rows and status badges.",
      code: `<CompactTable />`,
      render: () => <CompactTable />,
    },
  ],
}
