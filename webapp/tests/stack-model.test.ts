import { expect, test } from 'bun:test'

import { STACK_ITEMS, STACK_META } from '../src/features/stack/model'

test('stack catalog covers the monorepo surfaces with concrete product roles', () => {
  expect(STACK_META.title).toBe('Стек')
  expect(STACK_ITEMS.length).toBeGreaterThanOrEqual(8)

  const titles = STACK_ITEMS.map((item) => item.title).join(' ')
  expect(titles).toContain('React')
  expect(titles).toContain('Hono')
  expect(titles).toContain('Prisma')
  expect(titles).toContain('Astro')
  expect(titles).toContain('Bun')

  for (const item of STACK_ITEMS) {
    expect(item.category.length).toBeGreaterThan(0)
    expect(item.title.length).toBeGreaterThan(0)
    expect(item.badge.length).toBeGreaterThan(0)
    expect(item.description.length).toBeGreaterThan(20)
  }
})
