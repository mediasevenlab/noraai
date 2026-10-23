export const STACK_BASE_PATH = '/admin/stack'

export type StackItem = {
  category: string
  title: string
  badge: string
  description: string
}

/** Актуальный стек monorepo Nutrition / vibe template. */
export const STACK_ITEMS: ReadonlyArray<StackItem> = [
  {
    category: 'Frontend · webapp',
    title: 'React 19 + Vite',
    badge: 'CSR',
    description:
      'Клиентское приложение за логином: дашборд, настройки, админка, наставник. Сборка через Vite, маршруты TanStack Router.',
  },
  {
    category: 'Frontend · webapp',
    title: 'TanStack Query / Form / Router',
    badge: 'State',
    description:
      'Серверное состояние, формы и типизированный роутинг без Redux. Контракты API приходят из shared Zod-схем.',
  },
  {
    category: 'UI',
    title: 'Nora UI · shadcn · Base UI',
    badge: 'Design',
    description:
      'Компоненты и токены Nora UI на Base UI + Tailwind v4. Плотность контролов 26px, Lucide-иконки, Inter.',
  },
  {
    category: 'Backend',
    title: 'Bun + Hono',
    badge: 'API',
    description:
      'Монолитный HTTP API на Bun runtime. Модули auth/users по DDD-lite: transport → application → domain → infrastructure.',
  },
  {
    category: 'Backend',
    title: 'Prisma 7 + PostgreSQL 18',
    badge: 'Data',
    description:
      'Схема и миграции Prisma, локальная БД через Docker Compose. Строгие UUIDv7 ID на стороне PostgreSQL 18.',
  },
  {
    category: 'Backend',
    title: 'JWT + Zod OpenAPI',
    badge: 'Auth',
    description:
      'Собственная JWT-сессия (jose), валидация Zod, OpenAPI из Hono. Роли admin / mentor / user.',
  },
  {
    category: 'Contracts',
    title: '@web-app-demo/contracts',
    badge: 'Shared',
    description:
      'Общие Zod-схемы и TypeScript-типы для webapp, backend и website — один контракт на все поверхности.',
  },
  {
    category: 'Website',
    title: 'Astro 7',
    badge: 'SSG',
    description:
      'Публичный сайт: лендинг и SEO-страницы. Static-first; SSR только там, где нужен request-specific рендер.',
  },
  {
    category: 'Tooling',
    title: 'Bun workspaces',
    badge: 'Monorepo',
    description:
      'Единый lockfile и скрипты: typecheck, architecture:check, параллельный dev для webapp / website / backend.',
  },
  {
    category: 'Quality',
    title: 'Playwright + Bun test',
    badge: 'E2E',
    description:
      'E2E веб-потоков на Playwright, unit/integration на Bun test. Архитектурные границы проверяет architecture-check.',
  },
  {
    category: 'Infra',
    title: 'Docker Compose · DigitalOcean',
    badge: 'Ops',
    description:
      'Локальный PostgreSQL в Docker. Прод: App Platform, Managed PostgreSQL, Spaces/CDN — по docs/DEPLOYMENT.md.',
  },
  {
    category: 'Automation',
    title: 'n8n (опционально)',
    badge: 'Flows',
    description:
      'Изолированный docker-compose.n8n.yml для workflow-автоматизации без смешивания с основным runtime.',
  },
]

export const STACK_META = {
  eyebrow: 'Monorepo',
  title: 'Стек',
  subtitle: '4 поверхности',
  description:
    'Технологии NoraAI: webapp, backend, website и shared contracts в одном репозитории — от UI-токенов Nora до PostgreSQL и деплоя.',
  ctaLabel: 'Дизайн-система',
  itemCount: STACK_ITEMS.length,
} as const
