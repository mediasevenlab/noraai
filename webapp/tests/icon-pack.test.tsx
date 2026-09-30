import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import type { UserDto } from '@web-app-demo/contracts'

import { SiteHeader } from '../src/components/dashboard/SiteHeader'
import { SidebarProvider } from '../src/components/ui/sidebar'
import {
  DEFAULT_ICON_PACK,
  ICON_PACKS,
  parseIconPackId,
} from '../src/components/icon-pack'
import { PACK_GLYPHS } from '../src/components/icons/pack-glyphs'

const headerSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/components/dashboard/SiteHeader.tsx'),
  'utf8',
)
const mainSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/main.tsx'),
  'utf8',
)
const packIconSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/components/icons/pack-icon.tsx'),
  'utf8',
)
const plusIconSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/components/icons/animated/plus.tsx'),
  'utf8',
)

function headerFor(email: string, role: UserDto['role']) {
  const user: UserDto = {
    id: 'user-id',
    publicId: 1,
    email,
    displayName: 'Проверка',
    nickname: null,
    telegramUsername: null,
    telegramPhone: null,
    role,
    questionnaireCompleted: true,
    createdAt: '2026-07-31T00:00:00.000Z',
  }
  return renderToStaticMarkup(
    <SidebarProvider>
      <SiteHeader crumbs={['Профиль']} onLogout={async () => undefined} user={user} />
    </SidebarProvider>,
  )
}

describe('icon pack picker', () => {
  test('starts with the current pack as the only choice', () => {
    expect(ICON_PACKS.map((item) => item.label)).toEqual([
      'Lucide',
      'Lucide Animated',
      'Hugeicons',
      'Keyline',
      'Devigner',
      'Solar',
      'Akar',
      'Ant Design',
      'Circum',
      'Clarity',
      'Codicons',
    ])
    expect(DEFAULT_ICON_PACK).toBe('hugeicons')
    expect(parseIconPackId('lucide-animated')).toBe('lucide-animated')
    expect(parseIconPackId('current')).toBe(DEFAULT_ICON_PACK)
    expect(parseIconPackId('future-pack')).toBe(DEFAULT_ICON_PACK)
    expect(parseIconPackId(null)).toBe(DEFAULT_ICON_PACK)
    expect(Object.keys(PACK_GLYPHS.CameraIcon ?? {})).toEqual([
      'hugeicons',
      'devigner',
      'keyline',
      'solar',
      'akar',
      'ant-design',
      'circum',
      'clarity',
      'codicon',
    ])
    expect(PACK_GLYPHS.UtensilsIcon?.hugeicons).toBeTruthy()
    expect(PACK_GLYPHS.UtensilsIcon?.akar).toBeTruthy()
  })

  test('desktop header offers the pack only to the three default accounts', () => {
    const appearance = headerSource.slice(headerSource.indexOf('showAppearanceMenus ?'))
    expect(appearance.startsWith('showAppearanceMenus ?')).toBe(true)
    expect(appearance).toContain('<IconPackMenu />')
    expect(headerSource.indexOf('<IconPackMenu />')).toBeGreaterThan(
      headerSource.indexOf('showAppearanceMenus ?'),
    )
    expect(mainSource).toContain('<IconPackSync />')

    for (const email of ['user@nora.com', 'mentor@nora.com', 'admin@nora.com'] as const) {
      const role = email.startsWith('admin') ? 'admin' : email.startsWith('mentor') ? 'mentor' : 'user'
      expect(headerFor(email, role)).toContain('aria-label="Пак иконок"')
    }
    expect(headerFor('admin@example.com', 'admin')).not.toContain('Пак иконок')
    expect(headerFor('mentor@example.com', 'mentor')).not.toContain('Пак иконок')
    expect(headerFor('user@example.com', 'user')).not.toContain('Пак иконок')
  })

  test('animated glyphs keep the caller size, and missing glyphs still join the pack', () => {
    expect(plusIconSource).toContain('size = 24, strokeWidth = 2')
    expect(plusIconSource).toContain('className={className}')
    expect(plusIconSource).not.toContain('<div')
    expect(packIconSource).toContain('nora-pack-fallback')
    expect(packIconSource).toContain("pack === 'hugeicons'")
    expect(packIconSource).toContain("pack !== 'lucide-animated'")
  })
})
