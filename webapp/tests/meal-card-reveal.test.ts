import { expect, test } from 'bun:test'

import {
  advanceMealRevealCursor,
  mealCardRevealHidesComposition,
  mealCardRevealInitialPhase,
  mealCardRevealLocksTabs,
  mealCardRevealShowsChat,
  mealCardRevealShowsDetail,
  mealFormingChatVisible,
  mealAddRevealShouldStart,
  mealRevealAssumptionVisibility,
  mealRevealMacroRolling,
  mealRevealPortionVisibility,
  mealRevealSettledCountAt,
  startMealRevealCursor,
} from '../src/features/diary/meal-card-reveal'

test('keeps the chat until macros settle, then shows the formed card', () => {
  expect(mealCardRevealInitialPhase({
    hasMeal: false,
    fromForming: true,
    reducedMotion: false,
  })).toBe('steps')
  expect(mealCardRevealInitialPhase({
    hasMeal: true,
    fromForming: true,
    reducedMotion: false,
  })).toBe('settle')
  expect(mealCardRevealInitialPhase({
    hasMeal: true,
    fromForming: true,
    reducedMotion: true,
  })).toBe('ready')
  expect(mealCardRevealInitialPhase({
    hasMeal: true,
    fromForming: false,
    reducedMotion: false,
  })).toBe('ready')
  expect(mealCardRevealShowsChat('settle')).toBe(true)
  expect(mealCardRevealShowsDetail('settle')).toBe(false)
  expect(mealCardRevealShowsChat('title')).toBe(false)
  expect(mealCardRevealShowsDetail('title')).toBe(true)
  expect(mealCardRevealLocksTabs('title')).toBe(true)
  expect(mealCardRevealLocksTabs('composition')).toBe(true)
  expect(mealCardRevealLocksTabs('waiting')).toBe(true)
  expect(mealCardRevealLocksTabs('settle')).toBe(true)
  expect(mealCardRevealLocksTabs('ready')).toBe(false)
  expect(mealCardRevealLocksTabs('off')).toBe(false)
  expect(mealCardRevealHidesComposition('waiting')).toBe(true)
  expect(mealCardRevealHidesComposition('title')).toBe(true)
  expect(mealCardRevealHidesComposition('composition')).toBe(false)
})

test('keeps forming steps through settle so «Собираю…» stays the last chat line', () => {
  expect(mealFormingChatVisible({
    forming: true,
    hasMeal: false,
    phase: 'steps',
  })).toBe(true)
  expect(mealFormingChatVisible({
    forming: false,
    hasMeal: true,
    phase: 'settle',
  })).toBe(true)
  expect(mealFormingChatVisible({
    forming: true,
    hasMeal: true,
    phase: 'settle',
  })).toBe(true)
  expect(mealFormingChatVisible({
    forming: false,
    hasMeal: true,
    phase: 'title',
  })).toBe(false)
  expect(mealFormingChatVisible({
    forming: false,
    hasMeal: false,
    phase: 'steps',
  })).toBe(false)
  expect(mealAddRevealShouldStart(null, 'meal-1')).toBe(true)
  expect(mealAddRevealShouldStart('meal-1', 'meal-1')).toBe(false)
})

test('locks KBJU one field at a time', () => {
  expect(mealRevealSettledCountAt(0)).toBe(0)
  expect(mealRevealMacroRolling(0)).toEqual({
    kcal: true,
    protein: true,
    fat: true,
    carbs: true,
  })
  expect(mealRevealMacroRolling(1)).toEqual({
    kcal: false,
    protein: true,
    fat: true,
    carbs: true,
  })
  expect(mealRevealMacroRolling(4)).toEqual({
    kcal: false,
    protein: false,
    fat: false,
    carbs: false,
  })
  expect(mealRevealSettledCountAt(420)).toBe(1)
  expect(mealRevealSettledCountAt(1680)).toBe(4)
})

test('prints composition from the first portion down through assumptions', () => {
  const spec = {
    portions: [{ hasMacros: true }, { hasMacros: true }, { hasMacros: false }],
    assumptionCount: 2,
  }
  let cursor = startMealRevealCursor()
  expect(cursor).toEqual({ kind: 'heading', section: 'portions' })
  expect(mealRevealPortionVisibility(cursor, 0, true).show).toBe(false)

  cursor = advanceMealRevealCursor(cursor, spec)
  expect(cursor).toEqual({ kind: 'portion', index: 0, line: 'label' })
  expect(mealRevealPortionVisibility(cursor, 0, true)).toEqual({
    show: true,
    labelLive: true,
    showMacros: false,
    macrosLive: false,
  })

  cursor = advanceMealRevealCursor(cursor, spec)
  expect(cursor).toEqual({ kind: 'portion', index: 0, line: 'macros' })
  cursor = advanceMealRevealCursor(cursor, spec)
  expect(cursor).toEqual({ kind: 'portion', index: 1, line: 'label' })
  cursor = advanceMealRevealCursor(cursor, spec)
  cursor = advanceMealRevealCursor(cursor, spec)
  expect(cursor).toEqual({ kind: 'portion', index: 2, line: 'label' })
  cursor = advanceMealRevealCursor(cursor, spec)
  expect(cursor).toEqual({ kind: 'heading', section: 'assumptions' })
  cursor = advanceMealRevealCursor(cursor, spec)
  expect(mealRevealAssumptionVisibility(cursor, 0)).toEqual({ show: true, live: true })
  cursor = advanceMealRevealCursor(cursor, spec)
  cursor = advanceMealRevealCursor(cursor, spec)
  expect(cursor).toEqual({ kind: 'done' })
  expect(mealRevealPortionVisibility(cursor, 2, false).show).toBe(true)
})
