import type { RationEntry } from '../src/features/mentor/rations-catalog'

function meal(
  slot: RationEntry['meals'][number]['slot'],
  title: string,
  image: string,
): RationEntry['meals'][number] {
  return {
    slot,
    title,
    ingredients: 'яйца, кабачок, помидор, огурец',
    steps: ['Приготовьте'],
    image,
    kcal: 300,
    protein: 20,
    fat: 10,
    carbs: 15,
  }
}

export const SAMPLE_RATIONS: RationEntry[] = [
  {
    id: 'sample-ration-01',
    title: 'Лёгкий старт',
    description: 'Тестовый день',
    goal: 'Похудение',
    days: 1,
    kcal: 900,
    protein: 60,
    fat: 30,
    carbs: 45,
    mealsPerDay: 3,
    image: '/rations/ration-01.jpg',
    source: 'План',
    meals: [
      meal('Завтрак', 'Овсянка с ягодами', '/rations/ration-01.jpg'),
      meal('Обед', 'Курица с овощами', '/rations/ration-01-2.jpg'),
      meal('Ужин', 'Рыба и салат', '/rations/ration-01-3.jpg'),
    ],
  },
  {
    id: 'sample-ration-02',
    title: 'Набор без срывов',
    description: 'Второй тестовый день',
    goal: 'Набор',
    days: 1,
    kcal: 1200,
    protein: 80,
    fat: 40,
    carbs: 60,
    mealsPerDay: 3,
    image: '/rations/ration-02.jpg',
    source: 'План',
    meals: [
      meal('Завтрак', 'Сырники', '/rations/ration-02.jpg'),
      meal('Обед', 'Паста с индейкой', '/rations/ration-02-2.jpg'),
      meal('Ужин', 'Омлет', '/rations/ration-02-3.jpg'),
    ],
  },
]
