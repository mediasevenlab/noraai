import { readFileSync } from 'node:fs'

import { expect, test } from 'bun:test'

const files = [
  ['design', '../src/features/design-system/DesignSystemNavigation.tsx', 'Дизайн'],
  ['components', '../src/features/components/ComponentsNavigation.tsx', 'Компоненты'],
  ['blocks', '../src/features/blocks/BlocksNavigation.tsx', 'Блоки'],
] as const

for (const [id, relativePath, label] of files) {
  test(`admin ${id} nav matches project group chrome without a tree rail`, () => {
    const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')
    const trigger = source.slice(
      source.indexOf('<SidebarGroupLabel'),
      source.indexOf('<CollapsibleContent>'),
    )

    expect(source).toContain('SidebarGroupLabel')
    expect(trigger).toContain(label)
    expect(trigger.indexOf(label)).toBeLessThan(trigger.indexOf('ChevronRightIcon'))
    expect(source).not.toContain('border-l border-sidebar-foreground/15')
    expect(source).not.toContain('font-semibold')
  })
}
