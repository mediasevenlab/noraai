import {
  composerTypewriterStartMs,
  composerTypewriterStepMs,
  type ComposerTypewriterPace,
} from './composer-typed-text'
import { feedDayHeading } from './diary-feed'
import { MEAL_FORMING_STEP_GAP_MS, mealFormingSteps } from './meal-forming-steps'
import { MEAL_REVEAL_HEADING_MS, MEAL_REVEAL_MACRO_COUNT, MEAL_REVEAL_MACRO_GAP_MS } from './meal-card-reveal'
import type { MealEntry } from './meals-catalog'
import { portionItemsForMeal } from './meals-catalog'
import { AUTH_DEMO_MEAL_CATALOG } from './auth-demo-meals'

export const AUTH_MEAL_CAROUSEL_INTERVAL_MS = 3400
export const AUTH_MEAL_SLIDE_MS = 700
export const AUTH_MEAL_EXPAND_MS = 620
/** After the frame shrinks to the card, crossfade the painted sheet onto the cover. */
export const AUTH_MEAL_COVER_FADE_MS = 320
export const AUTH_MEAL_INTRO = {
  firstPauseMs: 900,
  slideMs: AUTH_MEAL_SLIDE_MS,
  clickDelayMs: 420,
  pressMs: 280,
} as const

export function authIntroPressAtMs() {
  return AUTH_MEAL_INTRO.firstPauseMs + AUTH_MEAL_INTRO.slideMs + AUTH_MEAL_INTRO.clickDelayMs
}

export function authIntroOpenAtMs() {
  return authIntroPressAtMs() + AUTH_MEAL_INTRO.pressMs
}

export const AUTH_MEAL_DRAFT_DEMO_NOTE =
  'Тёплый салат: белая и красная фасоль, стручковая, черри и чеснок.'

/** Login demo only — keep to ~2 lines in the narrow draft bubble. */
export const AUTH_MEAL_DRAFT_DEMO_WELCOME =
  'Пришлите фото еды, затем текст или голос.'

export const AUTH_MEAL_DRAFT_DEMO_PHOTOS_CHAT =
  '📷 Добавлены 3 фото. Уточните порцию или отправьте.'

export const AUTH_PLAN_MEAL_DEMO = {
  settleMs: 1000,
  completePressMs: 280,
  afterCompleteMs: 1200,
} as const

export function authPlanMealDemoCompletePressAtMs() {
  return AUTH_PLAN_MEAL_DEMO.settleMs
}

export function authPlanMealDemoCompleteAtMs() {
  return AUTH_PLAN_MEAL_DEMO.settleMs + AUTH_PLAN_MEAL_DEMO.completePressMs
}

export function authPlanMealDemoCloseAtMs() {
  return authPlanMealDemoCompleteAtMs() + AUTH_PLAN_MEAL_DEMO.afterCompleteMs
}

export const AUTH_PLAN_BALANCE_DEMO = {
  afterCloseMs: 480,
  tweenMs: 1000,
} as const

export const AUTH_PLAN_DAY_DEMO = {
  firstHoldMs: 1600,
} as const

export const AUTH_SHOP_DEMO = {
  settleMs: 720,
  basketPressMs: 280,
  afterOpenMs: 700,
  itemPressMs: 180,
  afterItemMs: 240,
  afterDoneMs: 720,
  afterCloseMs: 900,
  maxItems: 7,
} as const

export function authShopDemoItemPressAtMs(index: number) {
  return (
    AUTH_SHOP_DEMO.afterOpenMs +
    index * (AUTH_SHOP_DEMO.itemPressMs + AUTH_SHOP_DEMO.afterItemMs)
  )
}

export function authShopDemoItemCheckAtMs(index: number) {
  return authShopDemoItemPressAtMs(index) + AUTH_SHOP_DEMO.itemPressMs
}

export function authShopDemoAfterItemsMs(count: number) {
  if (count === 0) return AUTH_SHOP_DEMO.afterOpenMs
  return authShopDemoItemCheckAtMs(count - 1) + AUTH_SHOP_DEMO.afterItemMs
}

