import type { AuthDemoCaptionId } from '@/features/diary'

export type AuthDemoMarqueeDirection = 'left' | 'right'

export type AuthDemoMarqueeFeature =
  | 'diary'
  | 'share'
  | 'ration'
  | 'planMeal'
  | 'mentorCreate'

export type AuthDemoMarqueeCard = {
  id: AuthDemoCaptionId
  title: string
  subtitle: string
  featured?: boolean
}

export const AUTH_DEMO_MARQUEE = {
  settleMs: 4800,
  blurMs: 280,
  pressMs: 160,
  /** Brief hold after the plate bounces back, before cards open. */
  afterPressMs: 240,
  fadeMs: 560,
  enterMs: 640,
  /** After marquee handoff, cards rise first; diary pitch follows. */
  captionEnterDelayMs: 320,
  /** Formed diary card stays collapsed briefly before the Лента plates return. */
  afterDiaryHoldMs: 1100,
  rowDurationsSec: [58, 72, 64],
  rowOffsetsSec: [4, 11, 7],
} as const

export const AUTH_DEMO_MARQUEE_CAPTION = {
  title: 'Функциональное приложение',
  body: 'Дневник, лента и план — питание без таблиц и ручного подсчёта. Сейчас посмотрим, как это выглядит в работе.',
} as const

export const AUTH_DEMO_MARQUEE_CAPTIONS = {
  diary: AUTH_DEMO_MARQUEE_CAPTION,
  share: {
    title: 'Лента приёмов',
    body: 'Сохраните карточку и поделитесь едой в ленте — избранное и реакции без лишних экранов.',
  },
  ration: {
    title: 'Готовый рацион',
    body: 'Выберите цель и готовый день — калории, меню и покупки уже собраны. Дальше смотрим, как это выглядит.',
  },
  planMeal: {
    title: 'План на день',
    body: 'Соберите день, отметьте покупки и выполните приёмы — серые карточки становятся едой.',
  },
  mentorCreate: {
    title: 'План наставника',
    body: 'Соберите день сами: название, цель, завтрак, обед и ужин — с КБЖУ и шагами готовки.',
  },
} as const satisfies Record<
  AuthDemoMarqueeFeature,
  { title: string; body: string }
>

const CARD_COPY: Record<AuthDemoCaptionId, { title: string; subtitle: string }> = {
  diary: { title: 'Дневник питания', subtitle: 'Приёмы за день' },
  add: { title: 'Новый приём', subtitle: 'Фото, текст или голос' },
  photos: { title: 'Фото', subtitle: 'Несколько ракурсов' },
  analyze: { title: 'КБЖУ', subtitle: 'Считаем за вас' },
  ready: { title: 'Карточка', subtitle: 'Уже в дневнике' },
  nutrients: { title: 'Нутриенты', subtitle: 'Не только калории' },
  saved: { title: 'Избранное', subtitle: 'Любимые приёмы' },
  share: { title: 'Лента', subtitle: 'Поделиться приёмом' },
  ration: { title: 'Рацион', subtitle: 'Кнопка «Выбрать»' },
  rationFilter: { title: 'Цель', subtitle: 'Похудение или набор' },
  rationMeals: { title: 'Меню', subtitle: 'Завтрак, обед, ужин' },
  rationCook: { title: 'Готовка', subtitle: 'Рецепт по шагам' },
  rationShop: { title: 'Список', subtitle: 'Покупки на день' },
  rationAdd: { title: 'Рацион', subtitle: 'Плюс и выбор дня' },
  rationDay: { title: 'Неделя', subtitle: 'Старт в календаре' },
  planChosen: { title: 'Выбран', subtitle: 'Даты вместо калорий' },
  dayNorm: { title: 'Норма', subtitle: 'Следите за днём' },
  planMeal: { title: 'Недобор', subtitle: 'Серое фото' },
  shopping: { title: 'Корзина', subtitle: 'Отметить купленное' },
  planDone: { title: 'Норма', subtitle: 'Приём выполнен' },
  mentorCreate: { title: 'Наставник', subtitle: 'Собрать свой день' },
  mentorEditor: { title: 'Сборка', subtitle: 'Блюда и шаги' },
  mentorSaved: { title: 'Отправка', subtitle: 'Рацион пользователю' },
}

