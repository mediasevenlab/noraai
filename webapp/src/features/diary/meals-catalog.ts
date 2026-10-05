/**
 * Shared meal catalog for the user diary feed.
 */
import type { GenerationSpend, MealMicronutrient, MealPortionItem } from '@web-app-demo/contracts'
import {
  formatMicronutrientAmount,
  mealMicronutrientDefs,
  normalizeMicronutrients,
  partitionMealMicronutrients,
} from '@web-app-demo/contracts'

import {
  groceryShoppingLines,
  isCulinaryNote,
  splitIngredientParts,
} from '@/platform/grocery-lines'

import { visibleMealAssumptions } from './ration-import'

export type { MealMicronutrient }
export { partitionMealMicronutrients }
export { groceryShoppingLines, isCulinaryNote, splitIngredientParts }

export type FoodCategory = 'Все' | 'Птица' | 'Рыба' | 'Мясо' | 'Завтрак' | 'Перекус' | 'Каша'
export type MealSlot = 'Завтрак' | 'Обед' | 'Ужин' | 'Перекус'

export type MealVersionEntry = {
  id: string
  createdAt: string
  label: string
  note?: string
}

export type MealEntry = {
  id: string
  title: string
  ingredients: string
  category: Exclude<FoodCategory, 'Все'>
  meal: MealSlot
  at: string
  kcal: number
  protein: number
  fat: number
  carbs: number
  image: string
  extraImages?: string[]
  featured?: boolean
  /** Structured portion lines for the open-meal detail view. */
  portionItems?: Array<string | MealPortionItem>
  clientComment?: string
  assumptions?: string[]
  micronutrients?: MealMicronutrient[]
  /** Present for API meals with refine history. */
  versions?: MealVersionEntry[]
  activeVersionId?: string
  /** True for persisted server meals (UUID), false for demo catalog. */
  fromApi?: boolean
  /** Owner published this meal to the rations feed. */
  shared?: boolean
  /** Present on public feed cards. */
  authorName?: string
  likeCount?: number
  liked?: boolean
  /** Mentor diary: this card has not been viewed yet. */
  unread?: boolean
  /** Sum of every AI call for this meal. Independent of the selected version. */
  generationSpend?: GenerationSpend
}

/** Catalog blobs mix product commas with notes like `в тесто` and `для подачи`. */
function splitIngredients(ingredients: string): string[] {
  const lines: string[] = []
  for (const part of splitIngredientParts(ingredients)) {
    if (isCulinaryNote(part)) {
      if (lines.length > 0) lines[lines.length - 1] = `${lines[lines.length - 1]}, ${part}`
      continue
    }
    lines.push(part)
  }
  return lines
}

/** One scannable line per ingredient for meal cards. */
export function mealCompositionLines(
  meal: Pick<MealEntry, 'ingredients' | 'portionItems'>,
): string[] {
  if (meal.portionItems && meal.portionItems.length > 0) {
    const labels = meal.portionItems
      .map((item) => (typeof item === 'string' ? item : item.label).trim())
      .filter(Boolean)
    if (labels.length > 0) return labels
  }
  return splitIngredients(meal.ingredients)
}

/** Unique products to buy, never culinary notes like «для подачи» or «СО». */
export function mealGroceryLines(
  meal: Pick<MealEntry, 'ingredients' | 'portionItems'>,
): string[] {
  if (meal.portionItems && meal.portionItems.length > 0) {
    const labels = meal.portionItems
      .map((item) => (typeof item === 'string' ? item : item.label).trim())
      .filter((label) => label && !isCulinaryNote(label))
    if (labels.length > 0) return labels
  }
  return groceryShoppingLines(meal.ingredients)
}

/** Demo portion lines with rough weights when catalog omits `portionItems`. */
export function portionItemsForMeal(meal: MealEntry): MealPortionItem[] {
  const labels = meal.portionItems?.length
    ? meal.portionItems.map((item) => (typeof item === 'string' ? item : item.label))
    : splitIngredients(meal.ingredients).map((part, index) => {
        const grams = [120, 80, 60, 40, 30, 20][index] ?? 25
        return `${part} ~${grams} г`
      })
  const structured = (meal.portionItems ?? []).filter(
    (item): item is MealPortionItem => typeof item !== 'string',
  )
  if (structured.length > 0 && structured.some(portionItemHasMacros)) {
    return structured
  }
  return distributePortionMacros(labels, meal)
}

export function portionItemHasMacros(item: MealPortionItem) {
  return item.kcal > 0 || item.protein > 0 || item.fat > 0 || item.carbs > 0
}