export function authShopDemoCloseAtMs(count: number) {
  return authShopDemoAfterItemsMs(count) + AUTH_SHOP_DEMO.afterDoneMs
}

/** Diary target used so the demo bar shows a visible недобор. */
export const AUTH_DEMO_PLAN_DAILY_KCAL = 2040

export function authDemoPlanKcalTotal(meals: readonly { kcal: number }[]) {
  return meals.reduce((sum, meal) => sum + meal.kcal, 0)
}

export function authDemoPlanBalanceFromDelta(delta: number) {
  if (delta > 0) return `Недобор −${delta.toLocaleString('ru-RU')}`
  if (delta < 0) return `Перебор +${(-delta).toLocaleString('ru-RU')}`
  return 'Норма'
}

export function authDemoPlanBalanceLabel(
  meals: readonly { kcal: number }[],
  dailyKcal = AUTH_DEMO_PLAN_DAILY_KCAL,
) {
  return authDemoPlanBalanceFromDelta(dailyKcal - authDemoPlanKcalTotal(meals))
}

export function authDemoPlanDayHeading(meals: readonly { at: string }[]) {
  const at = meals[0]?.at
  return at ? feedDayHeading(at) : ''
}

export const AUTH_MEAL_DRAFT_DEMO = {
  settleMs: 560,
  fieldPressMs: 280,
  afterFieldMs: 360,
  plusPressMs: 240,
  afterPlusMs: 320,
  // Hold each new preview long enough to read in the modal before the next.
  photoGapMs: 1400,
  photoCount: 3,
  afterPhotosMs: 1600,
  noteFieldPressMs: 280,
  afterNoteFieldMs: 280,
  typeStepMs: 38,
  afterTypedMs: 480,
  sendPressMs: 200,
  afterSendMs: 120,
  /** Brief beat after «Собираю карточку…» before the formed card fills. */
  afterLastFormingStepMs: 420,
  holdReadyMs: 900,
  nutrientsPressMs: 220,
  afterNutrientsMs: 2200,
} as const

export function authDraftDemoWelcomeDoneAtMs() {
  return authDraftDemoTypedMs(AUTH_MEAL_DRAFT_DEMO_WELCOME, 'chat') + 120
}

export function authDraftDemoFieldPressAtMs() {
  return Math.max(AUTH_MEAL_DRAFT_DEMO.settleMs, authDraftDemoWelcomeDoneAtMs())
}

export function authDraftDemoPhotoCycleMs() {
  return (
    AUTH_MEAL_DRAFT_DEMO.plusPressMs +
    AUTH_MEAL_DRAFT_DEMO.afterPlusMs +
    AUTH_MEAL_DRAFT_DEMO.photoGapMs
  )
}

export function authDraftDemoPlusPressAtMs(index: number) {
  return (
    authDraftDemoFieldPressAtMs() +
    AUTH_MEAL_DRAFT_DEMO.fieldPressMs +
    AUTH_MEAL_DRAFT_DEMO.afterFieldMs +
    index * authDraftDemoPhotoCycleMs()
  )
}

export function authDraftDemoPhotoAtMs(index: number) {
  return (
    authDraftDemoPlusPressAtMs(index) +
    AUTH_MEAL_DRAFT_DEMO.plusPressMs +
    AUTH_MEAL_DRAFT_DEMO.afterPlusMs
  )
}

export function authDraftDemoLastPhotoAtMs() {
  return authDraftDemoPhotoAtMs(AUTH_MEAL_DRAFT_DEMO.photoCount - 1)
}

export function authDraftDemoPhotosChatDoneAtMs() {
  return (
    authDraftDemoLastPhotoAtMs() +
    authDraftDemoTypedMs(AUTH_MEAL_DRAFT_DEMO_PHOTOS_CHAT, 'chat') +
    120
  )
}

export function authDraftDemoNoteFieldPressAtMs() {
  return Math.max(
    authDraftDemoLastPhotoAtMs() + AUTH_MEAL_DRAFT_DEMO.afterPhotosMs,
    authDraftDemoPhotosChatDoneAtMs(),
  )
}

