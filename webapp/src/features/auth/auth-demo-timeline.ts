import {
  AUTH_DEMO_CAPTIONS,
  AUTH_MEAL_CAROUSEL_INTERVAL_MS,
  AUTH_MEAL_COVER_FADE_MS,
  AUTH_MEAL_EXPAND_MS,
  AUTH_MEAL_INTRO,
  AUTH_PLAN_BALANCE_DEMO,
  AUTH_PLAN_DAY_DEMO,
  AUTH_SHOP_DEMO,
  authDraftDemoCloseAtMs,
  authDraftDemoFormingAtMs,
  authDraftDemoNutrientsShowAtMs,
  authDraftDemoPhotoAtMs,
  authDraftDemoReadyAfterRevealMs,
  authDraftDemoReadyCaptionAtMs,
  authDraftDemoRevealAtMs,
  authIntroOpenAtMs,
  authSaveDemoDoneAtMs,
  authShareDemoDoneAtMs,
  authPlanMealDemoCloseAtMs,
  authPlanMealDemoCompleteAtMs,
  authShopDemoCloseAtMs,
  type AuthDemoCaptionId,
} from '@/features/diary'
import {
  AUTH_RATION_ADD_DEMO,
  authMentorCreateMealTabAtMs,
  authMentorCreateSavedAtMs,
  authPreviewRation,
  authRationAddOpenAtMs,
  authRationDayCloseAtMs,
  rationShoppingItems,
} from '@/features/mentor'

export type AuthDemoTimelineMark = {
  id: AuthDemoCaptionId
  title: string
  chip: string
  atMs: number
}

const CHIP_LABELS: Record<AuthDemoCaptionId, string> = {
  diary: 'Дневник',
  add: 'Новый приём',
  photos: 'Фото',
  analyze: 'КБЖУ',
  ready: 'Карточка',
  nutrients: 'Нутриенты',
  saved: 'Избранное',
  share: 'Лента',
  ration: 'Рацион',
  rationFilter: 'Цель',
  rationMeals: 'Меню',
  rationCook: 'Готовка',
  rationShop: 'Список',
  rationAdd: 'В дневник',
  rationDay: 'День',
  planMeal: 'План',
  shopping: 'Корзина',
  planDone: 'Выполнено',
  mentorCreate: 'Создать',
  mentorEditor: 'Сборка',
  mentorSaved: 'Сохранён',
}

function mark(id: AuthDemoCaptionId, atMs: number): AuthDemoTimelineMark {
  return { id, title: AUTH_DEMO_CAPTIONS[id].title, chip: CHIP_LABELS[id], atMs }
}

export const AUTH_DEMO_TIMELINE_GROUPS = [
  {
    id: 'diary',
    chip: 'Дневник',
    titleId: 'diary',
    stepIds: ['diary', 'add', 'photos', 'analyze', 'ready', 'nutrients'],
  },
  {
    id: 'saved',
    chip: 'Лента',
    titleId: 'share',
    stepIds: ['saved', 'share'],
  },
  {
    id: 'rationAdd',
    chip: 'План',
    titleId: 'planMeal',
    stepIds: ['rationAdd', 'rationDay', 'planMeal', 'shopping', 'planDone'],
  },
  {
    id: 'mentorCreate',
    chip: 'Наставник',
    titleId: 'mentorCreate',
    stepIds: ['mentorCreate', 'mentorEditor', 'mentorSaved'],
  },
] as const satisfies readonly {
  id: AuthDemoCaptionId
  chip: string
  titleId: AuthDemoCaptionId
  stepIds: readonly AuthDemoCaptionId[]
}[]

export type AuthDemoSurface = 'login' | 'signup-user' | 'signup-mentor'

const AUTH_DEMO_SURFACE_GROUP_IDS = {
  login: ['diary', 'saved'],
  'signup-user': ['rationAdd'],
  'signup-mentor': ['mentorCreate'],
} as const satisfies Record<
  AuthDemoSurface,
  readonly (typeof AUTH_DEMO_TIMELINE_GROUPS)[number]['id'][]
>

export function authDemoActiveStepId(
  ms: number,
  marks: readonly AuthDemoTimelineMark[],
): AuthDemoCaptionId {
  let current: AuthDemoCaptionId = marks[0]?.id ?? 'diary'
  for (const item of marks) {
    if (ms < item.atMs) break
    current = item.id
  }
  return current
}