export function formatPortionItemMacros(item: MealPortionItem) {
  return `${item.kcal} ккал · Б: ${item.protein} · Ж: ${item.fat} · У: ${item.carbs}`
}

export function distributePortionMacros(
  labels: string[],
  totals: Pick<MealEntry, 'kcal' | 'protein' | 'fat' | 'carbs'>,
): MealPortionItem[] {
  if (labels.length === 0) return []
  const parsed = labels.map(parsePortionGrams)
  const hasWeights = parsed.every((grams) => grams != null && grams > 0)
  const shares = hasWeights ? parsed.map((grams) => grams ?? 1) : labels.map(() => 1)
  const shareSum = shares.reduce((sum, value) => sum + value, 0)
  const keys = ['kcal', 'protein', 'fat', 'carbs'] as const
  const items: MealPortionItem[] = labels.map((label) => ({
    label,
    kcal: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
  }))
  for (const key of keys) {
    let allocated = 0
    for (let index = 0; index < items.length; index += 1) {
      if (index === items.length - 1) {
        items[index]![key] = Math.max(0, totals[key] - allocated)
        break
      }
      const value = Math.round((totals[key] * shares[index]!) / shareSum)
      items[index]![key] = value
      allocated += value
    }
  }
  return items
}

function parsePortionGrams(label: string) {
  const match = label.match(/(\d+(?:[.,]\d+)?)\s*г/i)
  if (!match?.[1]) return null
  const grams = Number(match[1].replace(',', '.'))
  return Number.isFinite(grams) && grams > 0 ? grams : null
}

export function clientCommentForMeal(meal: MealEntry): string {
  if (meal.clientComment) return meal.clientComment
  if (meal.meal === 'Завтрак') {
    return 'Готовил дома утром. Порция обычная, без добавок.'
  }
  if (meal.meal === 'Перекус') {
    return 'Быстрый перекус между встречами.'
  }
  return 'Сфотографировал тарелку как есть. Соус отдельно не взвешивал.'
}

const USER_PRESENT_TO_PAST: Readonly<Record<string, string>> = {
  просит: 'просил',
  уточняет: 'уточнил',
  сообщает: 'сообщил',
  говорит: 'сказал',
  хочет: 'хотел',
  добавляет: 'добавил',
  указывает: 'указал',
  отмечает: 'отметил',
  пишет: 'написал',
  присылает: 'прислал',
  спрашивает: 'спросил',
  подтверждает: 'подтвердил',
  настаивает: 'настаивал',
}

const USER_PRESENT_VERB = Object.keys(USER_PRESENT_TO_PAST).join('|')

function replaceClientWithUser(text: string) {
  return text.replace(
    /клиент(ами|ах|ов|ам|ом|а|у|е|ы)?/gi,
    (match, ending: string | undefined) => {
      const suffix = ending ?? ''
      const mapped =
        suffix === 'ами'
          ? 'ями'
          : suffix === 'ах'
            ? 'ях'
            : suffix === 'ов'
              ? 'ей'
              : suffix === 'ам'
                ? 'ям'
                : suffix === 'ом'
                  ? 'ем'
                  : suffix === 'а'
                    ? 'я'
                    : suffix === 'у'
                      ? 'ю'
                      : suffix === 'е'
                        ? 'е'
                        : suffix === 'ы'
                          ? 'и'
                          : ''
      const stem = match[0] === 'К' ? 'Пользовател' : 'пользовател'
      return `${stem}${mapped || 'ь'}`
    },
  )
}

function rewriteUserVerbsToPast(text: string) {
  return text.replace(
    new RegExp(`(пользователь)\\s+(${USER_PRESENT_VERB})`, 'gi'),
    (_match, subject: string, verb: string) => {
      const past = USER_PRESENT_TO_PAST[verb.toLowerCase()] ?? verb
      const cased =
        verb[0] !== verb[0]!.toLowerCase()
          ? `${past.charAt(0).toUpperCase()}${past.slice(1)}`
          : past
      return `${subject} ${cased}`
    },
  )
}

/** Visible comment copy: «пользователь», never «клиент»; verbs in past tense. */
export function displayMealComment(text: string) {
  return rewriteUserVerbsToPast(replaceClientWithUser(text))
}

