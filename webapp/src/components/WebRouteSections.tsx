import {
  ShieldUserIcon,
  TriangleAlertIcon,
  FileQuestionIcon,
  type LucideIcon,
} from '@/components/icons'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useDismissAppBootSplash } from '@/platform/app-boot-splash'

import type { WorkspaceRoutePath } from '@/features/navigation'

type HomeDestination = '/login' | WorkspaceRoutePath

export function SessionLoadingSection() {
  useDismissAppBootSplash()
  return (
    <RouteStateCard
      description="Проверяем сессию…"
      icon={ShieldUserIcon}
      title="Загрузка рабочего пространства"
    >
      <Spinner />
    </RouteStateCard>
  )
}

export function SessionErrorSection({ retry }: { retry: () => Promise<void> }) {
  useDismissAppBootSplash()
  const [retryPending, setRetryPending] = useState(false)

  async function retrySession() {
    setRetryPending(true)
    try {
      await retry()
    } catch {
      // The existing session error remains visible and retryable.
    } finally {
      setRetryPending(false)
    }
  }

  return (
    <RouteStateCard
      alert
      description="Не удалось проверить сессию. Проверьте соединение и попробуйте снова."
      icon={TriangleAlertIcon}
      title="Проверка сессии временно недоступна"
    >
      <Button
        className="h-9 px-3 text-xs font-medium"
        disabled={retryPending}
        onClick={() => void retrySession()}
        type="button"
      >
        {retryPending ? 'Повторяем…' : 'Повторить'}
      </Button>
    </RouteStateCard>
  )
}

export function NotFoundSection({ destination }: { destination: HomeDestination }) {
  useDismissAppBootSplash()
  const authenticated = destination !== '/login'

  return (
    <RouteStateCard
      description="Запрошенная страница не существует или была перемещена."
      icon={FileQuestionIcon}
      title="Страница не найдена"
    >
      <Button
        className="h-9 px-3 text-xs font-medium"
        nativeButton={false}
        render={
          authenticated
            ? <Link to={destination} />
            : <Link search={{ returnTo: undefined }} to="/login" />
        }
      >
        {authenticated ? 'Вернуться в кабинет' : 'Вернуться ко входу'}
      </Button>
    </RouteStateCard>
  )
}

function RouteStateCard({
  alert = false,
  children,
  description,
  icon: Icon,
  title,
}: {
  alert?: boolean
  children: ReactNode
  description: string
  icon: LucideIcon
  title: string
}) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[var(--nora-canvas,#eeeeee)] p-5 font-[family-name:var(--nora-font)]">
      <div
        aria-live={alert ? 'assertive' : undefined}
        className="flex w-full max-w-[22rem] flex-col items-center gap-5 rounded-[var(--nora-radius-lg,10px)] bg-[var(--nora-panel,#ffffff)] px-6 py-8 text-center shadow-[inset_0_0_0_1px_var(--nora-border,rgba(0,0,0,0.08))]"
        role={alert ? 'alert' : undefined}
      >
        <Icon
          aria-hidden
          className="size-9 text-[var(--nora-text-dimmed)]"
          strokeWidth={1.5}
        />
        <div className="flex max-w-[18rem] flex-col items-center gap-2">
          <h1 className="font-heading text-[20px] leading-[1.3] font-semibold tracking-[-0.01em] text-[var(--nora-text)] text-balance">
            {title}
          </h1>
          <p className="text-[13px] leading-relaxed font-normal text-[var(--nora-text-secondary)] text-pretty">
            {description}
          </p>
        </div>
        <div className="flex w-full flex-col items-center">{children}</div>
      </div>
    </main>
  )
}
