import { expect, test } from 'bun:test'

import { schemeFileName } from './handbook-schemes'

test('only a handbook image name is served', () => {
  expect(schemeFileName('x003.gif')).toBe('x003.gif')
  expect(schemeFileName('x220.jpg')).toBe('x220.jpg')
  expect(schemeFileName('../.env')).toBeNull()
  expect(schemeFileName('x003.gif/../../.env')).toBeNull()
  expect(schemeFileName('footer.js')).toBeNull()
})