const DEMO_MICRONUTRIENT_BASE: Record<MealMicronutrient['key'], number> = {
  sodium: 480,
  potassium: 720,
  vitaminC: 22,
  vitaminD: 1.4,
  vitaminA: 180,
  iron: 2.4,
  zinc: 2.1,
  iodine: 28,
  selenium: 18,
  calcium: 160,
  magnesium: 62,
  phosphorus: 240,
  biotin: 8,
  vitaminK: 24,
  vitaminE: 1.8,
  folate: 42,
  vitaminB6: 0.4,
  vitaminB12: 0.8,
}

export function micronutrientsForMeal(meal: MealEntry): MealMicronutrient[] {
  if (meal.micronutrients && meal.micronutrients.length > 0) {
    return normalizeMicronutrients(meal.micronutrients)
  }
  if (meal.fromApi) return []
  const scale = Math.max(0.45, meal.kcal / 500)
  return mealMicronutrientDefs.map((item) => ({
    key: item.key,
    label: item.label,
    unit: item.unit,
    amount: Math.round(DEMO_MICRONUTRIENT_BASE[item.key] * scale * 10) / 10,
  }))
}

export function formatMicronutrientLine(item: MealMicronutrient) {
  return `${formatMicronutrientAmount(item.amount)} ${item.unit}`
}

export function assumptionsForMeal(meal: MealEntry): string[] {
  const stored = visibleMealAssumptions(meal.assumptions)
  if (stored.length) return stored
  return [
    'Вес продуктов оценён по фото, без кухонных весов.',
    'Масло/соус учтены средним значением для такого блюда.',
    meal.featured
      ? 'Калорийность близка к целевой на приём.'
      : 'Допускается погрешность ±10–15% по КБЖУ.',
  ]
}

