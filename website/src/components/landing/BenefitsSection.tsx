import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, BotMessageSquare, ChartPie, ChartSpline, Layers } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import ScrollRevealText from './ScrollRevealText'

type BenefitItem = {
  title: string
  description: string
  icon: typeof ChartPie
  image: string
  imageDark: string
  imageAlt: string
}

const BENEFITS: BenefitItem[] = [
  {
    title: 'Дневник за день на одном экране',
    description:
      'Видите приёмы пищи, КБЖУ и заметки без таблиц и разрозненных чатов — всё нужное за сегодня собрано в одном спокойном интерфейсе.',
    icon: ChartPie,
    image: '/landing/benefits/image-01.webp',
    imageDark: '/landing/benefits/image-01-dark.webp',
    imageAlt: 'Обзор дневника питания',
  },
  {
    title: 'Планы и дневник рядом',
    description:
      'Недельный план и факт приёмов живут вместе: проще держаться курса и не тратить время на ручные сверки в разных приложениях.',
    icon: BotMessageSquare,
    image: '/landing/benefits/image-02.webp',
    imageDark: '/landing/benefits/image-02-dark.webp',
    imageAlt: 'Планы и дневник',
  },
  {
    title: 'Понятный сценарий день за днём',
    description:
      'Добавляйте приёмы, отмечайте выполненное и двигайтесь по плану без лишней сложности — интерфейс подстраивается под привычный ритм.',
    icon: Layers,
    image: '/landing/benefits/image-03.webp',
    imageDark: '/landing/benefits/image-03-dark.webp',
    imageAlt: 'Простой рабочий сценарий',
  },
  {
    title: 'Ясность для клиента и наставника',
    description:
      'Наставник видит прогресс и может править рацион в том же контуре, а клиент сразу понимает, где он относительно плана.',
    icon: ChartSpline,
    image: '/landing/benefits/image-04.webp',
    imageDark: '/landing/benefits/image-04-dark.webp',
    imageAlt: 'Совместная работа с наставником',
  },
]

type BenefitsSectionProps = {
  signupHref: string
}

function Diamond({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="12"
      viewBox="0 0 10 12"
      width="10"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M5 0L10 6L5 12L0 6L5 0Z" fill="var(--primary)" />
    </svg>
  )
}

function MockCardDecor() {
  return (
    <>
      <Diamond className="absolute top-[1.125rem] left-[1.125rem]" />
      <Diamond className="absolute top-[1.125rem] right-[1.125rem]" />
      <Diamond className="absolute bottom-[1.125rem] left-[1.125rem]" />
      <Diamond className="absolute bottom-[1.125rem] right-[1.125rem]" />
    </>
  )
}

