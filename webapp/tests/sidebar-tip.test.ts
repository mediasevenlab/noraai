import { expect, test } from 'bun:test'

import { sidebarTipTitle } from '../src/components/dashboard/sidebar-tip'

test('a sidebar tip keeps the date readable by shortening the title first', () => {
  expect(sidebarTipTitle('Резюмируй информацию из встречи')).toBe('Резюмируй информац…')
  expect(sidebarTipTitle('5Виртекс')).toBe('5Виртекс')
})
