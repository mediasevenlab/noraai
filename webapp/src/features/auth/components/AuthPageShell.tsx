import {
  GalleryVerticalEndIcon,
  MoonIcon,
  SunIcon,
} from '@/components/icons'
import { useTheme } from 'next-themes'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { useDismissAppBootSplash } from '@/platform/app-boot-splash'
import { Button } from '@/components/ui/button'
import { SmokeBackground } from '@/components/ui/spooky-smoke-animation'
import { cn } from '@/lib/utils'

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

export function AuthPageShell({ children }: { children: ReactNode }) {
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
              NoraAI
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[22rem]">{children}</div>
        </div>
      </section>
      <section className="relative hidden overflow-hidden bg-black lg:block">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-black">
          <SmokeBackground className="size-full" smokeColor="#0099ff" />
        </div>
        <div className="absolute top-6 right-6 z-10 md:top-10 md:right-10">
          <AuthThemeToggle className="bg-[var(--nora-panel)]/80 shadow-[inset_0_0_0_1px_var(--nora-border,rgba(0,0,0,0.08))] backdrop-blur-sm hover:bg-[var(--nora-panel)]" />
        </div>
      </section>
      <div className="absolute top-6 right-6 z-10 md:top-10 md:right-10 lg:hidden">
        <AuthThemeToggle />
      </div>
    </main>
  )
}
