import { expect, test } from 'bun:test'

import {
  ruStepCountLabel,
  STEP_ITEMS,
  STEPS_META,
  stepVersion,
} from '../src/features/steps/model'

test('development history records product work after the template and names the current version', () => {
  expect(STEPS_META.title).toBe('Разработка')
  expect(STEP_ITEMS.length).toBeGreaterThanOrEqual(8)
  expect(STEPS_META.itemCount).toBe(STEP_ITEMS.length)
  expect(STEPS_META.currentVersion).toBe(stepVersion(STEP_ITEMS[STEP_ITEMS.length - 1]!))
  expect(STEPS_META.subtitle).toBe(ruStepCountLabel(STEP_ITEMS.length))

  const versions = STEP_ITEMS.map(stepVersion)
  expect(versions[0]).toBe('v0.1')
  expect(new Set(versions).size).toBe(versions.length)

  for (let index = 1; index < versions.length; index += 1) {
    const [prevMajor, prevMinor] = versions[index - 1]!.slice(1).split('.').map(Number)
    const [major, minor] = versions[index]!.slice(1).split('.').map(Number)
    expect(major * 1000 + minor).toBeGreaterThan(prevMajor * 1000 + prevMinor)
  }

  const text = STEP_ITEMS.map((item) => `${item.title} ${item.description}`).join('\n').toLowerCase()
  expect(text).toMatch(/рол/)
  expect(text).toContain('новост')
  expect(text).toContain('telegram')
  expect(text).toMatch(/закладк|избранн/)

  for (const item of STEP_ITEMS) {
    expect(item.category).toMatch(/^Версия · v\d+\.\d+$/)
    expect(item.title.length).toBeGreaterThan(0)
    expect(item.badge.length).toBeGreaterThan(0)
    expect(item.description.length).toBeGreaterThan(40)
  }
})

test('russian step count uses the correct plural form', () => {
  expect(ruStepCountLabel(1)).toBe('1 шаг')
  expect(ruStepCountLabel(2)).toBe('2 шага')
  expect(ruStepCountLabel(4)).toBe('4 шага')
  expect(ruStepCountLabel(5)).toBe('5 шагов')
  expect(ruStepCountLabel(10)).toBe('10 шагов')
  expect(ruStepCountLabel(11)).toBe('11 шагов')
  expect(ruStepCountLabel(21)).toBe('21 шаг')
})