export function authDraftDemoTypeStartAtMs() {
  return (
    authDraftDemoNoteFieldPressAtMs() +
    AUTH_MEAL_DRAFT_DEMO.noteFieldPressMs +
    AUTH_MEAL_DRAFT_DEMO.afterNoteFieldMs
  )
}

export function authDraftDemoTypeDurationMs(note = AUTH_MEAL_DRAFT_DEMO_NOTE) {
  return Array.from(note).length * AUTH_MEAL_DRAFT_DEMO.typeStepMs
}

export function authDraftDemoSendPressAtMs(note = AUTH_MEAL_DRAFT_DEMO_NOTE) {
  return (
    authDraftDemoTypeStartAtMs() +
    authDraftDemoTypeDurationMs(note) +
    AUTH_MEAL_DRAFT_DEMO.afterTypedMs
  )
}

export function authDraftDemoFormingAtMs(note = AUTH_MEAL_DRAFT_DEMO_NOTE) {
  return (
    authDraftDemoSendPressAtMs(note) +
    AUTH_MEAL_DRAFT_DEMO.sendPressMs +
    AUTH_MEAL_DRAFT_DEMO.afterSendMs
  )
}

export function authDraftDemoFormingDurationMs(
  photoCount = AUTH_MEAL_DRAFT_DEMO.photoCount,
) {
  const steps = mealFormingSteps(photoCount).length
  // Last step appears at (steps - 1) * gap; reveal right after a short hold.
  return (
    Math.max(0, steps - 1) * MEAL_FORMING_STEP_GAP_MS +
    AUTH_MEAL_DRAFT_DEMO.afterLastFormingStepMs
  )
}

export function authDraftDemoRevealAtMs(note = AUTH_MEAL_DRAFT_DEMO_NOTE) {
  return authDraftDemoFormingAtMs(note) + authDraftDemoFormingDurationMs()
}

export function authDraftDemoNutrientsPressAtMs() {
  return AUTH_MEAL_DRAFT_DEMO.holdReadyMs
}

export function authDraftDemoNutrientsShowAtMs() {
  return (
    AUTH_MEAL_DRAFT_DEMO.holdReadyMs + AUTH_MEAL_DRAFT_DEMO.nutrientsPressMs
  )
}

export function authDraftDemoCloseAtMs() {
  return (
    AUTH_MEAL_DRAFT_DEMO.holdReadyMs +
    AUTH_MEAL_DRAFT_DEMO.nutrientsPressMs +
    AUTH_MEAL_DRAFT_DEMO.afterNutrientsMs
  )
}

export function authDraftDemoTypedMs(text: string, pace: ComposerTypewriterPace) {
  const length = Array.from(text).length
  if (length === 0) return 0
  return composerTypewriterStartMs(pace) + length * composerTypewriterStepMs(length, pace)
}

/** When the open sheet caption switches to «Карточка уже в дневнике». */
export function authDraftDemoReadyCaptionAtMs(note = AUTH_MEAL_DRAFT_DEMO_NOTE) {
  return authDraftDemoRevealAtMs(note) + MEAL_REVEAL_MACRO_COUNT * MEAL_REVEAL_MACRO_GAP_MS
}

/** Macros + title + composition after the card appears, before nutrients. */
export function authDraftDemoReadyAfterRevealMs(meal: MealEntry = authDemoFormedMeal()) {
  const titleMs = authDraftDemoTypedMs(meal.title, 'chat')
  let compositionMs = MEAL_REVEAL_HEADING_MS
  for (const item of portionItemsForMeal(meal)) {
    compositionMs += authDraftDemoTypedMs(item.label, 'fast')
  }
  return MEAL_REVEAL_MACRO_COUNT * MEAL_REVEAL_MACRO_GAP_MS + titleMs + compositionMs
}

/** Close the draft sheet, measured from the moment it opens. */
export function authDraftDemoSheetCloseFromOpenAtMs(
  note = AUTH_MEAL_DRAFT_DEMO_NOTE,
  meal: MealEntry = authDemoFormedMeal(),
) {
  return (
    authDraftDemoRevealAtMs(note) +
    authDraftDemoReadyAfterRevealMs(meal) +
    authDraftDemoCloseAtMs()
  )
}

