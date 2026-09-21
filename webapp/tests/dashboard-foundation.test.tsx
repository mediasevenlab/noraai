import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'

import { DataTableFrame } from '../src/components/dashboard/DataTableFrame'
import { SectionCards } from '../src/components/dashboard/SectionCards'
import { SiteHeader } from '../src/components/dashboard/SiteHeader'
import { SidebarProvider } from '../src/components/ui/sidebar'

test('dashboard route links share exact matching and mobile-sheet closure', () => {
  const dashboardLink = readFileSync(
    new URL('../src/components/dashboard/DashboardLink.tsx', import.meta.url),
    'utf8',
  )
  const consumers = ['AccountMenu.tsx', 'AppSidebar.tsx', 'NavMain.tsx', 'SidebarRelationCard.tsx']
    .map((file) =>
      readFileSync(
        new URL(`../src/components/dashboard/${file}`, import.meta.url),
        'utf8',
      )
    )

  expect(dashboardLink).toContain('activeOptions={{ exact: true }}')
  expect(dashboardLink).toContain('setOpenMobile(false)')
  for (const consumer of consumers) {
    expect(consumer).toContain('<DashboardLink')
    expect(consumer).not.toContain("from '@tanstack/react-router'")
  }
})

test('metric values keep visual emphasis without becoming document headings', () => {
  const markup = renderToStaticMarkup(
    <SectionCards
      items={[
        {
          label: 'Total users',
          value: 1_234,
          description: 'All registered accounts',
        },
      ]}
    />,
  )

  expect(markup).toContain('Total users')
  expect(markup).toContain('>1234</div>')
  expect(markup).not.toContain('<h3')
})

test('dashboard chrome leaves the document heading to its page content', () => {
  const headerMarkup = renderToStaticMarkup(
    <SidebarProvider>
      <SiteHeader
        crumbs={['Компоненты', 'Users']}
        onLogout={async () => undefined}
        user={{
          id: 'user-id',
          publicId: 1,
          email: 'admin@example.com',
          displayName: 'Администратор',
          nickname: null,
          telegramUsername: null,
    telegramPhone: null,
          role: 'admin',
          createdAt: '2026-07-31T00:00:00.000Z',
        }}
      />
    </SidebarProvider>,
  )
  const tableMarkup = renderToStaticMarkup(
    <DataTableFrame
      nextDisabled
      onNext={() => undefined}
      onPrevious={() => undefined}
      previousDisabled
      summary="Page 1 of 1"
      title="User directory"
    >
      <div />
    </DataTableFrame>,
  )

  expect(headerMarkup).toContain('aria-label="Breadcrumb"')
  expect(headerMarkup).toContain('flex min-w-0 items-center gap-1.5 font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text-secondary)]')
  expect(headerMarkup).toContain('>Компоненты</span>')
  expect(headerMarkup).toContain('>Users</span>')
  expect(headerMarkup).toContain('hidden h-14 shrink-0 items-center gap-2 border-b bg-background px-4 md:flex md:px-6')
  expect(headerMarkup).not.toContain('<h1')
  expect(headerMarkup).toContain('h-14')
  expect(headerMarkup).toContain('border-b')
  expect(headerMarkup).toContain('bg-background')
  expect(tableMarkup).toContain('<h2')
  expect(tableMarkup).toContain('>User directory</h2>')
})

