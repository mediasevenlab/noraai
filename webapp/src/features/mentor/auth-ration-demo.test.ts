import { readFileSync } from 'node:fs'

import { describe, expect, test } from 'bun:test'

import {
  AUTH_RATION_ADD_DEMO,
  AUTH_RATION_DAY_DEMO,
  AUTH_RATION_DEMO,
  AUTH_RATION_FILTER_DEMO,
  AUTH_RATION_FILTER_FROM_GOAL,
  AUTH_RATION_FILTER_TO_GOAL,
  authDemoPlanMeals,
  authPreviewGainRation,
  authPreviewRation,
  authRationAddDemoDay,
  authRationAddOpenAtMs,
  authRationAddPlusPressAtMs,
  authRationDayBusyAtMs,
  authRationDayCloseAtMs,
  authRationDaySuccessAtMs,
  authRationDemoAfterMealsMs,
  authRationDemoCloseAtMs,
  authRationDemoCookPressAtMs,
  authRationDemoCookShowAtMs,
  authRationDemoMealClickCount,
  authRationDemoMealPressAtMs,
  authRationDemoMealShowAtMs,
  authRationDemoShopPressAtMs,
  authRationDemoShopShowAtMs,
  rationDemoNodeScrollTop,
  authRationFilterCloseAtMs,
  authRationFilterCommitAtMs,
  authRationFilterItemPressAtMs,
  authRationFilterMenuOpenAtMs,
  authRationFilterReadyAtMs,
  authRationFilterSelectAtMs,
  authRationFilterTriggerPressAtMs,
} from './auth-ration-demo'
import { RATION_GOAL_KCAL_CAP } from './rations-catalog'
import { formatRationGoalKcalCap } from './ration-chrome'