export function authDraftDemoReadyAtFromOpenMs(
  note = AUTH_MEAL_DRAFT_DEMO_NOTE,
  meal: MealEntry = authDemoFormedMeal(),
) {
  return authDraftDemoRevealAtMs(note) + authDraftDemoReadyAfterRevealMs(meal)
}

export function authDraftDemoNutrientsPressFromOpenAtMs(
  note = AUTH_MEAL_DRAFT_DEMO_NOTE,
  meal: MealEntry = authDemoFormedMeal(),
) {
  return authDraftDemoReadyAtFromOpenMs(note, meal) + authDraftDemoNutrientsPressAtMs()
}

export function authDraftDemoNutrientsShowFromOpenAtMs(
  note = AUTH_MEAL_DRAFT_DEMO_NOTE,
  meal: MealEntry = authDemoFormedMeal(),
) {
  return authDraftDemoReadyAtFromOpenMs(note, meal) + authDraftDemoNutrientsShowAtMs()
}

export const AUTH_MEAL_SAVE_DEMO = {
  /** Hold the formed salad on screen, then scroll to the feed card. */
  holdFormedMs: 1100,
  slideMs: AUTH_MEAL_SLIDE_MS,
  settleMs: 480,
  pressMs: 220,
  afterPressMs: 480,
  toastHoldMs: 1800,
  toastExitMs: 520,
} as const

export function authSaveDemoSlideAtMs() {
  return AUTH_MEAL_SAVE_DEMO.holdFormedMs
}

export function authSaveDemoPressAtMs() {
  return (
    AUTH_MEAL_SAVE_DEMO.holdFormedMs +
    AUTH_MEAL_SAVE_DEMO.slideMs +
    AUTH_MEAL_SAVE_DEMO.settleMs
  )
}

export function authSaveDemoPressEndAtMs() {
  return authSaveDemoPressAtMs() + AUTH_MEAL_SAVE_DEMO.pressMs
}

export function authSaveDemoToastAtMs() {
  return authSaveDemoPressEndAtMs() + AUTH_MEAL_SAVE_DEMO.afterPressMs
}

export function authSaveDemoDoneAtMs() {
  return (
    authSaveDemoToastAtMs() + AUTH_MEAL_SAVE_DEMO.toastHoldMs + AUTH_MEAL_SAVE_DEMO.toastExitMs
  )
}

export const AUTH_DEMO_SHARE_AUTHOR = 'Анна К.'
export const AUTH_DEMO_SHARE_LIKE_TO = 186

/** Floating audience cue next to the login-demo share card (favorites toast zone). */
export const AUTH_DEMO_SHARE_AUDIENCE = [
  { src: '/diary/auth-demo/avatars/viewer-01.jpg', alt: '' },
  { src: '/diary/auth-demo/avatars/viewer-02.jpg', alt: '' },
  { src: '/diary/auth-demo/avatars/viewer-03.jpg', alt: '' },
  { src: '/diary/auth-demo/avatars/viewer-04.jpg', alt: '' },
] as const

export const AUTH_MEAL_SHARE_DEMO = {
  /** Already on the feed card after favorites — no extra carousel slide. */
  slideMs: 0,
  settleMs: 480,
  menuPressMs: 200,
  afterMenuPressMs: 80,
  menuHoldMs: 480,
  sharePressMs: 200,
  afterShareMs: 560,
  likePressMs: 200,
  afterLikePressMs: 100,
  likeCountMs: 1000,
  holdMs: 1400,
  /** Audience cue enter + staggered avatars (login share step). */
  audienceInMs: 720,
  audienceAvatarMs: 540,
  audienceAvatarStaggerMs: 120,
  audienceAvatarDelayMs: 140,
  /** Soft pulse after the cue lands. */
  audiencePulseMs: 560,
} as const

export function authShareDemoMenuPressAtMs() {
  return (
    AUTH_MEAL_SHARE_DEMO.slideMs +
    AUTH_MEAL_SHARE_DEMO.settleMs
  )
}

export function authShareDemoMenuOpenAtMs() {
  return authShareDemoMenuPressAtMs() + AUTH_MEAL_SHARE_DEMO.menuPressMs + AUTH_MEAL_SHARE_DEMO.afterMenuPressMs
}

