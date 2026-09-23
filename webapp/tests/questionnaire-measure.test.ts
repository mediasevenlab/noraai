import { expect, test } from 'bun:test'

import {
  measureInputValue,
  measureLabel,
  measureStoredValue,
} from '../src/features/users/questionnaire-sections'

test('profile measures show the unit in the label and keep it in the stored answer', () => {
  expect(measureLabel({ label: 'Возраст', unit: 'лет' })).toBe('Возраст, лет')
  expect(measureInputValue('23 лет', 'лет')).toBe('23')
  expect(measureStoredValue('23', 'лет')).toBe('23 лет')
  expect(measureStoredValue('159 см', 'см')).toBe('159 см')
  expect(measureInputValue('', 'кг')).toBe('')
  expect(measureStoredValue('  ', 'кг')).toBe('')
})
