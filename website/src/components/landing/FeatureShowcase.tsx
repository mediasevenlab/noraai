import { cn } from '@/lib/utils'
import { PixelChevron, PixelChevronButton } from './PixelChevron'
import ScrollRevealText from './ScrollRevealText'

const FEATURE_CARDS = [
  {
    label: '01 — Персональные цели',
    image: '/landing/appminimal/feature-01.png',
    imageAlt: 'Экран выбора уровня активности',
    title: 'Начните с целей, которые вам подходят',
    description:
      'Ведите дневник питания, следите за прогрессом и держите привычки в одном спокойном приложении для повседневной жизни.',
  },
  {
    label: 'Профиль — 02',
    image: '/landing/appminimal/feature-02.png',
    imageAlt: 'Экран роста и веса',
    title: 'Соберите план вокруг своего тела',
    description:
      'Соберите ключевые данные о себе и получите рекомендации, которые подходят именно вашему сценарию.',
  },
  {
    label: '03 — Планы и рационы',
    image: '/landing/appminimal/feature-03.png',
    imageAlt: 'Экран плана питания',
    title: 'Держите неделю под контролем',
    description:
      'Собирайте недельные планы, копируйте дни и работайте с наставником без таблиц и хаоса в чатах.',
    wide: true,
  },
] as const

function FeatureLabel({ text }: { text: string }) {
  return (
    <p className="relative z-10 flex items-center gap-2 text-sm font-medium tracking-tight text-foreground">
      <span>{text}</span>
      <PixelChevron className="h-3 w-[7px] opacity-55" />
    </p>
  )
}

function FeatureCard({
  card,
}: {
  card: (typeof FEATURE_CARDS)[number]
}) {
  const wide = 'wide' in card && card.wide

  return (
    <article
      className={cn(
        'group relative flex min-h-[36rem] flex-col rounded-[28px] bg-[#f7f7f7] p-6 sm:min-h-[40rem] sm:rounded-[32px] sm:p-8 dark:bg-muted',
        wide && 'lg:col-span-2 lg:min-h-[42rem]'
      )}
    >
      <FeatureLabel text={card.label} />

      <div
        className={cn(
          'relative mx-auto mt-5 w-full max-w-[300px] flex-1 sm:max-w-[340px]',
          wide && 'sm:max-w-[380px]'
        )}
      >
        <div
          className={cn(
            'landing-feature-phone relative mx-auto h-full min-h-[24rem] w-full overflow-hidden sm:min-h-[28rem]',
            wide && 'sm:min-h-[30rem]'
          )}
        >
          <img
            alt={card.imageAlt}
            className="absolute inset-x-0 top-0 mx-auto h-full w-auto max-w-full object-contain object-top"
            decoding="async"
            height={1734}
            loading="lazy"
            src={card.image}
            width={854}
          />
        </div>
      </div>

      <div className="relative z-10 mt-auto flex items-end justify-between gap-4 pt-2">
        <div className={cn('min-w-0 space-y-2', wide ? 'max-w-xl' : 'max-w-md')}>
          <h3 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-[1.75rem]">
            {card.title}
          </h3>
          <p className="text-sm leading-6 text-muted-foreground text-pretty sm:text-[15px]">
            {card.description}
          </p>
        </div>
        <PixelChevronButton className="transition-transform duration-200 group-hover:translate-x-0.5" />
      </div>
    </article>
  )
}

export default function FeatureShowcase() {
  return (
    <section
      aria-labelledby="features-title"
      className="border-b py-20 sm:py-24"
      id="features"
    >
      <div className="site-container">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <div className="max-w-xl space-y-3">
            <FeatureLabel text="Возможности" />
            <ScrollRevealText
              as="h2"
              className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl"
              id="features-title"
              text="Всё, что нужно, чтобы держаться плана"
              variant="primary"
            />
          </div>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground text-pretty sm:text-base lg:max-w-xs lg:text-right">
            Инструменты для дневника питания, планов и работы с наставником — чтобы проще держать привычки и быстрее видеть прогресс.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-2 lg:gap-6">
          {FEATURE_CARDS.map((card) => (
            <FeatureCard card={card} key={card.label} />
          ))}
        </div>
      </div>
    </section>
  )
}
