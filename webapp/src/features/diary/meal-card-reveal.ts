export const MEAL_REVEAL_MACRO_COUNT = 4
export const MEAL_REVEAL_MACRO_GAP_MS = 420
export const MEAL_REVEAL_BODY_FADE_MS = 320
export const MEAL_REVEAL_HEADING_MS = 16
export const MEAL_TAB_ENTER_MS = 260
export const MEAL_TAB_ENTER_EASE = 'cubic-bezier(0.22, 0.08, 0.18, 1)'

export type MealCardRevealPhase = 'steps' | 'settle' | 'title' | 'composition' | 'ready'

export type MealRevealMacroKey = 'kcal' | 'protein' | 'fat' | 'carbs'

export type MealRevealCursor =
  | { kind: 'heading'; section: 'portions' | 'assumptions' }
  | { kind: 'portion'; index: number; line: 'label' | 'macros' }
  | { kind: 'assumption'; index: number }
  | { kind: 'done' }

export function mealCardRevealInitialPhase(input: {
  hasMeal: boolean
  fromForming: boolean
  reducedMotion: boolean
}): MealCardRevealPhase {
  if (!input.hasMeal) return 'steps'
  if (!input.fromForming || input.reducedMotion) return 'ready'
  return 'settle'
}

export function mealCardRevealShowsChat(phase: MealCardRevealPhase) {
  return phase === 'steps' || phase === 'settle'
}

export function mealFormingChatVisible(input: {
  forming: boolean
  hasMeal: boolean
  phase: MealCardRevealPhase
}) {
  // Keep «Собираю карточку…» as the last chat line while macros settle,
  // then the formed card replaces the chat on the title phase.
  if (input.phase === 'settle') return true
  return input.forming && !input.hasMeal && mealCardRevealShowsChat(input.phase)
}

export function mealAddRevealShouldStart(startedForId: string | null, mealId: string | undefined) {
  return Boolean(mealId) && startedForId !== mealId
}

export function mealCardRevealShowsDetail(phase: MealCardRevealPhase) {
  return phase === 'title' || phase === 'composition' || phase === 'ready'
}

export function mealCardRevealLocksTabs(phase: 'off' | MealCardRevealPhase | 'waiting') {
  return (
    phase === 'waiting'
    || phase === 'settle'
    || phase === 'title'
    || phase === 'composition'
  )
}

export function mealCardRevealHidesComposition(phase: 'off' | MealCardRevealPhase | 'waiting') {
  return phase === 'waiting' || phase === 'settle' || phase === 'title'
}

export type MealMacrosRevealState = {
  rolling: boolean
  rollingKeys?: Record<MealRevealMacroKey, boolean>
}

export function mealRevealMacroRolling(settledCount: number): Record<MealRevealMacroKey, boolean> {
  return {
    kcal: settledCount < 1,
    protein: settledCount < 2,
    fat: settledCount < 3,
    carbs: settledCount < 4,
  }
}

export function mealRevealSettledCountAt(
  elapsedMs: number,
  gapMs = MEAL_REVEAL_MACRO_GAP_MS,
) {
  if (elapsedMs < 0) return 0
  return Math.min(MEAL_REVEAL_MACRO_COUNT, Math.floor(elapsedMs / gapMs))
}

export function startMealRevealCursor(): MealRevealCursor {
  return { kind: 'heading', section: 'portions' }
}

export function advanceMealRevealCursor(
  cursor: MealRevealCursor,
  spec: {
    portions: Array<{ hasMacros: boolean }>
    assumptionCount: number
  },
): MealRevealCursor {
  switch (cursor.kind) {
    case 'heading':
      if (cursor.section === 'portions') {
        if (spec.portions.length === 0) {
          return spec.assumptionCount > 0
            ? { kind: 'heading', section: 'assumptions' }
            : { kind: 'done' }
        }
        return { kind: 'portion', index: 0, line: 'label' }
      }
      if (spec.assumptionCount <= 0) return { kind: 'done' }
      return { kind: 'assumption', index: 0 }
    case 'portion': {
      const item = spec.portions[cursor.index]
      if (!item) return { kind: 'done' }
      if (cursor.line === 'label' && item.hasMacros) {
        return { kind: 'portion', index: cursor.index, line: 'macros' }
      }
      const nextIndex = cursor.index + 1
      if (nextIndex < spec.portions.length) {
        return { kind: 'portion', index: nextIndex, line: 'label' }
      }
      return spec.assumptionCount > 0
        ? { kind: 'heading', section: 'assumptions' }
        : { kind: 'done' }
    }
    case 'assumption': {
      const nextIndex = cursor.index + 1
      if (nextIndex < spec.assumptionCount) {
        return { kind: 'assumption', index: nextIndex }
      }
      return { kind: 'done' }
    }
    case 'done':
      return cursor
  }
}

export function mealRevealShowsAssumptionHeading(cursor: MealRevealCursor) {
  return (
    (cursor.kind === 'heading' && cursor.section === 'assumptions')
    || cursor.kind === 'assumption'
    || cursor.kind === 'done'
  )
}

export function mealRevealPortionVisibility(
  cursor: MealRevealCursor,
  index: number,
  hasMacros: boolean,
): {
  show: boolean
  labelLive: boolean
  showMacros: boolean
  macrosLive: boolean
} {
  const complete = {
    show: true,
    labelLive: false,
    showMacros: hasMacros,
    macrosLive: false,
  }
  const hidden = {
    show: false,
    labelLive: false,
    showMacros: false,
    macrosLive: false,
  }
  if (cursor.kind === 'done' || cursor.kind === 'assumption') return complete
  if (cursor.kind === 'heading') {
    return cursor.section === 'assumptions' ? complete : hidden
  }
  if (index < cursor.index) return complete
  if (index > cursor.index) return hidden
  return {
    show: true,
    labelLive: cursor.line === 'label',
    showMacros: cursor.line === 'macros',
    macrosLive: cursor.line === 'macros',
  }
}

export function mealRevealAssumptionVisibility(cursor: MealRevealCursor, index: number) {
  if (cursor.kind === 'done') {
    return { show: true, live: false }
  }
  if (cursor.kind !== 'assumption') {
    return { show: false, live: false }
  }
  if (index < cursor.index) return { show: true, live: false }
  if (index > cursor.index) return { show: false, live: false }
  return { show: true, live: true }
}
