import * as React from 'react'
import {
  BookmarkIcon,
  BookOpenIcon,
  CalendarIcon,
  CalendarPlusIcon,
  CameraIcon,
  ChefHatIcon,
  CircleCheckIcon,
  CircleIcon,
  ClipboardListIcon,
  FileTextIcon,
  ImageIcon,
  LeafIcon,
  PlusIcon,
  Share2Icon,
  ShoppingBagIcon,
  TargetIcon,
  UtensilsCrossedIcon,
  ZapIcon,
  type LucideIcon,
} from '@/components/icons'

import {
  authDemoClear,
  authDemoTimeout,
  useAuthDemoPlayback,
  type AuthDemoCaptionId,
} from '@/features/diary'
import { cn } from '@/lib/utils'

import {
  AUTH_DEMO_FEATURE_MOCK_IMAGE,
  AUTH_DEMO_MARQUEE,
  AUTH_DEMO_MARQUEE_CAPTIONS,
  authDemoDiaryFeatureCards,
  authDemoMarqueeIsFeatureGrid,
  authDemoMarqueeLeaveAtMs,
  authDemoMarqueePressAtMs,
  authDemoMarqueePressEndAtMs,
  authDemoMarqueeRowDirection,
  authDemoMarqueeRows,
  type AuthDemoMarqueeCard,
  type AuthDemoMarqueeDirection,
  type AuthDemoMarqueeFeature,
} from '../auth-demo-feature-marquee'

const CARD_ICONS = {
  diary: BookOpenIcon,
  add: PlusIcon,
  photos: CameraIcon,
  analyze: ZapIcon,
  ready: UtensilsCrossedIcon,
  nutrients: LeafIcon,
  saved: BookmarkIcon,
  share: Share2Icon,
  ration: ClipboardListIcon,
  rationFilter: TargetIcon,
  rationMeals: ImageIcon,
  rationCook: ChefHatIcon,
  rationShop: ShoppingBagIcon,
  rationAdd: CalendarPlusIcon,
  rationDay: CalendarIcon,
  planChosen: CircleCheckIcon,
  dayNorm: TargetIcon,
  planMeal: CircleIcon,
  shopping: ShoppingBagIcon,
  planDone: CircleCheckIcon,
  mentorCreate: PlusIcon,
  mentorEditor: FileTextIcon,
  mentorSaved: ClipboardListIcon,
} satisfies Record<AuthDemoCaptionId, LucideIcon>

const CARD_ACCENTS = {
  diary: 'var(--nora-tint)',
  add: 'var(--nora-tint)',
  photos: 'var(--nora-tint)',
  analyze: 'var(--nora-warning)',
  ready: 'var(--nora-success)',
  nutrients: 'var(--nora-success)',
  saved: 'var(--nora-badge-purple-text)',
  share: 'var(--nora-badge-purple-text)',
  ration: 'var(--nora-success)',
  rationFilter: 'var(--nora-success)',
  rationMeals: 'var(--nora-success)',
  rationCook: 'var(--nora-warning)',
  rationShop: 'var(--nora-warning)',
  rationAdd: 'var(--nora-success)',
  rationDay: 'var(--nora-success)',
  planChosen: 'var(--nora-tint)',
  dayNorm: 'var(--nora-success)',
  planMeal: 'var(--nora-warning)',
  shopping: 'var(--nora-warning)',
  planDone: 'var(--nora-success)',
  mentorCreate: 'var(--nora-component)',
  mentorEditor: 'var(--nora-component)',
  mentorSaved: 'var(--nora-component)',
} satisfies Record<AuthDemoCaptionId, string>

