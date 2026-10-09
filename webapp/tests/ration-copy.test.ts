import { expect, test } from 'bun:test'

import { orderRationCopiesAfterSource, rationCanCopyForEdit, rationCopyTitle } from '../src/features/plans/ration-copy'

test('ration copies are numbered from the original title', () => {
  expect(rationCanCopyForEdit('catalog_week')).toBe(false)
  expect(rationCanCopyForEdit('plan_9573f9f3-206e-4eb4-9975-3f7d9ad8a9aa')).toBe(true)
  expect(rationCopyTitle('Офис', [])).toBe('Офис копия 1')
  expect(rationCopyTitle('Офис', ['Офис копия 1'])).toBe('Офис копия 2')
  expect(rationCopyTitle('Офис копия 1', ['Офис копия 1', 'Офис копия 2'])).toBe('Офис копия 3')
  expect(rationCopyTitle('Офис', ['Другой копия 4', 'Офис копия 4'])).toBe('Офис копия 5')
})

test('a copy sits to the right of the ration it came from', () => {
  const ordered = orderRationCopiesAfterSource([
    { title: 'Офис копия 2' },
    { title: 'Офис копия 1' },
    { title: 'Другой' },
    { title: 'Офис' },
  ]).map((plan) => plan.title)

  expect(ordered).toEqual(['Другой', 'Офис', 'Офис копия 1', 'Офис копия 2'])
})

test('a long ration title still fits the copy suffix', () => {
  const title = rationCopyTitle('Я'.repeat(130), [], 120)
  expect(title.endsWith(' копия 1')).toBe(true)
  expect(title.length).toBeLessThanOrEqual(120)
})
