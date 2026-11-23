import { useRouterState } from '@tanstack/react-router'

import { DashboardLink } from '@/components/dashboard/DashboardLink'
import { useSidebarSearchQuery } from '@/components/dashboard/SidebarSearch'
import { SidebarSection } from '@/components/dashboard/SidebarSection'
import { ScaleIcon } from '@/components/icons'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'

const SECTIONS = [
  { label: 'Госзакупки', to: '/app/procurements', keys: ['госзакупки'] },
  { label: 'B2B-Center', to: '/app/b2b', keys: ['b2b-center', 'b2b'] },
  { label: 'Tender.pro', to: '/app/tender-pro', keys: ['tender.pro', 'tender', 'тендер'] },
] as const

export function PurchasesNavigation({ disabled = false }: { disabled?: boolean }) {
  const query = useSidebarSearchQuery().trim().toLowerCase()
  const sectionHit = query.length > 0 && 'закупки'.includes(query)
  const shown = SECTIONS.filter((item) => !query || sectionHit || item.keys.some((key) => key.includes(query)))
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  if (query && shown.length === 0) return null

  return (
    <nav aria-label="Закупки">
      <SidebarSection forceOpen={query.length > 0} label="Закупки" storageKey="nora-sidebar-purchases">
        <SidebarMenu>
          {shown.map((item) => {
            const active = pathname === item.to
            return (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton
                  disabled={disabled}
                  isActive={active && !disabled}
                  render={<DashboardLink aria-current={active ? 'page' : undefined} to={item.to} />}
                  tooltip={item.label}
                >
                  <ScaleIcon />
                  <span className="truncate group-data-[collapsible=icon]:hidden">{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarSection>
    </nav>
  )
}