/** One card per unique image from Downloads/Дневник питания (duplicate *(1)* skipped). */
export const MEAL_CATALOG: MealEntry[] = [
  {
    id: 'meal-01',
    title: 'Куриный ролл с салатом',
    ingredients: 'Лаваш, курица, салат айсберг.',
    category: 'Птица',
    meal: 'Обед',
    at: '2026-07-30T14:36:00',
    kcal: 470,
    protein: 28,
    fat: 20,
    carbs: 42,
    image: '/diary/meals/meal-01.jpg',
    featured: true,
    portionItems: [
      'Лаваш тонкий ~70 г',
      'Куриное филе ~110 г',
      'Салат айсберг ~40 г',
      'Соус йогуртовый ~20 г',
    ],
    clientComment: 'Брал с собой в офис, ролл из кафе рядом.',
    assumptions: [
      'Соус оценён по типичной порции кафе.',
      'Лаваш — стандартный тонкий, не цельнозерновой.',
    ],
  },
  {
    id: 'meal-02',
    title: 'Овсянка с творогом и бананом',
    ingredients: 'Овсянка, творог, банан, греческий йогурт.',
    category: 'Завтрак',
    meal: 'Завтрак',
    at: '2026-07-30T08:12:00',
    kcal: 420,
    protein: 28,
    fat: 10,
    carbs: 55,
    image: '/diary/meals/meal-02.jpg',
    featured: true,
    portionItems: [
      'Овсянка (сухая) ~45 г',
      'Творог 5% ~100 г',
      'Банан ~90 г',
      'Греческий йогурт ~80 г',
    ],
    clientComment:
      'Обычный завтрак дома. Банан спелый, творог из ближайшего магазина.',
    assumptions: [
      'Овсянка сварена на воде, молоко не добавлялось.',
      'Жирность творога принята как 5%.',
      'Мёд или сахар не учитывались.',
    ],
  },
  {
    id: 'meal-03',
    title: 'Яичница с овощами и ржаным хлебом',
    ingredients: 'Яйца, болгарский перец, ржаной хлеб.',
    category: 'Завтрак',
    meal: 'Завтрак',
    at: '2026-07-29T09:05:00',
    kcal: 480,
    protein: 28,
    fat: 26,
    carbs: 32,
    image: '/diary/meals/meal-03.jpg',
    portionItems: [
      'Яйца куриные 2 шт. ~110 г',
      'Болгарский перец ~60 г',
      'Ржаной хлеб ~40 г',
      'Масло для жарки ~5 г',
    ],
  },
  {
    id: 'meal-04',
    title: 'Паровые котлеты с огурцом и хлебом',
    ingredients: 'Куриные котлеты, огурец, хлеб.',
    category: 'Птица',
    meal: 'Обед',
    at: '2026-07-29T13:40:00',
    kcal: 420,
    protein: 32,
    fat: 14,
    carbs: 34,
    image: '/diary/meals/meal-04.jpg',
    portionItems: [
      'Куриные котлеты на пару ~140 г',
      'Огурец свежий ~80 г',
      'Хлеб пшеничный ~35 г',
    ],
  },
  {
    id: 'meal-05',
    title: 'Греческий йогурт с ржаными отрубями',
    ingredients: 'Греческий йогурт, ржаные отруби.',
    category: 'Перекус',
    meal: 'Перекус',
    at: '2026-07-29T16:20:00',
    kcal: 180,
    protein: 14,
    fat: 4,
    carbs: 22,
    image: '/diary/meals/meal-05.jpg',
    portionItems: [
      'Греческий йогурт ~150 г',
      'Ржаные отруби ~15 г',
    ],
  },
  {
    id: 'meal-06',
    title: 'Тушёная капуста с мясом и ржаным хлебом',
    ingredients: 'Капуста, мясо, морковь, ржаной хлеб.',
    category: 'Мясо',
    meal: 'Обед',
    at: '2026-07-28T14:10:00',
    kcal: 420,
    protein: 26,
    fat: 16,
    carbs: 42,
    image: '/diary/meals/meal-06.jpg',
    portionItems: [
      'Капуста тушёная ~180 г',
      'Мясо (говядина) ~80 г',
      'Морковь ~40 г',
      'Ржаной хлеб ~35 г',
    ],
    clientComment: 'Домашняя тушёнка, хлеб отдельно на тарелке.',
  },
  {
    id: 'meal-07',
    title: 'Куриная грудка с рисом и салатом',
    ingredients: 'Куриная грудка, рис, пекинская капуста, сметана.',
    category: 'Птица',
    meal: 'Обед',
    at: '2026-07-28T13:25:00',
    kcal: 510,
    protein: 48,
    fat: 14,
    carbs: 48,
    image: '/diary/meals/meal-07.jpg',
    featured: true,
    portionItems: [
      'Куриная грудка ~150 г',
      'Рис отварной ~140 г',
      'Пекинская капуста ~60 г',
      'Сметана 15% ~20 г',
    ],
  },
  {
    id: 'meal-08',
    title: 'Овсяноблин с бананом',
    ingredients: 'Овсяноблин, банан, мёд.',
    category: 'Завтрак',
    meal: 'Завтрак',
    at: '2026-07-28T08:45:00',
    kcal: 380,
    protein: 16,
    fat: 12,
    carbs: 52,
    image: '/diary/meals/meal-08.jpg',
    portionItems: [
      'Овсяноблин ~120 г',
      'Банан ~80 г',
      'Мёд ~10 г',
    ],
  },
  {
    id: 'meal-09',
    title: 'Куриное филе с картофелем и салатом',
    ingredients: 'Куриное филе, картофель, пекинская капуста, огурец, перец.',
    category: 'Птица',
    meal: 'Ужин',
    at: '2026-07-27T19:15:00',
    kcal: 560,
    protein: 48,
    fat: 14,
    carbs: 52,
    image: '/diary/meals/meal-09.jpg',
    portionItems: [
      'Куриное филе ~160 г',
      'Картофель запечённый ~150 г',
      'Салат из овощей ~100 г',
    ],
  },
  {
    id: 'meal-10',
    title: 'Гречка с курицей и овощами',
    ingredients: 'Гречка, курица, морковь, лук.',
    category: 'Каша',
    meal: 'Обед',
    at: '2026-07-27T14:00:00',
    kcal: 380,
    protein: 36,
    fat: 8,
    carbs: 42,
    image: '/diary/meals/meal-10.jpg',
    portionItems: [
      'Гречка отварная ~150 г',
      'Курица ~100 г',
      'Морковь и лук ~50 г',
    ],
  },
  {
    id: 'meal-11',
    title: 'Филе индейки с кускусом и огурцами',
    ingredients: 'Филе индейки, кускус, огурцы.',
    category: 'Птица',
    meal: 'Обед',
    at: '2026-07-27T14:36:00',
    kcal: 472,
    protein: 65,
    fat: 7,
    carbs: 29,
    image: '/diary/meals/meal-11.jpg',
    featured: true,
    portionItems: [
      'Филе индейки ~170 г',
      'Кускус ~80 г (сухой ~35 г)',
      'Огурцы ~90 г',
    ],
  },
  {
    id: 'meal-12',
    title: 'Шаурма на гриле',
    ingredients: 'Лаваш, курица, овощи, соус.',
    category: 'Птица',
    meal: 'Ужин',
    at: '2026-07-26T20:05:00',
    kcal: 620,
    protein: 28,
    fat: 28,
    carbs: 58,
    image: '/diary/meals/meal-12.jpg',
    portionItems: [
      'Лаваш ~90 г',
      'Курица гриль ~120 г',
      'Овощи ~80 г',
      'Соус ~30 г',
    ],
    clientComment: 'Уличная шаурма, порция большая.',
    assumptions: [
      'Соус и масло для гриля оценены сверху.',
      'Точный вес лаваша неизвестен.',
    ],
  },
  {
    id: 'meal-13',
    title: 'Белая рыба с овощами',
    ingredients: 'Белая рыба, брокколи, морковь, свёкла, лимон.',
    category: 'Рыба',
    meal: 'Обед',
    at: '2026-07-26T13:50:00',
    kcal: 340,
    protein: 36,
    fat: 10,
    carbs: 22,
    image: '/diary/meals/meal-13.jpg',
    featured: true,
    portionItems: [
      'Белая рыба запечённая ~140 г',
      'Брокколи ~80 г',
      'Морковь ~40 г',
      'Свёкла ~30 г',
    ],
  },
  {
    id: 'meal-14',
    title: 'Куриная котлета с булгуром и овощами',
    ingredients: 'Куриная котлета, булгур, руккола, томаты, огурцы.',
    category: 'Птица',
    meal: 'Обед',
    at: '2026-07-25T14:20:00',
    kcal: 390,
    protein: 32,
    fat: 12,
    carbs: 38,
    image: '/diary/meals/meal-14.jpg',
    portionItems: [
      'Куриная котлета ~100 г',
      'Булгур ~120 г',
      'Овощной салат ~90 г',
    ],
  },
  {
    id: 'meal-15',
    title: 'Куриная грудка с бататом и салатом',
    ingredients: 'Куриная грудка, батат, кейл, авокадо, редис.',
    category: 'Птица',
    meal: 'Обед',
    at: '2026-07-25T13:10:00',
    kcal: 460,
    protein: 45,
    fat: 18,
    carbs: 28,
    image: '/diary/meals/meal-15.jpg',
    portionItems: [
      'Куриная грудка ~140 г',
      'Батат запечённый ~120 г',
      'Салат с авокадо ~100 г',
    ],
  },
  {
    id: 'meal-16',
    title: 'Запечённая рыба со спаржей и тыквенным супом',
    ingredients: 'Белая рыба, спаржа, тыквенный крем-суп, салат.',
    category: 'Рыба',
    meal: 'Ужин',
    at: '2026-07-24T19:40:00',
    kcal: 420,
    protein: 38,
    fat: 14,
    carbs: 28,
    image: '/diary/meals/meal-16.jpg',
    portionItems: [
      'Белая рыба ~130 г',
      'Спаржа ~80 г',
      'Тыквенный крем-суп ~180 г',
    ],
  },
  {
    id: 'meal-17',
    title: 'Куриная грудка с гречкой и овощами',
    ingredients: 'Куриная грудка, гречка, томаты, огурцы, сыр.',
    category: 'Птица',
    meal: 'Обед',
    at: '2026-07-24T13:55:00',
    kcal: 520,
    protein: 48,
    fat: 12,
    carbs: 52,
    image: '/diary/meals/meal-17.jpg',
    portionItems: [
      'Куриная грудка ~150 г',
      'Гречка ~140 г',
      'Овощи и сыр ~90 г',
    ],
  },
  {
    id: 'meal-18',
    title: 'Гречка с куриной грудкой и перцем',
    ingredients: 'Гречка, куриная грудка, болгарский перец, томаты.',
    category: 'Каша',
    meal: 'Ужин',
    at: '2026-07-23T19:20:00',
    kcal: 470,
    protein: 42,
    fat: 10,
    carbs: 48,
    image: '/diary/meals/meal-18.jpg',
    portionItems: [
      'Гречка ~150 г',
      'Куриная грудка ~130 г',
      'Перец и томаты ~70 г',
    ],
  },
  {
    id: 'meal-19',
    title: 'Курица с гречкой, овощами и соусом',
    ingredients: 'Куриная грудка, гречка, огурцы, томаты, соус.',
    category: 'Каша',
    meal: 'Обед',
    at: '2026-07-23T14:05:00',
    kcal: 430,
    protein: 40,
    fat: 10,
    carbs: 44,
    image: '/diary/meals/meal-19.jpg',
    portionItems: [
      'Куриная грудка ~130 г',
      'Гречка ~130 г',
      'Овощи ~80 г',
      'Соус ~15 г',
    ],
  },
]

export const MEAL_BY_ID = new Map(MEAL_CATALOG.map((meal) => [meal.id, meal]))