export function authShareDemoSharePressAtMs() {
  return authShareDemoMenuOpenAtMs() + AUTH_MEAL_SHARE_DEMO.menuHoldMs
}

export function authShareDemoFeedAtMs() {
  return authShareDemoSharePressAtMs() + AUTH_MEAL_SHARE_DEMO.sharePressMs
}

export function authShareDemoLikePressAtMs() {
  return authShareDemoFeedAtMs() + AUTH_MEAL_SHARE_DEMO.afterShareMs
}

export function authShareDemoLikeCountAtMs() {
  return authShareDemoLikePressAtMs() + AUTH_MEAL_SHARE_DEMO.likePressMs + AUTH_MEAL_SHARE_DEMO.afterLikePressMs
}

export function authShareDemoDoneAtMs() {
  return authShareDemoLikeCountAtMs() + AUTH_MEAL_SHARE_DEMO.likeCountMs + AUTH_MEAL_SHARE_DEMO.holdMs
}

export function authShareDemoLikeCountAt(elapsedMs: number) {
  const t = Math.min(1, Math.max(0, elapsedMs) / AUTH_MEAL_SHARE_DEMO.likeCountMs)
  const eased = 1 - (1 - t) ** 2
  return Math.max(1, Math.round(AUTH_DEMO_SHARE_LIKE_TO * eased))
}

/** Feed chrome stays on the shared diary card, not on later plan/diary slides. */
export function authDemoMealShowsFeedChrome(
  itemId: string,
  sharedMealId: string | null,
  feedView: boolean,
) {
  return feedView && sharedMealId === itemId
}

export function authDraftDemoSeekProgress(
  ms: number,
  note = AUTH_MEAL_DRAFT_DEMO_NOTE,
) {
  const photos = AUTH_MEAL_DRAFT_DEMO.photoCount
  let photoCount = 0
  for (let index = 0; index < photos; index += 1) {
    if (ms >= authDraftDemoPhotoAtMs(index)) photoCount = index + 1
  }
  const noteChars = Array.from(note)
  const typeStart = authDraftDemoTypeStartAtMs()
  const typed =
    ms < typeStart
      ? 0
      : Math.min(
          noteChars.length,
          Math.floor((ms - typeStart) / AUTH_MEAL_DRAFT_DEMO.typeStepMs) + 1,
        )
  return {
    photoCount,
    note: noteChars.slice(0, typed).join(''),
    fieldFocused:
      ms >= authDraftDemoFieldPressAtMs() + AUTH_MEAL_DRAFT_DEMO.fieldPressMs,
    forming: ms >= authDraftDemoFormingAtMs(note) && ms < authDraftDemoRevealAtMs(note),
    revealed: ms >= authDraftDemoRevealAtMs(note),
    nutrients:
      ms >=
      authDraftDemoRevealAtMs(note) +
        authDraftDemoReadyAfterRevealMs() +
        authDraftDemoNutrientsShowAtMs(),
  }
}

/** First meal after the opening browse slide — the diary create act. */
export function authDemoCreatesAtIndex(index: number) {
  return index === 1
}

/** Card after the formed meal — share / feed act on login. */
export function authDemoShareAtIndex(index: number) {
  return index === 2
}

export function authDemoShareMeal(
  catalog: readonly MealEntry[] = AUTH_DEMO_MEAL_CATALOG,
): MealEntry {
  const preview = authPreviewMeals(catalog, 6)
  return preview[2] ?? preview[1] ?? preview[0]!
}

/** Ration card inserted after the diary act. */
export const AUTH_DEMO_RATION_SLOT_ID = 'auth-demo-ration'

export function authDemoOpensRationAtIndex(_index: number) {
  return false
}

/** First gray planned meal in the signup-user plan act. */
export const AUTH_DEMO_FIRST_PLAN_INDEX = 2
/** Next planned meal: day bar, shopping list, then the meal opens. */
export const AUTH_DEMO_SHOP_INDEX = 3

export function authDemoShopsAtIndex(index: number, planMealCount = 0) {
  return planMealCount > 0 && index === AUTH_DEMO_SHOP_INDEX
}

