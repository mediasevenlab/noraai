import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import {
  DEFAULT_SIDEBAR_PROMO_CARDS,
  parseSidebarPromoCards,
  SIDEBAR_PROMO_CARDS_STORAGE_KEY,
} from '../src/components/sidebar-promo-store'

describe('sidebar promo cards toggle', () => {
  test('hides the mentor and subscription cards until the header switch is on', () => {
    expect(DEFAULT_SIDEBAR_PROMO_CARDS).toBe(false)
    expect(parseSidebarPromoCards(null)).toBe(false)
    expect(parseSidebarPromoCards('true')).toBe(true)
    expect(parseSidebarPromoCards('false')).toBe(false)
    expect(SIDEBAR_PROMO_CARDS_STORAGE_KEY).toContain('sidebar-promo')

    const header = readFileSync(
      new URL('../src/components/dashboard/SiteHeader.tsx', import.meta.url),
      'utf8',
    )
    const shell = readFileSync(
      new URL('../src/components/WorkspaceShell.tsx', import.meta.url),
      'utf8',
    )
    expect(header).toContain('SidebarPromoToggle')
    expect(shell).toContain('useSidebarPromoCards')
    expect(shell).toContain('showSidebarPromoCards')
  })
})