export function authDemoTimelineMarks(): AuthDemoTimelineMark[] {
  const ration = authPreviewRation()
  const shopItems = Math.min(AUTH_SHOP_DEMO.maxItems, rationShoppingItems(ration.meals).length)

  const addAt = authIntroOpenAtMs()
  const photosAt = addAt + authDraftDemoPhotoAtMs(0)
  const analyzeAt = addAt + authDraftDemoFormingAtMs()
  const readyAt = addAt + authDraftDemoReadyCaptionAtMs()
  const afterRevealReady = addAt + authDraftDemoRevealAtMs() + authDraftDemoReadyAfterRevealMs()
  const nutrientsAt = afterRevealReady + authDraftDemoNutrientsShowAtMs()
  const afterDraft =
    afterRevealReady + authDraftDemoCloseAtMs() + AUTH_MEAL_EXPAND_MS + AUTH_MEAL_COVER_FADE_MS
  const afterSave = afterDraft + authSaveDemoDoneAtMs()
  const afterShare = afterSave + authShareDemoDoneAtMs()

  const rationAddAt = afterShare + AUTH_MEAL_CAROUSEL_INTERVAL_MS
  const rationDayAt = rationAddAt + authRationAddOpenAtMs()
  const afterDay = rationDayAt + authRationDayCloseAtMs() + AUTH_MEAL_EXPAND_MS
  const planMealAt = afterDay + AUTH_RATION_ADD_DEMO.afterCloseMs
  const shoppingAt =
    planMealAt + AUTH_PLAN_DAY_DEMO.firstHoldMs + AUTH_SHOP_DEMO.settleMs + AUTH_SHOP_DEMO.basketPressMs
  const planDoneAt =
    shoppingAt +
    authShopDemoCloseAtMs(shopItems) +
    AUTH_MEAL_EXPAND_MS +
    AUTH_SHOP_DEMO.afterCloseMs +
    AUTH_MEAL_INTRO.pressMs +
    authPlanMealDemoCompleteAtMs()
  const mentorCreateAt =
    planDoneAt +
    (authPlanMealDemoCloseAtMs() - authPlanMealDemoCompleteAtMs()) +
    AUTH_PLAN_BALANCE_DEMO.afterCloseMs
  const mentorEditorAt = mentorCreateAt + authMentorCreateMealTabAtMs()
  const mentorSavedAt = mentorCreateAt + authMentorCreateSavedAtMs()

  return [
    mark('diary', 0),
    mark('add', addAt),
    mark('photos', photosAt),
    mark('analyze', analyzeAt),
    mark('ready', readyAt),
    mark('nutrients', nutrientsAt),
    mark('saved', afterDraft),
    mark('share', afterSave),
    mark('rationAdd', rationAddAt),
    mark('rationDay', rationDayAt),
    mark('planMeal', planMealAt),
    mark('shopping', shoppingAt),
    mark('planDone', planDoneAt),
    mark('mentorCreate', mentorCreateAt),
    mark('mentorEditor', mentorEditorAt),
    mark('mentorSaved', mentorSavedAt),
  ]
}

export function authDemoTimelineGroups(surface?: AuthDemoSurface): AuthDemoTimelineMark[] {
  const marks = authDemoTimelineMarks()
  const groups = AUTH_DEMO_TIMELINE_GROUPS.map((group) => {
    const first = marks.find((item) => item.id === group.stepIds[0])
    return {
      id: group.id,
      chip: group.chip,
      title: AUTH_DEMO_CAPTIONS[group.titleId].title,
      atMs: first?.atMs ?? 0,
    }
  })
  if (!surface) return groups
  const allowed = new Set<string>(AUTH_DEMO_SURFACE_GROUP_IDS[surface])
  const shown = groups.filter((group) => allowed.has(group.id))
  const origin = shown[0]?.atMs ?? 0
  // Each auth page plays its own clock from zero — do not seek through login.
  return shown.map((group) => ({ ...group, atMs: group.atMs - origin }))
}

export function authDemoSurfaceWindow(surface: AuthDemoSurface): {
  startMs: number
  endMs: number
} {
  const all = authDemoTimelineGroups()
  const ids = AUTH_DEMO_SURFACE_GROUP_IDS[surface]
  const origin = all.find((group) => group.id === ids[0])?.atMs ?? 0
  const lastIndex = all.findIndex((group) => group.id === ids[ids.length - 1])
  const next = lastIndex >= 0 ? all[lastIndex + 1] : undefined
  return {
    startMs: 0,
    endMs: next ? next.atMs - origin : Number.POSITIVE_INFINITY,
  }
}