function FeatureGridCard({
  card,
  className,
  focusing,
  pressed,
}: {
  card: AuthDemoMarqueeCard
  className?: string
  focusing: boolean
  pressed: boolean
}) {
  const Icon = CARD_ICONS[card.id]
  const featured = Boolean(card.featured)
  const dimOthers = focusing && !featured
  return (
    <div
      className={cn(
        'relative flex min-h-0 overflow-hidden',
        featured
          ? 'auth-demo-feature-mock h-full min-h-[22rem] flex-col justify-between p-5'
          : 'flex-1 items-center gap-3 px-3.5 py-3 backdrop-blur-xl',
        'rounded-[20px] transition-[filter,opacity,transform,box-shadow] duration-300 ease-out',
        featured && pressed && 'scale-[0.96]',
        dimOthers && 'pointer-events-none blur-[2px] opacity-35',
        className,
      )}
      data-auth-demo-feature-mock={featured ? '' : undefined}
      data-auth-demo-feature-tone={featured ? 'featured' : 'muted'}
      data-auth-demo-marquee-feature={featured ? card.id : undefined}
      data-demo-pressed={featured && pressed ? '' : undefined}
      style={
        featured
          ? undefined
          : {
              background: 'rgba(255,255,255,0.1)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)',
              backdropFilter: 'blur(20px)',
            }
      }
    >
      {featured ? (
        <img alt="" src={AUTH_DEMO_FEATURE_MOCK_IMAGE} />
      ) : null}
      <span
        className={cn(
          'relative z-[2] flex shrink-0 items-center justify-center rounded-[12px]',
          featured ? 'size-10' : 'size-9',
        )}
        style={{
          background: featured ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)',
          color: featured ? '#fff' : 'rgba(255,255,255,0.78)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22)',
        }}
      >
        <Icon
          aria-hidden
          className={featured ? 'size-5' : 'size-4'}
          strokeWidth={1.8}
        />
      </span>
      <span className="relative z-[2] min-w-0">
        <span
          className={cn(
            'block truncate font-semibold tracking-[-0.02em]',
            featured ? 'text-[18px] leading-6 text-white' : 'text-[13px] leading-4 text-white/92',
          )}
        >
          {card.title}
        </span>
        <span
          className={cn(
            'mt-0.5 block truncate leading-4',
            featured ? 'text-[13px] text-white/78' : 'text-[12px] text-white/48',
          )}
        >
          {card.subtitle}
        </span>
      </span>
    </div>
  )
}

function FeatureGrid({
  cards,
  focusing,
  pressed,
}: {
  cards: readonly AuthDemoMarqueeCard[]
  focusing: boolean
  pressed: boolean
}) {
  const featured = cards.find((item) => item.featured)
  const muted = cards.filter((item) => !item.featured)
  if (!featured) return null
  return (
    <div
      className="mx-auto flex w-full max-w-[40rem] items-stretch gap-3"
      data-auth-demo-feature-grid=""
    >
      <FeatureGridCard
        card={featured}
        className="min-w-0 flex-[1.25]"
        focusing={focusing}
        pressed={pressed}
      />
      <div className="flex w-[15.5rem] shrink-0 flex-col gap-2.5">
        {muted.map((item) => (
          <FeatureGridCard
            card={item}
            focusing={focusing}
            key={item.id}
            pressed={pressed}
          />
        ))}
      </div>
    </div>
  )
}