export default function BenefitsSection({ signupHref }: BenefitsSectionProps) {
  const itemRefs = useRef<Array<HTMLDivElement | null>>([])
  const [styles, setStyles] = useState(() =>
    BENEFITS.map(() => ({ opacity: 0.3, y: 30, imageOpacity: 0 })),
  )

  useEffect(() => {
    let frame = 0

    const update = () => {
      const center = window.innerHeight / 2
      const next = BENEFITS.map((_, index) => {
        const el = itemRefs.current[index]
        if (!el) return { opacity: 0.3, y: 30, imageOpacity: 0 }
        const rect = el.getBoundingClientRect()
        const itemCenter = rect.top + rect.height / 2
        const signed = (itemCenter - center) / Math.max(rect.height * 0.55, 1)
        const activation = Math.max(0, 1 - Math.abs(signed))
        return {
          opacity: 0.25 + 0.75 * activation,
          y: Math.sign(signed || 1) * 24 * (1 - activation),
          imageOpacity: activation,
        }
      })
      // Keep at least one preview visible while the section is on screen.
      const maxOpacity = Math.max(...next.map((s) => s.imageOpacity), 0)
      if (maxOpacity < 0.2) {
        const visible = next
          .map((_, index) => {
            const el = itemRefs.current[index]
            if (!el) return { index, dist: Number.POSITIVE_INFINITY }
            const rect = el.getBoundingClientRect()
            return { index, dist: Math.abs(rect.top + rect.height / 2 - center) }
          })
          .sort((a, b) => a.dist - b.dist)[0]
        if (visible && Number.isFinite(visible.dist)) {
          next[visible.index] = {
            ...next[visible.index],
            opacity: Math.max(next[visible.index].opacity, 0.85),
            imageOpacity: Math.max(next[visible.index].imageOpacity, 0.85),
            y: 0,
          }
        }
      }
      setStyles(next)
    }

    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <section
      aria-labelledby="benefits-title"
      className="border-b py-8 sm:py-16 lg:py-24"
      id="benefits"
    >
      <div className="site-container mb-12 space-y-4 text-center sm:mb-16 lg:mb-24">
        <p className="text-sm font-medium tracking-tight text-primary uppercase">Преимущества</p>
        <ScrollRevealText
          as="h2"
          className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
          id="benefits-title"
          text="Как 24nutrition помогает"
          variant="primary"
        />
        <ScrollRevealText
          as="p"
          className="mx-auto max-w-xl text-base leading-7 text-muted-foreground text-pretty sm:text-lg"
          text="Сервис упрощает дневник, недельные планы и работу с наставником — всё в одном месте и без лишней сложности."
          variant="secondary"
        />
        <div className="flex flex-wrap items-center justify-center gap-4 text-center">
          <a
            className={cn(
              buttonVariants({ size: 'lg' }),
              'h-10 gap-2 rounded-lg px-6 text-base ring-2 ring-primary/60',
            )}
            href={signupHref}
          >
            Регистрация
            <ArrowUpRight aria-hidden="true" />
          </a>
          <a
            className={cn(
              buttonVariants({ size: 'lg', variant: 'secondary' }),
              'h-10 gap-2 rounded-lg px-6 text-base ring-2 ring-secondary/60',
            )}
            href="#features"
          >
            Узнать больше
          </a>
        </div>
      </div>

      <div className="site-container relative hidden md:block">
        <div className="grid gap-8 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12">
          <div className="relative w-full space-y-0 py-4">
            {BENEFITS.map((item, index) => {
              const Icon = item.icon
              const style = styles[index]
              return (
                <div
                  key={item.title}
                  ref={(node) => {
                    itemRefs.current[index] = node
                  }}
                  className="flex min-h-[70vh] items-center py-10 lg:min-h-[75vh]"
                  style={{
                    opacity: style.opacity,
                    transform: `translateY(${style.y}px)`,
                  }}
                >
                  <div className="flex w-full max-w-md items-start gap-3">
                    <Icon aria-hidden="true" className="mt-1.5 size-6 shrink-0" />
                    <div className="min-w-0 space-y-2">
                      <ScrollRevealText
                        as="h3"
                        className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-[1.75rem]"
                        text={item.title}
                        variant="secondary"
                      />
                      <p className="text-sm leading-6 text-muted-foreground text-pretty sm:text-[15px]">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="relative hidden md:block">
            {/* Flow: gray panel stays viewport-tall while left copy scrolls */}
            <div className="sticky top-0 z-0 h-svh w-full py-6 lg:py-8">
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-muted px-4 sm:px-6 lg:px-8">
                <div className="relative flex h-[min(31.25rem,72%)] w-full max-w-xl items-center justify-center overflow-hidden rounded-xl border bg-card">
                  {BENEFITS.map((item, index) => (
                    <div
                      key={item.title}
                      className="absolute inset-0 flex items-center justify-center px-3 transition-opacity duration-300"
                      style={{ opacity: styles[index]?.imageOpacity ?? 0 }}
                    >
                      <img
                        alt={item.imageAlt}
                        className="h-full w-full max-w-[27.5rem] object-contain md:max-h-[23.75rem] dark:hidden"
                        src={item.image}
                      />
                      <img
                        alt={item.imageAlt}
                        className="hidden h-full w-full max-w-[27.5rem] object-contain md:max-h-[23.75rem] dark:inline-block"
                        src={item.imageDark}
                      />
                    </div>
                  ))}
                  <MockCardDecor />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="site-container flex flex-col gap-16 md:hidden">
        {BENEFITS.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.title} className="space-y-10">
              <div className="relative overflow-hidden rounded-2xl bg-muted px-4 py-12 sm:px-6">
                <div className="sticky top-28 z-0 flex h-[21.875rem] items-center justify-center overflow-hidden rounded-xl border bg-card">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img
                      alt={item.imageAlt}
                      className="size-full max-h-[17.5rem] max-w-96 object-contain max-sm:max-w-[17.5rem] dark:hidden"
                      src={item.image}
                    />
                    <img
                      alt={item.imageAlt}
                      className="hidden size-full max-h-[17.5rem] max-w-96 object-contain max-sm:max-w-[17.5rem] dark:inline-block"
                      src={item.imageDark}
                    />
                  </div>
                  <MockCardDecor />
                </div>
              </div>
              <div className="flex max-w-md items-start gap-3">
                <Icon aria-hidden="true" className="mt-1.5 size-6 shrink-0" />
                <div className="min-w-0 space-y-2">
                  <ScrollRevealText
                    as="h3"
                    className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-[1.75rem]"
                    text={item.title}
                    variant="secondary"
                  />
                  <p className="text-sm leading-6 text-muted-foreground text-pretty sm:text-[15px]">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
