import { useState } from 'react'

import ScrollRevealText from './ScrollRevealText'
import { PixelChevron } from './PixelChevron'
import WaveGradient from './WaveGradient'

const TESTIMONIALS = [
  {
    title: 'Наконец режим, которого хватает',
    quote:
      'Пробовала десятки приложений для питания, но только здесь дневник и планы ощущаются простыми. Онбординг и недельный план помогают держаться без перегруза.',
    name: 'Анна Соколова',
    role: 'Студентка',
    avatar: '/landing/appminimal/avatars/sarah.webp',
    seed: 18,
  },
  {
    title: 'Маленькие шаги — большой эффект',
    quote:
      'Приложение помогло понять привычки и улучшать рацион постепенно каждую неделю. Не резкие перемены, а устойчивый режим, который реально держится.',
    name: 'Алексей Иванов',
    role: 'Фитнес-энтузиаст',
    avatar: '/landing/appminimal/avatars/alex.webp',
    seed: 32,
  },
  {
    title: 'Удобно при плотном графике',
    quote:
      'Между работой и семьёй редко находилось время вести питание. Дневник и планы помогли выстроить режим без лишнего стресса.',
    name: 'Елена Морозова',
    role: 'Проект-менеджер',
    avatar: '/landing/appminimal/avatars/jessica.webp',
    seed: 47,
  },
  {
    title: 'Привычки стали легче',
    quote:
      'Онбординг сразу понял цели и собрал план под мой ритм. Через пару недель я стабильнее следил за рационом и прогрессом.',
    name: 'Михаил Орлов',
    role: 'Разработчик',
    avatar: '/landing/appminimal/avatars/michael.webp',
    seed: 61,
  },
  {
    title: 'Та мотивация, которой не хватало',
    quote:
      'Ежедневный прогресс держал в тонусе. Вместо идеала я сосредоточился на регулярности — и результат пришёл сам.',
    name: 'Екатерина Волкова',
    role: 'Маркетолог',
    avatar: '/landing/appminimal/avatars/emily.webp',
    seed: 74,
  },
  {
    title: 'Просто, чисто и по делу',
    quote:
      'Большинство приложений перегружены. Здесь с первого дня понятно, что делать, и есть ровно то, что нужно для питания и планов.',
    name: 'Даниил Новиков',
    role: 'Продакт-дизайнер',
    avatar: '/landing/appminimal/avatars/daniel.webp',
    seed: 89,
  },
] as const

function TestimonialCard({ item }: { item: (typeof TESTIMONIALS)[number] }) {
  const [hovered, setHovered] = useState(false)

  return (
    <article
      className="landing-testimonial-card group relative flex h-[28rem] w-[20rem] shrink-0 flex-col overflow-hidden rounded-[32px] bg-[#f7f7f7] p-8 sm:h-[30rem] sm:w-[22.5rem] dark:bg-muted"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        aria-hidden="true"
        className="landing-testimonial-wave pointer-events-none absolute inset-0 transition-opacity duration-500 ease-out"
        style={{ opacity: hovered ? 1 : 0 }}
      >
        <WaveGradient active={hovered} seed={item.seed} />
      </div>
      <div className="relative z-10 flex h-full flex-col">
        <h3 className="font-heading text-xl font-semibold tracking-tight text-balance sm:text-2xl">
          {item.title}
        </h3>
        <p className="mt-4 text-sm leading-6 text-foreground/70 text-pretty sm:text-[15px]">
          “{item.quote}”
        </p>
        <div className="mt-auto flex items-center gap-3 pt-8">
          <img
            alt=""
            className="size-10 rounded-full object-cover"
            decoding="async"
            height={160}
            loading="lazy"
            src={item.avatar}
            width={160}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">{item.name}</p>
            <p className="truncate text-sm text-muted-foreground transition-colors duration-300 group-hover:text-[#b45309]">
              {item.role}
            </p>
          </div>
        </div>
      </div>
    </article>
  )
}

export default function TestimonialsSection() {
  const loop = [...TESTIMONIALS, ...TESTIMONIALS]

  return (
    <section
      aria-labelledby="testimonials-title"
      className="overflow-hidden border-b py-20 sm:py-24"
      id="testimonials"
    >
      <div className="site-container">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <div className="max-w-xl space-y-3">
            <p className="flex items-center gap-2 text-sm font-medium tracking-tight text-foreground">
              <span>Отзывы</span>
              <PixelChevron className="h-3 w-[7px] opacity-55" />
            </p>
            <ScrollRevealText
              as="h2"
              className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl"
              id="testimonials-title"
              text="Не верьте нам на слово"
              variant="primary"
            />
          </div>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground text-pretty sm:text-base lg:max-w-xs lg:text-right">
            Почему клиенты и наставники выбирают 24nutrition для дневника питания и планов.
          </p>
        </div>
      </div>

      <div className="landing-testimonials-stage relative mt-12">
        <div className="landing-testimonials-fade landing-testimonials-fade--left" aria-hidden="true" />
        <div className="landing-testimonials-fade landing-testimonials-fade--right" aria-hidden="true" />
        <div className="landing-testimonials-track">
          {loop.map((item, index) => (
            <TestimonialCard item={item} key={`${item.name}-${index}`} />
          ))}
        </div>
      </div>
    </section>
  )
}
