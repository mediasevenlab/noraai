import * as React from 'react'
import {
  CreditCardIcon,
  DollarSignIcon,
  InboxIcon,
  UsersIcon,
} from '@/components/icons'
import { Navigate, useParams } from '@tanstack/react-router'

import { DocsPager } from '@/components/docs/docs-pager'
import { DocsPage } from '@/components/docs/docs-chrome'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { cn } from '@/lib/utils'
import { NORA_BLOCK_RENDERERS } from '../nora-block-registry'
import {
  BLOCKS,
  BLOCKS_BASE_PATH,
  blockPath,
} from '../nav'

function BlockStats() {
  const stats = [
    {
      title: 'Revenue',
      value: '$45,231',
      icon: DollarSignIcon,
      change: '+20.1%',
      up: true,
    },
    {
      title: 'Users',
      value: '+2,350',
      icon: UsersIcon,
      change: '+180%',
      up: true,
    },
    {
      title: 'Sales',
      value: '+12,234',
      icon: CreditCardIcon,
      change: '+19%',
      up: true,
    },
  ]
  return (
    <div className="mx-auto grid w-full max-w-[720px] gap-2 sm:grid-cols-3">
      {stats.map((s) => (
        <div
          key={s.title}
          className="flex flex-col gap-2 rounded-[var(--nora-radius-lg,10px)] bg-[var(--dash-card-bg,var(--nora-panel))] p-3.5 font-[family-name:var(--nora-font)] shadow-[inset_0_0_0_1px_var(--dash-card-ring,var(--nora-border))] transition-colors hover:bg-[var(--nora-row-hover)]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-[var(--nora-text-tertiary)]">
              {s.title}
            </span>
            <s.icon className="size-3.5 shrink-0 text-[var(--nora-text-tertiary)]" />
          </div>
          <div className="font-heading text-[22px] font-semibold tracking-[-0.02em] text-[var(--nora-text)]">
            {s.value}
          </div>
          <p className="text-[11px] text-[var(--nora-text-tertiary)]">
            <span
              className={cn(
                'font-semibold',
                s.up
                  ? 'text-[var(--nora-success)]'
                  : 'text-[var(--nora-error)]',
              )}
            >
              {s.change}
            </span>{' '}
            from last month
          </p>
        </div>
      ))}
    </div>
  )
}

function BlockSettings() {
  const [marketing, setMarketing] = React.useState(true)

  return (
    <Card className="mx-auto w-full max-w-[420px] border border-[var(--nora-border)] bg-[var(--nora-panel)] font-[family-name:var(--nora-font)] text-[var(--nora-text)] shadow-[var(--nora-shadow-modal)] ring-0">
      <CardHeader>
        <CardTitle className="text-sm font-semibold tracking-tight text-[var(--nora-text)]">
          Profile
        </CardTitle>
        <CardDescription className="text-[var(--nora-text-secondary)]">
          Update your account settings
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-1.5">
          <Label>Display name</Label>
          <Input
            defaultValue="shadcn"
            className="h-[var(--nora-row-h,30px)]"
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Email</Label>
          <Input
            defaultValue="m@example.com"
            className="h-[var(--nora-row-h,30px)]"
          />
        </div>
        <Separator className="bg-[var(--nora-divider)]" />
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-[var(--nora-text)]">
              Marketing emails
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--nora-text-tertiary)]">
              Receive emails about new products
            </div>
          </div>
          <Switch
            checked={marketing}
            onCheckedChange={setMarketing}
            size="sm"
            aria-label="Marketing emails"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button className="h-[var(--nora-row-h,30px)] font-semibold">
          Save changes
        </Button>
      </CardFooter>
    </Card>
  )
}