test('the site header is hidden on mobile', () => {
  const header = readFileSync(
    new URL('../src/components/dashboard/SiteHeader.tsx', import.meta.url),
    'utf8',
  )
  const mobileNav = readFileSync(
    new URL('../src/components/dashboard/MobileNavFab.tsx', import.meta.url),
    'utf8',
  )
  const shell = readFileSync(
    new URL('../src/components/WorkspaceShell.tsx', import.meta.url),
    'utf8',
  )
  const noraUi = readFileSync(
    new URL('../src/styles/nora-ui.css', import.meta.url),
    'utf8',
  )

  expect(header).toContain('hidden h-14 shrink-0 items-center gap-2 border-b bg-background px-4 md:flex md:px-6')
  expect(header).not.toContain('<BrandMark />')
  expect(header).toContain('Переключить на светлую тему')
  expect(header).toContain('<ModalOverlayMenu />')
  expect(header).toContain('<PlannedCoverWashMenu />')
  expect(header).toContain('<PlannedCoverBlurMenu />')
  expect(header).toContain('Меню аккаунта:')
  expect(mobileNav).toContain('Переключить на светлую тему')
  expect(mobileNav).toContain('useTheme')
  expect(mobileNav).toContain('ios-float-pill-dock')
  expect(mobileNav).not.toContain('ios-glass-fab')
  expect(mobileNav).toContain('aria-label="Открыть меню"')
  expect(mobileNav).toContain('className="size-4 text-[var(--nora-text-secondary)]"')
  expect(mobileNav).toContain('bg-[var(--nora-modal)]')
  expect(mobileNav).not.toContain('ios-glass-sheet')
  expect(mobileNav).not.toContain('ios-glass-chip')
  expect(mobileNav).toContain('ios-glass-tile')
  expect(mobileNav).toContain('nora-badge-red-bg')
  expect(mobileNav).toContain('danger')
  expect(mobileNav).toContain('<ul className="flex flex-col gap-1.5">')
  expect(mobileNav).toContain('flex h-14 items-center gap-3 rounded-[14px]')
  expect(mobileNav).not.toContain('ios-glass-tile divide-y')
  expect(mobileNav).not.toContain('rounded-[22px] px-3')
  expect(mobileNav).toContain('text-[20px] font-medium leading-6')
  expect(mobileNav).toContain('truncate text-[13px] font-normal leading-4')
  expect(mobileNav).toContain('ios-glass-glyph')
  expect(mobileNav).toContain('ios-glass-glyph text-[var(--nora-text-secondary)]')
  expect(mobileNav).toContain('item.active')
  expect(mobileNav).toContain('bg-[var(--nora-tint)] text-[var(--nora-on-accent)]')
  expect(mobileNav).toContain("aria-current={active ? 'page' : undefined}")
  expect(mobileNav).toContain('strokeWidth={1.5}')
  expect(shell).not.toContain("label: 'Добавить'")
  expect(shell).not.toContain('requestAddMeal')
  expect(shell).toContain('active: catalogOpen')
  expect(mobileNav).not.toContain('text-[28px]')
  expect(mobileNav).not.toContain('truncate text-[13px] font-semibold')
  expect(mobileNav).toContain('data-[side=bottom]:inset-x-0')
  expect(mobileNav).toContain('data-[side=bottom]:bottom-0')
  expect(mobileNav).toContain('data-[side=bottom]:rounded-t-[var(--modal-sheet-radius)]')
  expect(mobileNav).not.toContain('data-[side=bottom]:rounded-[34px]')
  expect(mobileNav).not.toContain('data-[side=bottom]:inset-x-4')
  expect(mobileNav).not.toContain('h-[5px] w-9')
  expect(mobileNav).not.toContain('shadow-[0_8px_24px_rgb(0_0_0_/_0.22)]')
  expect(mobileNav).not.toContain('rounded-t-[28px]')
  expect(mobileNav).not.toContain('bg-[var(--nora-inset)]')
  expect(noraUi).toContain('[data-slot="sheet-content"].ios-glass-sheet')
  expect(noraUi).toContain('.ios-glass-chip')
  expect(noraUi).toContain('.ios-glass-tile')
})

test('the app globally suppresses generated primitive motion when reduced motion is requested', () => {
  const stylesheet = readFileSync(
    new URL('../src/index.css', import.meta.url),
    'utf8',
  )

  expect(stylesheet).toContain('@media (prefers-reduced-motion: reduce)')
  expect(stylesheet).toContain('animation-duration: 0.01ms !important')
  expect(stylesheet).toContain('transition-duration: 0.01ms !important')
})

test('mobile hides the page scrollbar so side gutters stay even', () => {
  const stylesheet = readFileSync(
    new URL('../src/index.css', import.meta.url),
    'utf8',
  )
  const mobileScroll = stylesheet.slice(
    stylesheet.indexOf('/* Mobile: hide the gutter scrollbar'),
  )

  expect(mobileScroll).toContain('@media (max-width: 767px)')
  expect(mobileScroll).toContain('scrollbar-width: none')
  expect(mobileScroll).toContain('width: 0')

  const shell = readFileSync(
    new URL('../src/components/WorkspaceShell.tsx', import.meta.url),
    'utf8',
  )
  expect(shell).toContain('max-md:[scrollbar-width:none]')
})