function MarqueeCard({
  card,
  focusing,
  pressed,
}: {
  card: AuthDemoMarqueeCard
  focusing: boolean
  pressed: boolean
}) {
  const Icon = CARD_ICONS[card.id]
  const dimOthers = focusing && !card.featured
  const compact = card.title.length + card.subtitle.length <= 22
  return (
    <div
      className={cn(
        'relative isolate flex min-h-[4.5rem] shrink-0 items-center gap-3.5 overflow-hidden rounded-2xl px-4 py-3',
        compact ? 'w-[16.5rem]' : 'w-[18rem]',
        card.featured
          ? 'bg-[var(--nora-panel)] text-[var(--nora-text)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--nora-border)_88%,transparent),0_3px_10px_rgba(0,0,0,0.14),0_14px_34px_rgba(0,0,0,0.22)]'
          : 'bg-[color-mix(in_srgb,var(--nora-panel)_42%,var(--nora-canvas))] text-[var(--nora-text-secondary)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--nora-border)_55%,transparent)]',
        'transition-[filter,opacity,transform,background-color] duration-300 ease-out',
        card.featured &&
          'relative z-10 transition-transform duration-[140ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
        card.featured && pressed && 'scale-[0.96]',
        dimOthers && 'pointer-events-none blur-[3px] opacity-40',
      )}
      data-auth-demo-marquee-feature={card.featured ? card.id : undefined}
      data-demo-pressed={card.featured && pressed ? '' : undefined}
      style={{
        '--auth-demo-marquee-accent': CARD_ACCENTS[card.id],
      } as React.CSSProperties}
    >
      <span
        className="relative z-[1] flex size-10 shrink-0 items-center justify-center rounded-[13px]"
        style={{
          background: card.featured
            ? 'color-mix(in srgb, var(--auth-demo-marquee-accent) 12%, var(--nora-canvas))'
            : 'color-mix(in srgb, var(--nora-text) 8%, var(--nora-canvas))',
          boxShadow: card.featured
            ? 'inset 0 0 0 1px color-mix(in srgb, var(--auth-demo-marquee-accent) 7%, var(--nora-border)), inset 0 1px 0 color-mix(in srgb, white 24%, transparent)'
            : 'inset 0 0 0 1px color-mix(in srgb, var(--nora-border) 70%, transparent)',
          color: card.featured
            ? 'var(--auth-demo-marquee-accent)'
            : 'var(--nora-text-tertiary)',
        }}
      >
        <Icon aria-hidden className="size-[17px]" strokeWidth={1.9} />
      </span>
      <span className="relative z-[1] min-w-0 flex-1 text-left">
        <span
          className={cn(
            'block truncate font-[family-name:var(--nora-font)] text-sm font-semibold leading-5 tracking-[-0.01em]',
            card.featured ? 'text-[var(--nora-text)]' : 'text-[var(--nora-text-secondary)]',
          )}
        >
          {card.title}
        </span>
        <span
          className={cn(
            'mt-0.5 block truncate text-[12px] leading-[1.15rem]',
            card.featured
              ? 'text-[var(--nora-text-secondary)]'
              : 'text-[var(--nora-text-tertiary)]',
          )}
        >
          {card.subtitle}
        </span>
      </span>
    </div>
  )
}

function MarqueeRow({
  cards,
  direction,
  durationSec,
  offsetSec,
  paused,
  focusing,
  pressed,
  reduceMotion,
}: {
  cards: AuthDemoMarqueeCard[]
  direction: AuthDemoMarqueeDirection
  durationSec: number
  offsetSec: number
  paused: boolean
  focusing: boolean
  pressed: boolean
  reduceMotion: boolean
}) {
  const track = (
    <div className="flex gap-3 pr-3">
      {cards.map((item) => (
        <MarqueeCard
          card={item}
          focusing={focusing}
          key={item.id}
          pressed={pressed}
        />
      ))}
    </div>
  )
  return (
    <div className="overflow-hidden py-5" data-auth-demo-marquee-row={direction}>
      <div
        className="flex w-max will-change-transform [transform:translateZ(0)]"
        style={
          reduceMotion
            ? undefined
            : {
                animationName:
                  direction === 'left' ? 'auth-demo-marquee-left' : 'auth-demo-marquee-right',
                animationDuration: `${durationSec}s`,
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite',
                animationFillMode: 'backwards',
                animationPlayState: paused ? 'paused' : 'running',
                animationDelay: `${-offsetSec}s`,
              }
        }
      >
        {track}
        <div aria-hidden>{track}</div>
      </div>
    </div>
  )
}

