import {
  GalleryVerticalEndIcon,
  MoonIcon,
  SunIcon,
} from '@/components/icons'
import { useTheme } from 'next-themes'
import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import {
  authDemoSurfaceWindow,
  type AuthDemoSurface,
} from '../auth-demo-timeline'
import { AuthMealCarousel } from './AuthMealCarousel'
import { useDismissAppBootSplash } from '@/platform/app-boot-splash'
import {
  AuthDemoPlaybackProvider,
  authDemoKickCatchup,
  authDemoReleaseSeek,
  useAuthDemoPlayback,
  useAuthDemoRemountHold,
} from '@/features/diary'

import { Button } from '@/components/ui/button'
import { SmokeBackground } from '@/components/ui/spooky-smoke-animation'
import { cn } from '@/lib/utils'

/** Layout size where the open sheet keeps the same proportions as the cards. */
const PHONE_EMBED_WIDTH = 440
const PHONE_EMBED_HEIGHT = 720

function phoneEmbedFitActive(plain: boolean) {
  return plain && typeof window !== 'undefined' && window.innerHeight < 640
}

function PhoneEmbedFrame({ active, children }: { active: boolean; children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState({ scale: 1, left: 0, top: 0 })

  useEffect(() => {
    if (!active) return
    const host = hostRef.current
    if (!host) return
    const update = () => {
      const box = host.getBoundingClientRect()
      if (box.width < 1 || box.height < 1) return
      const scale = Math.min(box.width / PHONE_EMBED_WIDTH, box.height / PHONE_EMBED_HEIGHT)
      setFit({
        scale,
        left: (box.width - PHONE_EMBED_WIDTH * scale) / 2,
        top: (box.height - PHONE_EMBED_HEIGHT * scale) / 2,
      })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(host)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [active])

  if (!active) return children

  return (
    <div ref={hostRef} className="absolute inset-0 z-[1]">
      <div
        className="absolute"
        style={{
          width: PHONE_EMBED_WIDTH,
          height: PHONE_EMBED_HEIGHT,
          left: fit.left,
          top: fit.top,
          transform: `scale(${fit.scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function AuthDemoStage({
  fittedPhone = false,
  surface,
  plain = false,
}: {
  fittedPhone?: boolean
  surface: AuthDemoSurface
  plain?: boolean
}) {
  const playback = useAuthDemoPlayback()
  const generation = playback?.generation ?? 0
  const remountHold = useAuthDemoRemountHold()

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      authDemoKickCatchup()
    })
    return () => window.cancelAnimationFrame(id)
  }, [generation])

  useEffect(() => {
    if (remountHold || generation === 0) return
    let inner = 0
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => {
        authDemoReleaseSeek()
      })
    })
    return () => {
      window.cancelAnimationFrame(outer)
      window.cancelAnimationFrame(inner)
    }
  }, [generation, remountHold])

  return (
    <div className="relative h-full w-full">
      <div
        className={cn(
          'absolute inset-0 flex h-full w-full justify-center',
          remountHold && !plain && 'invisible',
        )}
      >
        <AuthMealCarousel
          fittedPhone={fittedPhone}
          key={generation}
          plain={plain}
          surface={surface}
        />
      </div>
    </div>
  )
}

function AuthThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      aria-label={isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
      className={cn(
        'size-8 rounded-full bg-[var(--nora-panel)] text-[var(--nora-text-secondary)] shadow-[inset_0_0_0_1px_var(--nora-border)] hover:bg-[color-mix(in_srgb,var(--nora-text)_6%,var(--nora-panel))] hover:text-[var(--nora-text)]',
        className,
      )}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      size="icon"
      type="button"
      variant="ghost"
    >
      {isDark ? (
        <SunIcon aria-hidden className="size-3.5" />
      ) : (
        <MoonIcon aria-hidden className="size-3.5" />
      )}
    </Button>
  )
}

export function AuthDemoPanel({
  surface = 'login',
  className,
  showThemeToggle = true,
  plain = false,
  autoplay = true,
}: {
  surface?: AuthDemoSurface
  className?: string
  showThemeToggle?: boolean
  /** Landing embed: hide captions and pull side cards in. Smoke stays in this document so iOS paints the frame. */
  plain?: boolean
  /** When false, the clock stays at the first frame until playFrom. */
  autoplay?: boolean
}) {
  const surfaceWindow = authDemoSurfaceWindow(surface)
  const [fittedPhone, setFittedPhone] = useState(() => phoneEmbedFitActive(plain))

  useEffect(() => {
    if (!plain) return
    const update = () => setFittedPhone(phoneEmbedFitActive(true))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [plain])

  return (
    <AuthDemoPlaybackProvider
      autoplay={autoplay}
      endMs={surfaceWindow.endMs}
      key={surface}
      startMs={surfaceWindow.startMs}
    >
      <section
        className={cn('relative overflow-hidden bg-black', className)}
        data-auth-demo-plain={plain ? '' : undefined}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-black">
          <SmokeBackground className="size-full" smokeColor="#0099ff" />
        </div>
        <PhoneEmbedFrame active={fittedPhone}>
          <div
            className={cn(
              'relative z-[1] flex h-full flex-col',
              fittedPhone
                ? 'h-full w-full'
                : 'min-h-svh px-6 pb-16 pt-6 md:px-10 md:pb-20 md:pt-10',
            )}
          >
            <div className="flex min-h-0 flex-1 justify-center">
              <AuthDemoStage fittedPhone={fittedPhone} plain={plain} surface={surface} />
            </div>
          </div>
        </PhoneEmbedFrame>
        {showThemeToggle ? (
          <div className="absolute top-6 right-6 z-10 flex items-center gap-1.5 md:top-10 md:right-10">
            <AuthThemeToggle className="bg-[var(--nora-panel)]/80 shadow-[inset_0_0_0_1px_var(--nora-border,rgba(0,0,0,0.08))] backdrop-blur-sm hover:bg-[var(--nora-panel)]" />
          </div>
        ) : null}
      </section>
    </AuthDemoPlaybackProvider>
  )
}

export function AuthPageShell({
  children,
  surface = 'login',
}: {
  children: ReactNode
  surface?: AuthDemoSurface
}) {
  useDismissAppBootSplash()

  return (
    <main className="relative grid min-h-svh lg:grid-cols-2">
      <section className="flex flex-col gap-6 p-6 md:p-10">
        <div className="flex h-8 items-center justify-start gap-2">
          <Link
            className="flex items-center gap-2.5"
            search={{ returnTo: undefined }}
            to="/login"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GalleryVerticalEndIcon aria-hidden className="size-4" />
            </span>
            <span className="font-[family-name:var(--nora-font)] text-sm font-medium tracking-tight text-[var(--nora-text)]">
              Nutrition
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[22rem]">{children}</div>
        </div>
      </section>
      <AuthDemoPanel className="hidden lg:block" surface={surface} />
      <div className="absolute top-6 right-6 z-10 md:top-10 md:right-10 lg:hidden">
        <AuthThemeToggle />
      </div>
    </main>
  )
}
