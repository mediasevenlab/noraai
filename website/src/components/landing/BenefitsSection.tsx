import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowUpRight, BotMessageSquare, ChartPie, Layers } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import ScrollRevealText from './ScrollRevealText'
import { SmokeBackground } from './SmokeBackground'

type BenefitItem = {
  title: string
  description: string
  icon: typeof ChartPie
}

const BENEFITS: BenefitItem[] = [
  {
    title: 'Приём пищи с фото или голоса',
    description:
      'Откройте карточку и пришлите снимок тарелки, пару слов или голосовое — блюдо, калории и состав появятся без таблиц и взвешивания.',
    icon: ChartPie,
  },
  {
    title: 'Рацион на выбранные дни',
    description:
      'Возьмите готовый план и отметьте дни недели. Меню встанет туда, куда нужно, а свободные дни останутся вашими.',
    icon: BotMessageSquare,
  },
  {
    title: 'Наставник собирает рацион',
    description:
      'Название, короткое описание и дни — в одной карточке. Клиент получает готовый план, без таблиц и правок в чатах.',
    icon: Layers,
  },
]

type BenefitsSectionProps = {
  signupHref: string
  demoSrcs: string[]
}

function DiaryDemo({
  active,
  frameStyle,
  src,
}: {
  active: boolean
  frameStyle?: CSSProperties
  src: string
}) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const activeRef = useRef(active)
  activeRef.current = active

  const post = (type: 'auth-demo-pause' | 'auth-demo-restart') => {
    const frame = frameRef.current?.contentWindow
    if (!frame) return
    let origin = '*'
    try {
      origin = new URL(src, window.location.href).origin
    } catch {
      origin = '*'
    }
    frame.postMessage({ type }, origin)
  }

  useEffect(() => {
    post(active ? 'auth-demo-restart' : 'auth-demo-pause')
  }, [active, src])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'auth-demo-ready') return
      if (event.source !== frameRef.current?.contentWindow) return
      post(activeRef.current ? 'auth-demo-restart' : 'auth-demo-pause')
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [src])

  return (
    <iframe
      ref={frameRef}
      className="pointer-events-none block size-full border-0 bg-transparent"
      scrolling="no"
      src={src}
      style={frameStyle ?? { width: '100%', height: '100%' }}
      tabIndex={-1}
      title="Дневник питания"
    />
  )
}

export default function BenefitsSection({ signupHref, demoSrcs }: BenefitsSectionProps) {
  const itemRefs = useRef<Array<HTMLDivElement | null>>([])
  const mobileRefs = useRef<Array<HTMLElement | null>>([])
  const [styles, setStyles] = useState(() =>
    BENEFITS.map(() => ({ opacity: 0.3, y: 30, imageOpacity: 0 })),
  )
  const [demoActive, setDemoActive] = useState<boolean[]>(() => BENEFITS.map(() => false))
  const [wide, setWide] = useState(false)

  const noteDemo = (index: number, opacity: number) => {
    setDemoActive((current) => {
      const playing = current[index] ?? false
      // Start once the block is clearly the one on screen, and keep it
      // until it has actually left, so the three demos never run together.
      const nextPlaying = playing ? opacity >= 0.45 : opacity >= 0.8
      if (nextPlaying === playing) return current
      const next = current.slice()
      next[index] = nextPlaying
      return next
    })
  }

  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)')
    const apply = () => setWide(query.matches)
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (!wide) return
    styles.forEach((style, index) => noteDemo(index, style.imageOpacity))
  }, [styles, wide])

  useEffect(() => {
    if (wide) return
    const nodes = mobileRefs.current.filter((node): node is HTMLElement => node != null)
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number(entry.target.getAttribute('data-benefit'))
          if (!Number.isInteger(index)) continue
          const ratio = entry.isIntersecting ? entry.intersectionRatio : 0
          noteDemo(index, ratio >= 0.55 ? 1 : ratio > 0.15 ? 0.2 : 0)
        }
      },
      { threshold: [0, 0.15, 0.55] },
    )
    for (const node of nodes) observer.observe(node)
    return () => observer.disconnect()
  }, [wide])

  useEffect(() => {
    let frame = 0

    const update = () => {
      const center = window.innerHeight / 2
      const next = BENEFITS.map((_, index) => {
        const el = itemRefs.current[index]
        if (!el) return { opacity: 0.3, y: 30, imageOpacity: 0 }
        const rect = el.getBoundingClientRect()
        const itemCenter = rect.top + rect.height / 2
        const span = Math.max(rect.height, 1)
        const signed = (itemCenter - center) / (span * 0.55)
        const activation = Math.max(0, 1 - Math.abs(signed))
        const distance = Math.abs(itemCenter - center)
        // Hold the preview solid, then crossfade near the next block
        // so the panel does not sit gray for most of the scroll.
        const fadeStart = span * 0.42
        const fadeEnd = span * 0.58
        const imageOpacity =
          distance <= fadeStart
            ? 1
            : distance >= fadeEnd
              ? 0
              : 1 - (distance - fadeStart) / (fadeEnd - fadeStart)
        return {
          opacity: 0.25 + 0.75 * activation,
          y: Math.sign(signed || 1) * 24 * (1 - activation),
          imageOpacity,
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
              'h-10 gap-2 rounded-lg px-6 text-sm',
            )}
            href={signupHref}
          >
            Регистрация
            <ArrowUpRight aria-hidden="true" />
          </a>
          <a
            className={cn(
              buttonVariants({ size: 'lg', variant: 'secondary' }),
              'h-10 gap-2 rounded-lg px-6 text-sm',
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
              <div className="relative h-full w-full overflow-hidden rounded-2xl bg-black">
                <div aria-hidden className="pointer-events-none absolute inset-0">
                  <SmokeBackground className="size-full" smokeColor="#0099ff" />
                </div>
                {demoSrcs.map((src, index) => (
                  <div
                    key={src}
                    className="absolute inset-0 z-[1] p-4 sm:p-5"
                    style={{ opacity: styles[index]?.imageOpacity ?? 0 }}
                  >
                    <div className="size-full overflow-hidden">
                      {wide ? <DiaryDemo active={demoActive[index] ?? false} src={src} /> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="site-container flex flex-col gap-16 md:hidden">
        {BENEFITS.map((item, index) => {
          const Icon = item.icon
          return (
            <div
              key={item.title}
              className="space-y-10"
              data-benefit={index}
              ref={(node) => {
                mobileRefs.current[index] = node
              }}
            >
              <div
                className="relative h-[34rem] overflow-hidden rounded-2xl bg-black"
                style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
              >
                <div aria-hidden className="pointer-events-none absolute inset-0">
                  <SmokeBackground className="size-full" smokeColor="#0099ff" />
                </div>
                <div className="absolute inset-1 z-[1]">
                  {!wide ? (
                    <DiaryDemo
                      active={demoActive[index] ?? false}
                      src={demoSrcs[index] ?? ''}
                    />
                  ) : null}
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