export function AuthDemoFeatureMarquee({
  feature = 'diary',
  /** Wall clock keeps choreography alive while demo playback is paused (feed bridge). */
  clock = 'demo',
  onHandoff,
  onFinished,
}: {
  feature?: AuthDemoMarqueeFeature
  clock?: 'demo' | 'wall'
  onHandoff: () => void
  onFinished: () => void
}) {
  const playback = useAuthDemoPlayback()
  const paused = clock === 'wall' ? false : (playback?.paused ?? false)
  const [focusing, setFocusing] = React.useState(false)
  const [pressed, setPressed] = React.useState(false)
  const [leaving, setLeaving] = React.useState(false)
  const [captionShown, setCaptionShown] = React.useState(false)
  const [reduceMotion, setReduceMotion] = React.useState(false)
  const handoffRef = React.useRef(onHandoff)
  const finishedRef = React.useRef(onFinished)
  handoffRef.current = onHandoff
  finishedRef.current = onFinished

  React.useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  React.useEffect(() => {
    if (reduceMotion) {
      setCaptionShown(true)
      return
    }
    const id = window.setTimeout(() => setCaptionShown(true), 30)
    return () => window.clearTimeout(id)
  }, [reduceMotion])

  React.useEffect(() => {
    const focusAt = reduceMotion ? 80 : AUTH_DEMO_MARQUEE.settleMs
    const pressAt = reduceMotion ? 160 : authDemoMarqueePressAtMs()
    const pressEndAt = reduceMotion
      ? pressAt + 80
      : authDemoMarqueePressEndAtMs()
    const leaveAt = reduceMotion ? pressEndAt + 120 : authDemoMarqueeLeaveAtMs()
    const fadeMs = reduceMotion ? 80 : AUTH_DEMO_MARQUEE.fadeMs
    const schedule = (fn: () => void, ms: number) =>
      clock === 'wall' ? window.setTimeout(fn, ms) : authDemoTimeout(fn, ms)
    const clear = (id: number) => {
      if (clock === 'wall') window.clearTimeout(id)
      else authDemoClear(id)
    }
    let wallDone = 0
    const timers = [
      schedule(() => setFocusing(true), focusAt),
      schedule(() => setPressed(true), pressAt),
      schedule(() => setPressed(false), pressEndAt),
      schedule(() => {
        setLeaving(true)
        handoffRef.current()
        wallDone = window.setTimeout(() => finishedRef.current(), fadeMs)
      }, leaveAt),
    ]
    return () => {
      for (const id of timers) clear(id)
      if (wallDone) window.clearTimeout(wallDone)
    }
  }, [clock, reduceMotion])

  const isFeatureGrid = authDemoMarqueeIsFeatureGrid(feature)
  const featureCards = React.useMemo(
    () => (isFeatureGrid ? authDemoDiaryFeatureCards() : []),
    [isFeatureGrid],
  )
  const rows = React.useMemo(
    () => (isFeatureGrid ? [] : authDemoMarqueeRows(feature)),
    [feature, isFeatureGrid],
  )
  const caption = AUTH_DEMO_MARQUEE_CAPTIONS[feature]

  return (
    <div
      className={cn(
        'mx-auto flex h-full w-full max-w-[54rem] flex-col justify-center',
        isFeatureGrid ? 'px-1' : 'gap-20',
        'transition-[opacity,transform,filter] ease-[cubic-bezier(0.22,1,0.36,1)]',
        leaving && 'pointer-events-none scale-[0.96] opacity-0 blur-[8px]',
      )}
      data-auth-demo-marquee=""
      data-auth-demo-marquee-kind={feature}
      style={{ transitionDuration: `${AUTH_DEMO_MARQUEE.fadeMs}ms` }}
    >
      {isFeatureGrid ? (
        <FeatureGrid
          cards={featureCards}
          focusing={focusing}
          pressed={pressed}
        />
      ) : (
        <>
          <div
            className={cn(
              'max-w-[26rem] py-1',
              !reduceMotion && 'transition-[opacity,transform] duration-[340ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
              captionShown ? 'translate-y-0 opacity-100' : '-translate-y-1.5 opacity-0',
            )}
            data-auth-demo-marquee-caption=""
          >
            <div className="min-w-0">
              <h2 className="font-heading text-[20px] leading-[1.3] font-semibold tracking-[-0.01em] text-white text-balance [text-shadow:0_1px_18px_rgba(0,0,0,0.4)]">
                {caption.title}
              </h2>
              <p className="mt-1.5 font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-white/78 text-pretty [text-shadow:0_1px_14px_rgba(0,0,0,0.35)]">
                {caption.body}
              </p>
            </div>
          </div>
          <div className="auth-demo-marquee-mask flex flex-col gap-1">
            {rows.map((cards, index) => (
              <MarqueeRow
                cards={cards}
                direction={authDemoMarqueeRowDirection(index)}
                durationSec={AUTH_DEMO_MARQUEE.rowDurationsSec[index] ?? 28}
                key={cards.map((item) => item.id).join('-')}
                offsetSec={AUTH_DEMO_MARQUEE.rowOffsetsSec[index] ?? 0}
                focusing={focusing}
                paused={paused}
                pressed={pressed}
                reduceMotion={reduceMotion}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
