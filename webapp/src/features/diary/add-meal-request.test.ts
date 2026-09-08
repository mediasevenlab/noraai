import { expect, test } from 'bun:test'

import {
  registerAddMealOpener,
  requestAddMeal,
  resetAddMealRequestForTests,
} from './add-meal-request'

test('opens immediately when the diary is already mounted', () => {
  resetAddMealRequestForTests()
  let opened = 0
  const stop = registerAddMealOpener(() => {
    opened += 1
  })
  expect(requestAddMeal()).toBe(true)
  expect(opened).toBe(1)
  stop()
})

test('opens when the diary mounts after a queued request', () => {
  resetAddMealRequestForTests()
  let opened = 0
  expect(requestAddMeal()).toBe(false)
  const stop = registerAddMealOpener(() => {
    opened += 1
  })
  expect(opened).toBe(1)
  stop()
})
