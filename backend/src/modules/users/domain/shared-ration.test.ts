import { expect, test } from 'bun:test'

import { visibleSharedFeedRations } from './shared-ration'

test('the ration feed hides catalog copies and repeated cards', () => {
  const items = visibleSharedFeedRations([
    {
      sourcePlanId: 'catalog_office',
      title: 'Офис',
      coverImage: '/catalog/office.jpg',
      kcal: 1800,
    },
    {
      sourcePlanId: 'plan_a',
      title: 'Ровная неделя',
      coverImage: '/covers/week.jpg',
      kcal: 2100,
    },
    {
      sourcePlanId: 'plan_b',
      title: 'Ровная неделя',
      coverImage: '/covers/week.jpg',
      kcal: 2100,
    },
    {
      sourcePlanId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      title: 'Рацион наставника',
      coverImage: '/covers/mentor.jpg',
      kcal: 1900,
    },
  ])
  expect(items.map((item) => item.sourcePlanId)).toEqual([
    'plan_a',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  ])
})
