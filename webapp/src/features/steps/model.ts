export const STEPS_BASE_PATH = '/admin/steps'

export type StepItem = {
  category: string
  title: string
  badge: string
  description: string
  href?: string
}

/** Product version log for /admin/steps. Append on significant product work; see docs/PRODUCT_VERSIONS.md. */
export const STEP_ITEMS: ReadonlyArray<StepItem> = [
  {
    category: 'Версия · v0.1',
    title: 'Vibe base',
    badge: 'Foundation',
    description:
      'Стартовая точка — шаблон vibe (di-sukharev/vibe): monorepo webapp + backend + website + contracts, JWT-auth, PostgreSQL и базовая админка.',
    href: 'https://github.com/di-sukharev/vibe',
  },
  {
    category: 'Версия · v0.2',
    title: 'Роли и рефералы',
    badge: 'Product',
    description:
      'Роли admin / mentor / user, наставничество, никнеймы, публичные ID и реферальные ссылки. Регистрация создаёт только user; admin назначается отдельно, mentor привязывает подопечных.',
  },
  {
    category: 'Версия · v0.3',
    title: 'n8n automation',
    badge: 'Automation',
    description:
      'Опциональный контур n8n через отдельный docker-compose: workflow-автоматизация рядом с приложением, без смешивания с основным runtime.',
  },
  {
    category: 'Версия · v0.4',
    title: 'Nora UI',
    badge: 'Design',
    description:
      'Дизайн-система Nora UI: токены, плотность контролов, разделы Demo / Design / Components / Blocks и обновлённый shell рабочего пространства.',
  },
  {
    category: 'Версия · v0.5',
    title: 'Раздел «Новости»',
    badge: 'News',
    description:
      'У пользователя и наставника в меню появился раздел «Новости». Сначала он пустой: лента собирается из добавленных Telegram-каналов.',
  },
  {
    category: 'Версия · v0.6',
    title: 'Каналы Telegram',
    badge: 'News',
    description:
      'В «Новости» можно добавить ссылки на каналы и задать период «от» и «до». Посты публикуются только из каналов, которые есть в этом списке.',
  },
  {
    category: 'Версия · v0.7',
    title: 'Выгрузка постов',
    badge: 'News',
    description:
      '«Выгрузить» забирает посты за выбранные даты. Карточка открывает пост: сначала фото или видео, потом текст. Повтор не создаёт дубль, а корзина удаляет пост совсем.',
  },
  {
    category: 'Версия · v0.8',
    title: 'Группы и закладки',
    badge: 'News',
    description:
      'Меню «Группы» оставляет ленту одного канала. Пост можно положить в закладки и скопировать ссылку. «Избранное» показывает только отмеченные.',
  },
]

export function stepVersion(item: StepItem): string {
  return item.category.match(/v\d+\.\d+/)?.[0] ?? ''
}

export function ruStepCountLabel(count: number): string {
  const abs = Math.abs(count) % 100
  const digit = abs % 10
  if (abs > 10 && abs < 20) return `${count} шагов`
  if (digit === 1) return `${count} шаг`
  if (digit >= 2 && digit <= 4) return `${count} шага`
  return `${count} шагов`
}

const currentVersion = stepVersion(STEP_ITEMS[STEP_ITEMS.length - 1]!)

export const STEPS_META = {
  eyebrow: 'Roadmap',
  title: 'Разработка',
  subtitle: ruStepCountLabel(STEP_ITEMS.length),
  description:
    'Версионная история 24nutrition: путь продукта от шаблона до текущей версии. Что появилось в каждой версии, записано в списке.',
  ctaLabel: 'Стек',
  itemCount: STEP_ITEMS.length,
  historyLabel: `${ruStepCountLabel(STEP_ITEMS.length)} в истории`,
  currentVersion,
} as const
