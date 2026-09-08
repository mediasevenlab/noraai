import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

import { cn } from '@/lib/utils'

export function DocsPage({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[960px] flex-1 p-6 md:px-8 md:py-7',
        className,
      )}
    >
      <div className="mb-7">
        <h1 className="font-heading text-[26px] leading-[1.2] font-bold tracking-[-0.02em]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-[640px] text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-8">{children}</div>
    </div>
  )
}

export function DocsSection({
  title,
  description,
  children,
}: {
  title: string
  description?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-5">
      <div>
        <h2 className="font-heading text-lg leading-[1.3] font-semibold tracking-[-0.01em]">
          {title}
        </h2>
        {description ? (
          <div className="mt-1 max-w-[680px] text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  )
}

type DocsLinkProps = {
  to: string
  className?: string
  children?: ReactNode
} & Omit<ComponentPropsWithoutRef<'a'>, 'href'>

export function DocsLink({ to, className, children, ...rest }: DocsLinkProps) {
  if (to === '/admin/components') {
    return (
      <Link className={className} to="/admin/components" {...rest}>
        {children}
      </Link>
    )
  }

  const componentsMatch = to.match(/^\/admin\/components\/([^/?#]+)$/)
  if (componentsMatch) {
    return (
      <Link
        className={className}
        params={{ componentId: componentsMatch[1] }}
        to="/admin/components/$componentId"
        {...rest}
      >
        {children}
      </Link>
    )
  }

  if (to === '/admin/blocks') {
    return (
      <Link className={className} to="/admin/blocks" {...rest}>
        {children}
      </Link>
    )
  }

  const blocksMatch = to.match(/^\/admin\/blocks\/([^/?#]+)$/)
  if (blocksMatch) {
    return (
      <Link
        className={className}
        params={{ blockId: blocksMatch[1] }}
        to="/admin/blocks/$blockId"
        {...rest}
      >
        {children}
      </Link>
    )
  }

  if (to === '/admin/stack') {
    return (
      <Link className={className} to="/admin/stack" {...rest}>
        {children}
      </Link>
    )
  }

  if (to === '/admin/steps') {
    return (
      <Link className={className} to="/admin/steps" {...rest}>
        {children}
      </Link>
    )
  }

  const dsMatch = to.match(/^\/admin\/ds\/([^/?#]+)$/)
  if (dsMatch) {
    return (
      <Link
        className={className}
        params={{ pageId: dsMatch[1] }}
        to="/admin/ds/$pageId"
        {...rest}
      >
        {children}
      </Link>
    )
  }

  return (
    <a className={className} href={to} {...rest}>
      {children}
    </a>
  )
}

export function DocsCardLink({
  to,
  title,
  description,
  badge,
}: {
  to: string
  title: string
  description: string
  badge?: 'New' | 'Nora'
}) {
  return (
    <DocsLink
      to={to}
      className="group flex flex-col gap-1 rounded-[10px] bg-card p-4 text-card-foreground ring-1 ring-border transition-shadow hover:ring-foreground/20"
    >
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-semibold">{title}</span>
        {badge === 'Nora' ? (
          <span className="text-[9px] font-semibold text-primary" title="Nora">
            F
          </span>
        ) : null}
        {badge === 'New' ? (
          <span className="size-1.5 rounded-full bg-primary" title="New" />
        ) : null}
      </div>
      <span className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {description}
      </span>
    </DocsLink>
  )
}
