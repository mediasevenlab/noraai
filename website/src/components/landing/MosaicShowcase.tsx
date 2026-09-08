import { useReducedMotion } from 'motion/react'

import { cn } from '@/lib/utils'

const TAGS = ['#Клиенты', '#Наставники', '#Занятые', '#Удалёнка'] as const

type PhotoTile = { type: 'photo'; src: string; alt: string }
type IconTile = { type: 'icon'; icon: string; label: string; color: string }
type Tile = PhotoTile | IconTile

/** Habitline mosaic rows — same assets, size, order, and ticker motion. */
const ROW_ONE: Tile[] = [
  { type: 'icon', icon: '/landing/mosaic/icon-phone.svg', label: 'Phone off by 10:30', color: 'rgb(0, 89, 255)' },
  { type: 'photo', src: '/landing/mosaic/tile-journal.jpg', alt: 'Journal' },
  { type: 'icon', icon: '/landing/mosaic/icon-walk.svg', label: 'Morning walk', color: 'rgb(255, 76, 0)' },
  { type: 'photo', src: '/landing/mosaic/tile-water.jpg', alt: 'Water bottle' },
  { type: 'icon', icon: '/landing/mosaic/icon-focus.svg', label: 'Focus session', color: 'rgb(18, 167, 10)' },
  { type: 'photo', src: '/landing/mosaic/tile-meditate.jpg', alt: 'Meditate' },
  { type: 'icon', icon: '/landing/mosaic/icon-stretch.svg', label: 'Stretch for 5 minutes', color: 'rgb(2, 131, 167)' },
  { type: 'photo', src: '/landing/mosaic/tile-thumb.jpg', alt: 'Routine' },
]

const ROW_TWO: Tile[] = [
  { type: 'icon', icon: '/landing/mosaic/icon-workspace.svg', label: 'Clean workspace', color: 'rgb(255, 0, 0)' },
  { type: 'photo', src: '/landing/mosaic/tile-workspace.jpg', alt: 'Workspace' },
  { type: 'icon', icon: '/landing/mosaic/icon-meditate.svg', label: 'Meditate', color: 'rgb(144, 0, 255)' },
  { type: 'photo', src: '/landing/mosaic/tile-stretch.jpg', alt: 'Stretch' },
  { type: 'icon', icon: '/landing/mosaic/icon-water.svg', label: 'Track water', color: 'rgb(0, 34, 255)' },
  { type: 'photo', src: '/landing/mosaic/tile-focus.jpg', alt: 'Focus' },
  { type: 'icon', icon: '/landing/mosaic/icon-journal.svg', label: 'Write journal', color: 'rgb(255, 0, 161)' },
  { type: 'photo', src: '/landing/mosaic/tile-walk.jpg', alt: 'Walk' },
]

function MosaicTile({ tile }: { tile: Tile }) {
  if (tile.type === 'photo') {
    return (
      <div className="landing-mosaic-tile shrink-0 overflow-hidden rounded-[20px] shadow-[0_10px_36px_rgba(0,0,0,0.10)]">
        <img
          alt={tile.alt}
          className="size-full rounded-[20px] object-cover"
          draggable={false}
          src={tile.src}
        />
      </div>
    )
  }

  return (
    <div className="landing-mosaic-tile flex shrink-0 flex-col items-center justify-center gap-3 rounded-[20px] bg-white px-3 text-center shadow-[0_10px_36px_rgba(0,0,0,0.10)]">
      <span
        className="grid size-[50px] place-items-center rounded-full"
        style={{
          backgroundColor: tile.color,
          boxShadow: `0 10px 28px ${tile.color}66`,
        }}
      >
        <img alt="" aria-hidden="true" className="size-6 object-contain" src={tile.icon} />
      </span>
      <span className="max-w-[110px] text-[16px] leading-snug text-[#131515]">{tile.label}</span>
    </div>
  )
}

function MarqueeRow({
  items,
  durationSec,
  reverse = false,
  animate,
}: {
  items: Tile[]
  durationSec: number
  reverse?: boolean
  animate: boolean
}) {
  const loop = [...items, ...items]

  return (
    // py keeps box-shadow inside the clip; negative margin restores Habitline 20px row gap
    <div className="landing-mosaic-row relative w-full overflow-hidden py-9 -my-5">
      <div
        className={cn(
          'landing-mosaic-track flex w-max gap-5',
          animate && (reverse ? 'landing-mosaic-track--reverse' : 'landing-mosaic-track--forward'),
        )}
        style={animate ? { animationDuration: `${durationSec}s` } : undefined}
      >
        {loop.map((tile, index) => (
          <MosaicTile key={`${tile.type}-${index}`} tile={tile} />
        ))}
      </div>
    </div>
  )
}

export default function MosaicShowcase() {
  const reduceMotion = useReducedMotion()
  const animate = !reduceMotion

  return (
    <section
      aria-labelledby="mosaic-title"
      className="border-b pt-28 pb-10 sm:pt-32 sm:pb-16"
      data-landing-nav-compact-trigger
      id="top"
    >
      <div className="site-container text-center">
        <h1
          className="mx-auto max-w-3xl font-heading text-[1.75rem] leading-[1.15] font-medium tracking-tight text-balance sm:text-[2.15rem] sm:leading-[1.12] lg:text-[2.75rem] lg:leading-[1.1]"
          id="mosaic-title"
        >
          Соберите устойчивые{' '}
          <span className="landing-heading-pill inline-block align-middle">
            <img
              alt=""
              aria-hidden="true"
              className="size-full object-cover"
              src="/landing/mosaic/about-1.jpg"
            />
          </span>{' '}
          привычки питания — утро, день{' '}
          <img
            alt=""
            aria-hidden="true"
            className="landing-heading-emoji inline-block align-middle"
            src="/landing/mosaic/heading-cloud.svg"
          />{' '}
          и фокус остаются простыми.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
          Люди используют 24nutrition, чтобы вести дневник и держать ритм без лишней сложности.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {TAGS.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[#efefef] px-3.5 py-1.5 text-sm font-medium text-[#222] dark:bg-muted dark:text-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Habitline mosaic: same content width as landing, soft edges, shadow padding */}
      <div className="site-container relative mt-8 sm:mt-10">
        <div className="landing-mosaic-stage relative flex h-[560px] w-full items-center justify-center sm:h-[640px] lg:h-[720px]">
          <div className="landing-mosaic-viewport absolute inset-x-0 top-1/2 flex w-full -translate-y-1/2 flex-col">
            <MarqueeRow animate={!!animate} durationSec={80} items={ROW_ONE} />
            <MarqueeRow animate={!!animate} durationSec={95} items={ROW_TWO} reverse />
          </div>

          <div className="pointer-events-none relative z-10 flex items-center justify-center">
            <img
              alt="Приложение на телефоне"
              className="h-auto w-[min(58vw,260px)] drop-shadow-[0_24px_60px_rgba(0,0,0,0.28)] sm:w-[300px] lg:w-[340px]"
              draggable={false}
              src="/landing/mosaic/phone.png"
            />
          </div>

          <div
            aria-hidden="true"
            className="landing-mosaic-fade landing-mosaic-fade--left pointer-events-none absolute inset-y-0 left-0 z-20"
          />
          <div
            aria-hidden="true"
            className="landing-mosaic-fade landing-mosaic-fade--right pointer-events-none absolute inset-y-0 right-0 z-20"
          />
        </div>
      </div>
    </section>
  )
}
