import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'

import { dismissAppBootSplash } from '../src/platform/app-boot-splash'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8')

describe('home-screen boot splash', () => {
  test('paints a branded shell before JavaScript mounts', () => {
    expect(html).toContain('id="app-boot"')
    expect(html).toContain('/favicon.svg')
    expect(html).toContain('rel="manifest"')
    expect(html).toContain('/site.webmanifest')
    expect(html).toContain('apple-mobile-web-app-capable')
    expect(html).toContain('name="theme-color"')
    expect(existsSync(new URL('../public/apple-touch-icon.png', import.meta.url))).toBe(true)
    expect(existsSync(new URL('../public/icon-192.png', import.meta.url))).toBe(true)
    expect(existsSync(new URL('../public/icon-512.png', import.meta.url))).toBe(true)
    expect(existsSync(new URL('../public/site.webmanifest', import.meta.url))).toBe(true)
  })

  test('hides the splash only after the session is resolved', () => {
    const calls: string[] = []
    dismissAppBootSplash({
      getElementById: (id) => {
        expect(id).toBe('app-boot')
        return {
          setAttribute(name, value) {
            calls.push(`${name}=${value}`)
          },
        }
      },
    })
    expect(calls).toEqual(['hidden='])
    expect(main).toContain('dismissAppBootSplash')
    expect(main).toContain('flushSync')
    expect(
      readFileSync(new URL('../src/features/auth/components/AuthPageShell.tsx', import.meta.url), 'utf8'),
    ).toContain('useDismissAppBootSplash')
    expect(
      readFileSync(new URL('../src/components/WorkspaceShell.tsx', import.meta.url), 'utf8'),
    ).toContain('useDismissAppBootSplash')
  })
})