export function authDemoOpensPlanMealAtIndex(index: number, planMealCount = 0) {
  return authDemoShopsAtIndex(index, planMealCount)
}

export function authDemoOpensAtIndex(index: number, planMealCount = 0) {
  return (
    authDemoCreatesAtIndex(index) ||
    authDemoOpensRationAtIndex(index) ||
    authDemoOpensPlanMealAtIndex(index, planMealCount)
  )
}

export type AuthDemoCarouselItem<
  M extends { id: string } = { id: string },
  R extends { id: string } = { id: string },
> =
  | { kind: 'meal'; id: string; meal: M }
  | { kind: 'ration'; id: string; ration: R }

/** Two meals, then the ration (optional), then planned meals (or the remaining catalog). */
export function authDemoCarouselItems<M extends { id: string }, R extends { id: string }>(
  meals: readonly M[],
  ration: R,
  planMeals: readonly M[] = [],
  options: { includeRation?: boolean } = {},
): AuthDemoCarouselItem<M, R>[] {
  const includeRation = options.includeRation === true
  const items: AuthDemoCarouselItem<M, R>[] = []
  for (const meal of meals.slice(0, 2)) {
    items.push({ kind: 'meal', id: meal.id, meal })
  }
  if (includeRation) {
    items.push({ kind: 'ration', id: AUTH_DEMO_RATION_SLOT_ID, ration })
  }
  if (planMeals.length > 0) {
    for (const meal of planMeals) {
      items.push({ kind: 'meal', id: meal.id, meal })
    }
    return items
  }
  for (const meal of meals.slice(2)) {
    items.push({ kind: 'meal', id: meal.id, meal })
  }
  return items
}

export const AUTH_DEMO_CAPTIONS = {
  diary: {
    title: 'Дневник питания',
    body: 'Все приёмы за день — на карточках. Откройте любую: блюдо, калории и состав уже внутри.',
  },
  add: {
    title: 'Новый приём за минуту',
    body: 'Фото с тарелки, пара слов или голос — так в дневник попадает еда без таблиц и взвешивания.',
  },
  photos: {
    title: 'Сфотографировали — и хватит',
    body: 'Несколько ракурсов помогают точнее узнать блюда и размер порции, а не гадать по одному кадру.',
  },
  analyze: {
    title: 'Считаем КБЖУ за вас',
    body: 'Модель разбирает фото и текст: калории, белки, жиры и углеводы появляются сами.',
  },
  ready: {
    title: 'Карточка уже в дневнике',
    body: 'Название, состав и порции на месте. Можно уточнить блюдо и сохранить новую версию.',
  },
  nutrients: {
    title: 'Не только калории',
    body: 'Витамины и минералы по тому же приёму — чтобы видеть качество рациона, а не одну цифру.',
  },
  saved: {
    title: 'Любимые приёмы — в закладках',
    body: 'Нажмите ленту на карточке: блюдо попадёт в «Сохранённое», и его не придётся искать в ленте дня.',
  },
  share: {
    title: 'Поделитесь приёмом',
    body: '«Поделиться»: карточка появится в ленте. Нажмите сердце — и счётчик лайков оживёт.',
  },
  ration: {
    title: 'Рацион на весь день',
    body: 'Готовый день на одной карточке: несколько приёмов, калории и цель. Откройте — внутри меню, рецепты и покупки.',
  },
  rationFilter: {
    title: 'Сначала выберите цель',
    body: 'Над карточками — цель и потолок калорий. Откройте меню и переключитесь на «Похудение», чтобы увидеть подходящий день.',
  },
  rationMeals: {
    title: 'Меню на день',
    body: 'Завтрак, обед, перекус и ужин на одной карточке. Нажимайте приёмы — сверху меняется фото блюда.',
  },
  rationCook: {
    title: 'Готовка по шагам',
    body: 'На вкладке «Готовка» рецепт каждого блюда: что делать на сковороде и в какой последовательности.',
  },
  rationShop: {
    title: 'Список покупок собран',
    body: '«Покупки» складывает ингредиенты рациона в один список — без ручного выписывания из меню.',
  },
  rationAdd: {
    title: 'Добавить день в план',
    body: '«Добавить» на карточке открывает выбор дня. Приёмы встают в план — все сразу.',
  },
  rationDay: {
    title: 'Выберите день',
    body: 'Можно поставить день в любой слот недели. В демо выбираем первый день — и он становится планом.',
  },
  planMeal: {
    title: 'Приёмы уже в дневнике',
    body: 'Карточки из плана приходят серыми. Откройте любую — состав и калории уже внутри.',
  },
  shopping: {
    title: 'Покупки на этот день',
    body: 'Корзина собирает продукты из плана. Отметьте купленное — список на день закрывается сам.',
  },
  planDone: {
    title: 'Приём выполнен',
    body: '«Выполнить» снимает серый план: фото становится цветным, а недобор в баре дня уходит в норму.',
  },
  mentorCreate: {
    title: 'План от наставника',
    body: 'Наставник собирает дни для подопечных. Плюс «Создать» открывает пустой план.',
  },
  mentorEditor: {
    title: 'Новый план',
    body: 'Название и цель, затем завтрак, обед и ужин: блюдо, КБЖУ и шаг. «Создать план» сохраняет день.',
  },
  mentorSaved: {
    title: 'Рацион сохранён',
    body: 'Сохранённый день появляется карточкой в ленте наставника — её можно сразу отправить пользователю.',
  },
} as const