describe('auth ration demo choreography', () => {
  test('uses a plan day for the signup preview, not a catalog card', () => {
    expect(authPreviewGainRation().goal).toBe('Набор')
    expect(authPreviewGainRation().id).toBe('auth-demo-plan-gain')
    expect(authPreviewGainRation().source).toBe('План')
    expect(authPreviewGainRation().title).toMatch(/набор/i)
    expect(authPreviewRation().id).toBe('auth-demo-plan')
    expect(authPreviewRation().title).toMatch(/лёгкий старт/i)
    expect(authPreviewRation().meals.length).toBe(3)
    expect(authPreviewRation().goal).toBe('Похудение')
    expect(authPreviewRation().source).toBe('План')
    expect(authPreviewRation().meals.map((meal) => meal.title).join(' ')).toMatch(
      /овсянк|куриц|рыб/i,
    )
    expect(authPreviewRation().meals.every((meal) => meal.image.includes('/rations/ration-01'))).toBe(
      true,
    )
  })

  test('opens the goal menu on Набор, then selects Похудение before the card opens', () => {
    expect(AUTH_RATION_FILTER_FROM_GOAL).toBe('Набор')
    expect(AUTH_RATION_FILTER_TO_GOAL).toBe('Похудение')
    expect(
      formatRationGoalKcalCap(RATION_GOAL_KCAL_CAP['Набор']).replace(/\s/g, ' '),
    ).toBe('до 2 800 ккал')
    expect(authRationFilterTriggerPressAtMs()).toBe(AUTH_RATION_FILTER_DEMO.settleMs)
    expect(authRationFilterMenuOpenAtMs()).toBe(
      AUTH_RATION_FILTER_DEMO.settleMs + AUTH_RATION_FILTER_DEMO.triggerPressMs,
    )
    expect(authRationFilterItemPressAtMs()).toBe(
      authRationFilterMenuOpenAtMs() + AUTH_RATION_FILTER_DEMO.afterOpenMs,
    )
    expect(authRationFilterCommitAtMs()).toBeGreaterThan(authRationFilterItemPressAtMs())
    expect(authRationFilterCloseAtMs()).toBeGreaterThan(authRationFilterCommitAtMs())
    expect(authRationFilterSelectAtMs()).toBeGreaterThan(authRationFilterCloseAtMs())
    expect(AUTH_RATION_FILTER_DEMO.afterOpenMs).toBeGreaterThanOrEqual(1600)
    expect(AUTH_RATION_FILTER_DEMO.afterItemPressMs).toBeGreaterThanOrEqual(400)
    expect(authRationFilterReadyAtMs()).toBeGreaterThan(authRationFilterSelectAtMs())
    expect(authRationFilterReadyAtMs()).toBeGreaterThan(4000)
  })

  test('adds the loss day to Monday, then builds pending diary meals', () => {
    expect(authRationAddDemoDay().short).toBe('День 1')
    expect(authRationAddPlusPressAtMs()).toBe(AUTH_RATION_ADD_DEMO.settleMs)
    expect(authRationAddOpenAtMs()).toBeGreaterThan(authRationAddPlusPressAtMs())
    expect(AUTH_RATION_ADD_DEMO.afterCloseMs).toBeGreaterThan(600)
    expect(authRationDayBusyAtMs()).toBeGreaterThan(AUTH_RATION_DAY_DEMO.settleMs)
    expect(authRationDaySuccessAtMs()).toBeGreaterThan(authRationDayBusyAtMs())
    expect(authRationDayCloseAtMs()).toBeGreaterThan(authRationDaySuccessAtMs())
    const ration = authPreviewRation()
    const meals = authDemoPlanMeals(ration)
    expect(meals).toHaveLength(ration.meals.length)
    expect(meals[0]?.title).toBe(ration.meals[0]?.title)
    expect(meals[0]?.assumptions).toContain('Добавлено из рациона')
    expect(meals.every((meal) => meal.image.length > 0)).toBe(true)
  })

  test('clicks every meal after the opening preview, then cooking and shopping', () => {
    expect(authRationDemoMealClickCount(4)).toBe(3)
    expect(authRationDemoMealClickCount(1)).toBe(0)
    expect(authRationDemoMealPressAtMs(0)).toBe(AUTH_RATION_DEMO.settleMs)
    expect(authRationDemoMealShowAtMs(0)).toBe(
      AUTH_RATION_DEMO.settleMs + AUTH_RATION_DEMO.mealPressMs,
    )
    expect(authRationDemoMealPressAtMs(1)).toBe(
      authRationDemoMealPressAtMs(0) +
        AUTH_RATION_DEMO.mealPressMs +
        AUTH_RATION_DEMO.afterMealMs,
    )
    expect(authRationDemoAfterMealsMs(4)).toBe(
      authRationDemoMealShowAtMs(2) + AUTH_RATION_DEMO.afterMealMs,
    )
    expect(authRationDemoCookPressAtMs(4)).toBe(authRationDemoAfterMealsMs(4))
    expect(authRationDemoCookShowAtMs(4)).toBe(
      authRationDemoCookPressAtMs(4) + AUTH_RATION_DEMO.tabPressMs,
    )
    expect(authRationDemoShopPressAtMs(4)).toBe(
      authRationDemoCookShowAtMs(4) + AUTH_RATION_DEMO.afterCookMs,
    )
    expect(AUTH_RATION_DEMO.afterCookMs).toBeGreaterThan(1500)
    expect(AUTH_RATION_DEMO.afterShopMs).toBeGreaterThan(1500)
    expect(AUTH_RATION_DEMO.afterMealMs).toBeGreaterThan(AUTH_RATION_DEMO.mealScrollMs)
    expect(authRationDemoShopShowAtMs(4)).toBe(
      authRationDemoShopPressAtMs(4) + AUTH_RATION_DEMO.tabPressMs,
    )
    expect(authRationDemoCloseAtMs(4)).toBeGreaterThan(authRationDemoShopShowAtMs(4))
  })

  test('opens the menu on breakfast, then advances meal by meal', () => {
    const sheet = readFileSync(new URL('./AuthRationIdleSheet.tsx', import.meta.url), 'utf8')
    expect(sheet).toContain('previewIndex <= 0')
    expect(sheet).toContain('resetRationDetailScroll(root)')
    expect(sheet).toContain('origin >= authRationDemoMealShowAtMs(clickIndex)')
    expect(sheet).toContain('collapsing={collapsing}')
    expect(sheet).not.toContain('setPreviewIndex(Math.min(clickCount, mealCount - 1))')
    expect(sheet).not.toContain('animateRationDetailScroll')
    expect(sheet).not.toContain('cookScrollMs')
    const dialog = readFileSync(new URL('./RationDialog.tsx', import.meta.url), 'utf8')
    expect(dialog).not.toContain('Приготовление')
    expect(dialog).toContain('h-[168px] max-h-[168px]')
    expect(dialog).toContain('collapsing &&')
  })
})

describe('ration demo scroll', () => {
  test('converts a scaled visual offset into local scrollTop', () => {
    const viewport = {
      scrollTop: 40,
      offsetHeight: 100,
      getBoundingClientRect: () => ({ top: 10, height: 88 }),
    }
    const node = {
      getBoundingClientRect: () => ({ top: 54 }),
    }
    expect(rationDemoNodeScrollTop(viewport, node)).toBeCloseTo(90)
    expect(
      rationDemoNodeScrollTop(
        { ...viewport, offsetHeight: 100, getBoundingClientRect: () => ({ top: 10, height: 100 }) },
        node,
      ),
    ).toBe(84)
  })
})