function card(id: AuthDemoCaptionId, featured = false): AuthDemoMarqueeCard {
  const copy = CARD_COPY[id]
  return { id, title: copy.title, subtitle: copy.subtitle, featured }
}

/** Login intro: diary as a product mock, plus five glass feature rows. */
export const AUTH_DEMO_FEATURE_MOCK_IMAGE =
  '/diary/auth-demo/auth-demo-01.card.webp'

export const AUTH_DEMO_DIARY_FEATURE_IDS = [
  'photos',
  'diary',
  'analyze',
  'ready',
  'share',
  'ration',
] as const satisfies readonly AuthDemoCaptionId[]

export function authDemoMarqueeIsFeatureGrid(feature: AuthDemoMarqueeFeature) {
  return feature === 'diary'
}

export function authDemoDiaryFeatureCards(): AuthDemoMarqueeCard[] {
  return AUTH_DEMO_DIARY_FEATURE_IDS.map((id) => card(id, id === 'diary'))
}

/** Featured plate sits last in the middle row so it stays on-screen at settle. */
const MIDDLE_BY_FEATURE: Record<AuthDemoMarqueeFeature, readonly AuthDemoCaptionId[]> = {
  diary: ['rationShop', 'share', 'ration', 'rationFilter', 'rationMeals', 'rationCook', 'diary'],
  share: ['rationShop', 'diary', 'ration', 'rationFilter', 'rationMeals', 'rationCook', 'share'],
  ration: ['rationShop', 'diary', 'share', 'rationFilter', 'rationMeals', 'rationCook', 'ration'],
  planMeal: ['rationShop', 'diary', 'share', 'ration', 'rationFilter', 'rationMeals', 'planMeal'],
  mentorCreate: [
    'rationShop',
    'diary',
    'share',
    'ration',
    'rationFilter',
    'rationMeals',
    'mentorCreate',
  ],
}

const ROW_TOP = ['add', 'photos', 'analyze', 'ready', 'nutrients', 'saved', 'rationAdd'] as const
const ROW_BOTTOM = [
  'rationDay',
  'planMeal',
  'shopping',
  'planDone',
  'mentorCreate',
  'mentorEditor',
  'mentorSaved',
] as const

export function authDemoMarqueeRowDirection(index: number): AuthDemoMarqueeDirection {
  return index % 2 === 0 ? 'left' : 'right'
}

export function authDemoMarqueeRows(
  feature: AuthDemoMarqueeFeature = 'diary',
): AuthDemoMarqueeCard[][] {
  const rows = [ROW_TOP, MIDDLE_BY_FEATURE[feature], ROW_BOTTOM] as const
  return rows.map((ids, rowIndex) =>
    ids.map((id) => card(id, rowIndex === 1 && id === feature)),
  )
}

export function authDemoMarqueeFocusAtMs() {
  return AUTH_DEMO_MARQUEE.settleMs
}

export function authDemoMarqueePressAtMs() {
  return AUTH_DEMO_MARQUEE.settleMs + AUTH_DEMO_MARQUEE.blurMs
}

export function authDemoMarqueePressEndAtMs() {
  return authDemoMarqueePressAtMs() + AUTH_DEMO_MARQUEE.pressMs
}

export function authDemoMarqueeLeaveAtMs() {
  return authDemoMarqueePressEndAtMs() + AUTH_DEMO_MARQUEE.afterPressMs
}

export function authDemoMarqueeDoneAtMs() {
  return authDemoMarqueeLeaveAtMs() + AUTH_DEMO_MARQUEE.fadeMs
}