export type AuthDemoCaptionId = keyof typeof AUTH_DEMO_CAPTIONS

/** Keep «Дневник питания» on screen while drafting; fade to analyze when counting starts. */
export function authDemoPitchCaptionId(id: AuthDemoCaptionId): AuthDemoCaptionId {
  if (id === 'add' || id === 'photos') return 'diary'
  return id
}

export function authDemoCaptionId(input: {
  open: boolean
  kind?: 'meal' | 'ration' | 'day-picker' | 'mentor-create'
  photos?: number
  analyzing?: boolean
  formed?: boolean
  nutrients?: boolean
  saved?: boolean
  share?: boolean
  rationTab?: 'Меню' | 'Готовка' | 'Покупки'
  rationFilter?: boolean
  rationAdd?: boolean
  planMeal?: boolean
  shopping?: boolean
  planDone?: boolean
  mentorCreate?: boolean
  mentorEditor?: boolean
  mentorSaved?: boolean
}): AuthDemoCaptionId {
  if (input.mentorSaved) return 'mentorSaved'
  if (input.mentorEditor) return 'mentorEditor'
  if (input.mentorCreate || input.kind === 'mentor-create') return 'mentorCreate'
  if (input.planDone) return 'planDone'
  if (input.shopping) return 'shopping'
  if (input.kind === 'day-picker') return 'rationDay'
  if (input.kind === 'ration') {
    if (!input.open) {
      if (input.rationAdd) return 'rationAdd'
      return input.rationFilter ? 'rationFilter' : 'ration'
    }
    if (input.rationTab === 'Покупки') return 'rationShop'
    if (input.rationTab === 'Готовка') return 'rationCook'
    return 'rationMeals'
  }
  if (input.planMeal) return 'planMeal'
  if (!input.open) {
    if (input.share) return 'share'
    return input.saved ? 'saved' : 'diary'
  }
  if (input.nutrients) return 'nutrients'
  if (input.formed) return 'ready'
  if (input.analyzing) return 'analyze'
  if ((input.photos ?? 0) > 0) return 'photos'
  return 'add'
}

/** Catchup offset for the open sheet. Live play always starts that sheet from zero. */
export function authDemoSheetPlayStartMs(offsetMs: number, seeking: boolean) {
  if (!seeking) return 0
  return Math.max(0, offsetMs)
}

export const AUTH_MEAL_CARD_WIDTH_REM = 16.75
export const AUTH_MEAL_CARD_HEIGHT_REM = 22.5
export const AUTH_DEMO_CAPTION_SLOT_REM = 5.5
export const AUTH_DEMO_CAPTION_ABOVE_CARD_REM = 5.75
export const AUTH_MEAL_SIDE_SCALE = 0.88
export const AUTH_MEAL_OPEN_SCALE = 0.88
export const AUTH_MEAL_SIDE_X_REM = {
  closed: 13.25,
  open: 15.25,
} as const