function BlockDataTable() {
  const rows = [
    { name: 'Alice', email: 'alice@acme.com', role: 'Admin' },
    { name: 'Bob', email: 'bob@acme.com', role: 'Editor' },
    { name: 'Carol', email: 'carol@acme.com', role: 'Viewer' },
  ] as const

  const roleClass: Record<(typeof rows)[number]['role'], string> = {
    Admin:
      'rounded-md border-0 bg-[var(--nora-tint-dimmed)] text-[var(--nora-tint)]',
    Editor:
      'rounded-md border-0 bg-[var(--nora-input-bg)] text-[var(--nora-text-secondary)]',
    Viewer:
      'rounded-md border-0 bg-[var(--nora-input-bg)] text-[var(--nora-text-tertiary)]',
  }

  return (
    <Card className="mx-auto w-full max-w-[560px] border border-[var(--nora-border)] bg-[var(--nora-panel)] font-[family-name:var(--nora-font)] text-[var(--nora-text)] shadow-[var(--nora-shadow-modal)] ring-0">
      <CardHeader>
        <CardTitle className="text-sm font-semibold tracking-tight text-[var(--nora-text)]">
          Team
        </CardTitle>
        <CardDescription className="text-[var(--nora-text-secondary)]">
          Manage your team members
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-1">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-4">Name</TableHead>
              <TableHead className="px-4">Email</TableHead>
              <TableHead className="px-4 text-right">Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.email}>
                <TableCell className="px-4 font-medium text-[var(--nora-text)]">
                  {r.name}
                </TableCell>
                <TableCell className="px-4 text-[var(--nora-text-secondary)]">
                  {r.email}
                </TableCell>
                <TableCell className="px-4 text-right">
                  <Badge
                    variant="secondary"
                    className={cn('h-5 px-1.5 text-[10px] font-semibold', roleClass[r.role])}
                  >
                    {r.role}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function BlockEmpty() {
  return (
    <Empty className="mx-auto w-[420px]">
      <EmptyMedia>
        <InboxIcon />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>No messages</EmptyTitle>
        <EmptyDescription>
          You don&apos;t have any messages yet. When you do, they&apos;ll show up
          here.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button className="h-[var(--nora-row-h,30px)] px-3 font-semibold">
          Compose
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function BlockSidebarLayout() {
  const items = ['Dashboard', 'Users', 'Settings'] as const
  const [active, setActive] = React.useState<(typeof items)[number]>('Dashboard')

  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--nora-border)] bg-[var(--nora-canvas)] font-[family-name:var(--nora-font)]">
      <div className="flex h-56 gap-2 p-2">
        <aside className="flex w-[180px] shrink-0 flex-col gap-1.5 rounded-[10px] bg-[var(--nora-panel)] p-2 text-[var(--nora-text)] shadow-[0_0_0_1px_var(--nora-border)]">
          <div className="px-2 pt-0.5 text-[11px] font-medium text-[var(--nora-text-tertiary)]">
            Platform
          </div>
          <nav className="flex flex-col gap-px">
            {items.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setActive(item)}
                className={cn(
                  'flex h-[var(--nora-row-h,30px)] items-center rounded-[8px] px-2 text-left text-xs font-medium transition-colors outline-none focus-visible:shadow-[var(--nora-shadow-focus)]',
                  active === item
                    ? 'bg-[var(--nora-row-active-bg)] text-[var(--nora-text)]'
                    : 'text-[var(--nora-text-secondary)] hover:bg-[var(--nora-row-hover)] hover:text-[var(--nora-text)]',
                )}
              >
                {item}
              </button>
            ))}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-[var(--nora-row-h,30px)] items-center px-2 text-[11px] text-[var(--nora-text-tertiary)]">
            Breadcrumb / {active}
          </div>
          <div className="flex flex-1 items-center justify-center text-xs text-[var(--nora-text-tertiary)]">
            Sidebar + Inset content
          </div>
        </div>
      </div>
    </div>
  )
}

const BLOCK_RENDERERS: Record<string, () => React.ReactNode> = {
  stats: BlockStats,
  'sidebar-layout': BlockSidebarLayout,
  settings: BlockSettings,
  'data-table': BlockDataTable,
  'empty-state': BlockEmpty,
}

export function BlockDetailPage() {
  const { blockId: id } = useParams({
    from: '/adminWorkspace/admin/blocks/$blockId',
  })
  const meta = BLOCKS.find((block) => block.id === id)
  if (!meta) return <Navigate replace to="/admin/blocks" />

  const index = BLOCKS.findIndex((block) => block.id === meta.id)
  const prev = BLOCKS[index - 1]
  const next = BLOCKS[index + 1]
  const NoraRender = NORA_BLOCK_RENDERERS[meta.id]
  const Render = BLOCK_RENDERERS[meta.id]

  return (
    <DocsPage title={meta.name} description={meta.description}>
      <div
        className={cn(
          'rounded-xl p-[30px] ring-1 ring-border',
          meta.id === 'nora-context-menu'
            || meta.id === 'nora-main-menu'
            || meta.id === 'nora-zoom-menu'
            || meta.id === 'nora-toolbar'
            ? 'overflow-visible'
            : 'overflow-hidden',
        )}
        style={{ background: 'var(--nora-canvas)' }}
      >
        {NoraRender ? <NoraRender /> : Render ? <Render /> : null}
      </div>
      <DocsPager
        prev={
          prev
            ? { name: prev.name, to: blockPath(prev.id) }
            : { name: 'Все блоки', to: BLOCKS_BASE_PATH }
        }
        next={next ? { name: next.name, to: blockPath(next.id) } : undefined}
      />
    </DocsPage>
  )
}
