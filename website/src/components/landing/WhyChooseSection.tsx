import { useRef } from 'react'

import { PinContainer } from '@/components/ui/3d-pin'
import ScrollRevealText from './ScrollRevealText'

const items = [
  {
    number: '01',
    title: 'Быстрый старт',
    description:
      'Зарегистрируйтесь и сразу откройте дневник: первый день питания можно собрать за несколько минут.',
    image: '/landing/why-choose/why-01-frame4.webp',
    imageAlt: 'Интерфейс приложения — быстрый старт',
    imageFirst: true,
  },
  {
    number: '02',
    title: 'Планы и дневник',
    description:
      'Недельный план и факт приёмов в одном месте — без таблиц и переписок в разных чатах.',
    image: '/landing/why-choose/why-02-frame5.webp',
    imageAlt: 'Интерфейс приложения — планы и дневник',
    imageFirst: false,
  },
  {
    number: '03',
    title: 'Наставник рядом',
    description:
      'Получайте рационы и правки от наставника прямо в приложении — клиенту и наставнику удобно работать вместе.',
    image: '/landing/why-choose/why-03-frame6.webp',
    imageAlt: 'Интерфейс приложения — работа с наставником',
    imageFirst: true,
  },
] as const

// The whole block shares one trigger: titles finish as the section enters,
// so they are already readable once the block is on screen.
const headingOffset: ['start 1.12', 'start 0.92'] = ['start 1.12', 'start 0.92']

type WhyChooseSectionProps = {
  href: string
}

export default function WhyChooseSection({ href }: WhyChooseSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)

  return (
    <section
      aria-labelledby="why-title"
      className="relative z-0 h-full overflow-hidden border-b pt-20 pb-16 sm:pt-24 sm:pb-20 lg:pb-24"
      id="why"
      ref={sectionRef}
    >
      <div className="site-container relative">
        <div className="w-full space-y-5 lg:w-3/5">
          <ScrollRevealText
            as="h2"
            className="mb-6 w-full max-w-lg text-left font-heading text-3xl font-semibold tracking-tighter text-balance sm:text-4xl lg:text-5xl"
            id="why-title"
            offset={headingOffset}
            scrollTarget={sectionRef}
            text="Почему 24nutrition?"
            variant="primary"
          />
          <ScrollRevealText
            as="p"
            className="mb-0 max-w-2xl text-base leading-7 text-muted-foreground text-pretty opacity-80 md:mb-20 sm:text-lg"
            text="Спокойный сервис для дневника питания, недельных планов и работы с наставником — без лишней сложности."
            variant="secondary"
          />
        </div>

        <div className="relative mt-6 grid h-[95rem] items-center justify-between gap-3 md:mt-0 md:h-[68rem] md:grid-cols-2 lg:h-[32rem] lg:grid-cols-3">
          {items.map((item) => (
            <PinContainer
              key={item.number}
              containerClassName="h-80 w-full"
              href={href}
              title="Подробнее"
            >
              <div className="group/card relative z-0 w-full rounded-3xl bg-muted/70 p-4">
                <div className="flex flex-col gap-6">
                  <div className={item.imageFirst ? 'order-1' : 'order-1 lg:order-2'}>
                    <img
                      alt={item.imageAlt}
                      className="h-70 w-full rounded-3xl object-cover group-hover/card:shadow-xl"
                      decoding="async"
                      height={945}
                      loading="lazy"
                      src={item.image}
                      width={1212}
                    />
                  </div>
                  <div
                    className={`w-full p-3 ${item.imageFirst ? 'order-2' : 'order-2 lg:order-1'}`}
                  >
                    <p className="inline-flex size-8 items-center justify-center rounded-full bg-background text-xs leading-none font-medium tracking-tight text-muted-foreground">
                      {item.number}
                    </p>
                    <ScrollRevealText
                      as="h3"
                      className="my-3 font-heading text-3xl leading-none font-semibold tracking-tighter"
                      offset={headingOffset}
                      scrollTarget={sectionRef}
                      text={item.title}
                      variant="secondary"
                    />
                    <p className="leading-5 opacity-50">{item.description}</p>
                  </div>
                </div>
              </div>
            </PinContainer>
          ))}
        </div>
      </div>
    </section>
  )
}