/** Distance from the carousel center to the left edge of the side card. */
export function authDemoLeftCardInsetRem(expanded: boolean) {
  const sideX = expanded ? AUTH_MEAL_SIDE_X_REM.open : AUTH_MEAL_SIDE_X_REM.closed
  return sideX + (AUTH_MEAL_CARD_WIDTH_REM * AUTH_MEAL_SIDE_SCALE) / 2
}

/**
 * Closed cards sit in the flex-1 stage below the reserved caption slot.
 * Pin the pitch just above that stack; keep the open-sheet pitch at the column top.
 */
export function authDemoCaptionTop(expanded: boolean): string {
  if (expanded) return '0rem'
  const slotHalf = AUTH_DEMO_CAPTION_SLOT_REM / 2
  const offset =
    AUTH_MEAL_CARD_HEIGHT_REM / 2 +
    AUTH_DEMO_CAPTION_SLOT_REM +
    AUTH_DEMO_CAPTION_ABOVE_CARD_REM -
    slotHalf
  return `calc(50% - ${offset}rem)`
}

export function authDemoNoteForMeal(meal: MealEntry) {
  if (/фасол/i.test(meal.title) || /фасол/i.test(meal.ingredients)) {
    return AUTH_MEAL_DRAFT_DEMO_NOTE
  }
  return meal.ingredients.replace(/\.$/, '')
}

export function authDemoFormedMeal(
  catalog: readonly MealEntry[] = AUTH_DEMO_MEAL_CATALOG,
): MealEntry {
  const preview = authPreviewMeals(catalog, 6)
  return preview[1] ?? preview[0]!
}

export type AuthDemoAttachItem = {
  id: string
  name: string
  src: string
}

export function authDemoAttachItemsForMeal(
  meal: MealEntry,
  _catalog: readonly MealEntry[] = AUTH_DEMO_MEAL_CATALOG,
  count = AUTH_MEAL_DRAFT_DEMO.photoCount,
): AuthDemoAttachItem[] {
  // Only angles of this meal — never borrow covers from other dishes.
  const gallery = [meal.image, ...(meal.extraImages ?? [])].filter(Boolean)
  const srcs: string[] = []
  for (let index = 0; index < count; index += 1) {
    const src = gallery[index] ?? gallery[index % Math.max(gallery.length, 1)]
    if (src) srcs.push(src)
  }
  return srcs.map((src, index) => ({
    id: `auth-demo-photo-${meal.id}-${index + 1}`,
    name: `Фото ${index + 1}.jpg`,
    src,
  }))
}

export function authDemoAttachItems(
  catalog: readonly MealEntry[] = AUTH_DEMO_MEAL_CATALOG,
  count = AUTH_MEAL_DRAFT_DEMO.photoCount,
): AuthDemoAttachItem[] {
  const preview = authPreviewMeals(catalog, Math.max(count, 3))
  const lead = preview[1] ?? preview[0]
  if (!lead) return []
  return authDemoAttachItemsForMeal(lead, catalog, count)
}

export function authDemoAttachPhotos(
  catalog: readonly MealEntry[] = AUTH_DEMO_MEAL_CATALOG,
  count = AUTH_MEAL_DRAFT_DEMO.photoCount,
): string[] {
  return authDemoAttachItems(catalog, count).map((item) => item.src)
}

export function authPreviewMeals(
  catalog: readonly MealEntry[] = AUTH_DEMO_MEAL_CATALOG,
  count = 6,
): MealEntry[] {
  const featured = catalog.filter((meal) => meal.featured)
  const rest = catalog.filter((meal) => !meal.featured)
  return [...featured, ...rest].slice(0, count)
}

/** Shortest signed distance on a circular list, in `[-floor(n/2), ceil(n/2)]`. */
export function signedCarouselOffset(index: number, active: number, length: number) {
  if (length <= 0) return 0
  let delta = (index - active) % length
  if (delta < 0) delta += length
  if (delta > length / 2) delta -= length
  return delta
}