test('mentor and user relation status lives in the sidebar footer, not the desktop header', () => {
  const shell = readFileSync(
    new URL('../src/components/WorkspaceShell.tsx', import.meta.url),
    'utf8',
  )
  const header = readFileSync(
    new URL('../src/components/dashboard/SiteHeader.tsx', import.meta.url),
    'utf8',
  )
  const card = readFileSync(
    new URL('../src/components/dashboard/SidebarRelationCard.tsx', import.meta.url),
    'utf8',
  )

  expect(shell).toContain('footerExtra=')
  expect(shell).toContain('showSidebarPromoCards')
  expect(shell).toContain('<UserMentorBanner')
  expect(shell).toContain('<MentorMenteesBanner')
  expect(shell).not.toContain('SidebarSubscriptionCard')
  expect(header).toContain('SidebarPromoToggle')
  expect(shell).not.toContain('headerExtra')
  expect(header).not.toContain('headerExtra')
  expect(card).toContain('<DashboardLink')
  expect(card).toContain('actionLabel')
  expect(card).toContain('badge')
  expect(card).toContain('description')
  expect(card).toContain('noraProductTitleClass')
  expect(card).toContain('noraProductMetaClass')
  expect(card).toContain('text-[13px] font-medium leading-5')
  expect(card).toContain('text-[11px] font-medium leading-none')
  expect(card).toContain('border-t border-[var(--nora-divider)]')
  expect(card).toContain('bg-[var(--nora-input-bg)] py-1.5 pr-1.5 pl-3.5 text-[var(--nora-text)]')
  expect(card).toContain('group-hover/menu-button:bg-[var(--nora-row-hover)]')
  expect(card).toContain('rounded-full bg-[var(--nora-panel)]')
  expect(card).not.toContain('bg-[var(--nora-text)] py-1.5')
  expect(card).not.toContain('color-mix(in_srgb,var(--nora-text)_30%')
  expect(card).not.toContain('from \'@/components/typography\'')
  expect(card).not.toContain('ios-glass-glare-soft')
  expect(card).toContain('hides direct `span`')
  expect(card).toContain('keeps the first div as the icon tile')
  expect(card).toMatch(/<div className="flex items-center gap-/)

  const banner = readFileSync(
    new URL('../src/features/users/UserMentorBanner.tsx', import.meta.url),
    'utf8',
  )
  expect(banner).toContain('Подключить')
  expect(banner).toContain('Подключить наставника')
  expect(banner).toContain('Подключите наставника')
  expect(banner).not.toContain('if (!mentor) return null')

  const subscription = readFileSync(
    new URL('../src/features/payments/SidebarSubscriptionCard.tsx', import.meta.url),
    'utf8',
  )
  expect(subscription).toContain('<DashboardLink')
  expect(subscription).toContain('Продлить')
  expect(subscription).toContain('DEMO_USER_NEXT_CHARGE.label')
  expect(subscription).toContain('role="progressbar"')
  expect(subscription).toContain('noraProductTitleClass')
  expect(subscription).toContain('noraProductMetaClass')
  expect(subscription).toContain('text-[13px] font-medium leading-5')
  expect(subscription).toContain('text-[12px] font-light leading-5')
  expect(subscription).toContain('items-baseline')
  expect(subscription).toContain('border-t border-[var(--nora-divider)]')
  expect(subscription).toContain('bg-[var(--nora-input-bg)] py-1.5 pr-1.5 pl-3.5 text-[var(--nora-text)]')
  expect(subscription).toContain('group-hover/menu-button:bg-[var(--nora-row-hover)]')
  expect(subscription).toContain('rounded-full bg-[var(--nora-panel)]')
  expect(subscription).not.toContain('bg-[var(--nora-text)] py-1.5')
  expect(subscription).not.toContain('color-mix(in_srgb,var(--nora-text)_30%')
  expect(subscription).not.toContain('variant="h4"')
  expect(subscription).not.toContain('from \'@/components/typography\'')
  expect(subscription).toContain('hides direct `span`')

  const sidebar = readFileSync(
    new URL('../src/components/ui/sidebar.tsx', import.meta.url),
    'utf8',
  )
  const inner = sidebar.slice(
    sidebar.indexOf('data-slot="sidebar-inner"'),
    sidebar.indexOf('function SidebarTrigger'),
  )
  expect(inner).toContain('contain-inline-size')
  expect(inner).not.toContain('overflow-x-hidden')
  expect(inner).not.toContain('overflow-x-clip')
})

test('sidebar user card uses the same type scale as the brand header', () => {
  const header = readFileSync(
    new URL('../src/components/dashboard/AppSidebar.tsx', import.meta.url),
    'utf8',
  )
  const user = readFileSync(
    new URL('../src/components/dashboard/NavUser.tsx', import.meta.url),
    'utf8',
  )
  const typeScale =
    'grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden'

  expect(header).toContain(typeScale)
  expect(user).toContain(typeScale)
  expect(user).toContain('truncate font-medium')
  expect(user).toContain('truncate text-xs text-muted-foreground')
  expect(user).toContain('rounded-lg')
  expect(user).toContain('after:rounded-lg')
  expect(user).not.toContain('rounded-full')
  expect(user).not.toContain('ios-glass-glare-soft')
  expect(user).not.toContain('rounded-[var(--nora-radius-xl,14px)]')
  expect(user).not.toContain('truncate text-[12px] font-semibold text-sidebar-foreground')
  expect(user).not.toContain('truncate text-[11px] text-[var(--nora-text-tertiary)]')
})

test('workspace destinations live in the account menu, not a sidebar footer list', () => {
  const sidebar = readFileSync(
    new URL('../src/components/dashboard/AppSidebar.tsx', import.meta.url),
    'utf8',
  )
  const accountMenu = readFileSync(
    new URL('../src/components/dashboard/AccountMenu.tsx', import.meta.url),
    'utf8',
  )
  const navUser = readFileSync(
    new URL('../src/components/dashboard/NavUser.tsx', import.meta.url),
    'utf8',
  )
  const header = readFileSync(
    new URL('../src/components/dashboard/SiteHeader.tsx', import.meta.url),
    'utf8',
  )
  const shell = readFileSync(
    new URL('../src/components/WorkspaceShell.tsx', import.meta.url),
    'utf8',
  )
  const chrome = readFileSync(
    new URL('../src/index.css', import.meta.url),
    'utf8',
  )

  expect(sidebar).not.toContain('Разделы рабочей области')
  expect(sidebar).toContain('workspaceItems={navigationLocked ? [] : secondaryItems}')
  expect(sidebar).not.toContain('accountPath')
  expect(sidebar).not.toContain('settingsPath')
  expect(navUser).toContain('workspaceItems={workspaceItems}')
  expect(header).toContain('workspaceItems={workspaceItems}')
  expect(shell).toContain('workspaceItems={navigationLocked ? [] : secondaryItems}')
  expect(accountMenu).toContain('workspaceItems')
  expect(accountMenu).toContain('{item.label}')
  expect(accountMenu).not.toContain('Аккаунт')
  expect(accountMenu).not.toContain('accountPath')
  expect(accountMenu).not.toContain('settingsPath')
  expect(accountMenu).toContain('text-[13px] font-normal leading-5')
  expect(accountMenu).toContain('rounded-[var(--nora-radius-menu-item,12px)]')
  expect(accountMenu).toContain('rounded-lg after:rounded-lg')
  expect(accountMenu).toContain('noraProductMetaClass')
  expect(accountMenu).toContain('item.disabled')
  expect(navUser).toContain('account-workspace-menu')
  expect(header).toContain('account-workspace-menu')
  expect(chrome).toContain('[data-slot="dropdown-menu-content"].account-workspace-menu')
  expect(chrome).toContain('--nora-radius-menu, 16px')
  expect(chrome).toContain('--nora-radius-menu-item, 12px')
})
