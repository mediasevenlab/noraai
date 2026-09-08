import { expect, test } from 'bun:test'

import { coerceFavoriteMealIds } from '../src/platform/account-favorites'

test('favorite reads keep valid ids and drop junk without failing', () => {
  const owned = '11111111-1111-4111-8111-111111111111'
  expect(
    coerceFavoriteMealIds([
      owned,
      '  meal-01  ',
      '',
      12,
      null,
      `${owned}-too-long-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`,
      owned,
    ]),
  ).toEqual([owned, 'meal-01'])
})
