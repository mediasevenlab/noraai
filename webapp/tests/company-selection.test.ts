import { expect, test } from 'bun:test'

import { selectedCompanyIdsFrom } from '../src/features/companies/selection'

test('a chat remembers only the chosen company ids', () => {
  expect(selectedCompanyIdsFrom(null)).toEqual([])
  expect(selectedCompanyIdsFrom('nope')).toEqual([])
  expect(selectedCompanyIdsFrom(JSON.stringify(['a', 'a', '', 1, 'b']))).toEqual(['a', 'b'])
})
