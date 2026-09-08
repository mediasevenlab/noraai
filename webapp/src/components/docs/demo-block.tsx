import * as React from "react"
import { CheckIcon, ChevronDownIcon, CopyIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type DemoBlockProps = {
  title: string
  description?: string
  code: string
  children: React.ReactNode
  className?: string
}

/**
 * Демо-блок в стиле .demo из Nora DS: компактная шапка 13/600 + note 11px,
 * стейдж на фоне канваса (--nora-canvas), подпись View Code снизу.
 */
export function DemoBlock({
  title,
  description,
  code,
  children,
  className,
}: DemoBlockProps) {
  const [open, setOpen] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-card ring-1 ring-border",
        className
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 border-b px-4 py-2.5">
        <span className="text-[13px] font-semibold">{title}</span>
        {description ? (
          <span className="text-[11px] text-muted-foreground">
            {description}
          </span>
        ) : null}
      </div>
      <div
        className="flex flex-wrap items-center justify-center gap-3.5 px-7 py-9 [&>*]:min-w-0"
        style={{ background: "var(--nora-canvas)" }}
      >
        {children}
      </div>
      <div className="border-t">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between px-4 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          aria-expanded={open}
        >
          <span>View Code</span>
          <ChevronDownIcon
            className={cn("size-3.5 transition-transform", open && "rotate-180")}
          />
        </button>
        {open ? (
          <div className="relative border-t bg-muted/30">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-2 right-2 z-10"
              onClick={handleCopy}
              aria-label={copied ? "Copied" : "Copy code"}
            >
              {copied ? (
                <CheckIcon className="size-3.5" />
              ) : (
                <CopyIcon className="size-3.5" />
              )}
            </Button>
            <pre className="overflow-x-auto p-4 pt-10 text-xs leading-relaxed">
              <code className="font-mono text-foreground">{code}</code>
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  )
}
