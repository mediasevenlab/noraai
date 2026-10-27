import { useState, type ReactNode } from 'react'

import { ChevronDownIcon } from '@/components/icons'
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, useSidebar } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

export function SidebarSection({
  children,
  forceOpen = false,
  label,
  storageKey,
}: {
  children: ReactNode
  forceOpen?: boolean
  label: string
  storageKey: string
}) {
  const { isMobile, state } = useSidebar()
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem(storageKey) !== '0'
  })
  const iconMode = state === 'collapsed' && !isMobile
  const shown = iconMode || forceOpen || open

  function toggle() {
    const next = !open
    setOpen(next)
    window.localStorage.setItem(storageKey, next ? '1' : '0')
  }

  return (
    <SidebarGroup className="pt-1">
      <SidebarGroupLabel className="px-0">
        <button
          aria-expanded={shown}
          className="inline-flex h-8 max-w-full items-center gap-1 rounded-md px-2.5 text-left"
          onClick={toggle}
          type="button"
        >
          <span className="min-w-0 truncate">{label}</span>
          <ChevronDownIcon className={cn('size-3.5 shrink-0 transition-transform', shown ? '' : '-rotate-90')} />
        </button>
      </SidebarGroupLabel>
      {shown ? <SidebarGroupContent>{children}</SidebarGroupContent> : null}
    </SidebarGroup>
  )
}
