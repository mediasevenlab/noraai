import { useLayoutEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'

import { ChevronRightIcon, CreditCardIcon, XIcon } from '@/components/icons'

import { subscriptionBannerCopy } from './SubscriptionRenewalBanner'
import { localDateKey, subscriptionCapsuleVisible } from './subscription-access'
import { useSubscriptionAccess } from './subscription-access-context'

const DISMISS_KEY = 'nora.subscription-capsule.dismissed-on'

function readDismissedOn() {
  try {
    return window.localStorage.getItem(DISMISS_KEY)
  } catch {
    return null
  }
}

/**
 * Phone bottom bar. Replaces the dock while a renewal notice is due.
 * The menu button stays. A countdown can be closed until the next day.
 */
export function SubscriptionMobileCapsule() {
  const { overview } = useSubscriptionAccess()
  const notice = overview?.renewalNotice ?? null
  const [dismissedOn, setDismissedOn] = useState<string | null>(readDismissedOn)
  const [today, setToday] = useState(() => localDateKey(new Date()))
  const visible = subscriptionCapsuleVisible({ dismissedOn, notice, today })

  useLayoutEffect(() => {
    const syncDay = () => setToday(localDateKey(new Date()))
    document.addEventListener('visibilitychange', syncDay)
    window.addEventListener('focus', syncDay)
    return () => {
      document.removeEventListener('visibilitychange', syncDay)
      window.removeEventListener('focus', syncDay)
    }
  }, [])

  useLayoutEffect(() => {
    if (!visible) {
      document.documentElement.removeAttribute('data-subscription-capsule')
      return
    }
    document.documentElement.setAttribute('data-subscription-capsule', '')
    return () => document.documentElement.removeAttribute('data-subscription-capsule')
  }, [visible])

  if (!visible || !notice) return null

  const copy = subscriptionBannerCopy(notice, overview?.daysLeft ?? null)
  const dismissible = notice === 'ending'

  function dismiss() {
    const day = localDateKey(new Date())
    try {
      window.localStorage.setItem(DISMISS_KEY, day)
    } catch {
      // The reminder stays hidden for this visit even if storage is blocked.
    }
    setDismissedOn(day)
    setToday(day)
  }

  return (
    <div
      className="fixed z-40 flex md:hidden left-4 max-w-[calc(100vw-6.5rem)] bottom-[max(1rem,var(--app-safe-bottom,env(safe-area-inset-bottom)))]"
      data-subscription-capsule=""
    >
      <div className={`flex h-12 min-w-0 items-center rounded-full bg-[var(--nora-text)] p-1 text-[var(--nora-panel)] shadow-[0_1px_2px_rgb(0_0_0/18%),0_8px_20px_rgb(0_0_0/28%)] ${dismissible ? '' : 'pr-3'}`}>
        <Link
          aria-label={`Продлить подписку. ${copy.value}`}
          className="flex min-w-0 items-center gap-2 rounded-full text-[13px] font-medium leading-none text-[var(--nora-panel)] outline-none focus-visible:shadow-[var(--nora-shadow-focus)]"
          to="/app/payments"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--nora-panel)] text-[var(--nora-text)]">
            <CreditCardIcon aria-hidden className="size-[18px]" strokeWidth={1.75} />
          </span>
          <span className="truncate">{copy.value}</span>
          {dismissible ? null : (
            <ChevronRightIcon aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
          )}
        </Link>
        {dismissible ? (
          <button
            aria-label="Скрыть напоминание на сегодня"
            className="ml-1 inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--nora-panel)] outline-none hover:bg-[color-mix(in_srgb,var(--nora-panel)_16%,transparent)] focus-visible:shadow-[var(--nora-shadow-focus)]"
            onClick={dismiss}
            type="button"
          >
            <XIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
          </button>
        ) : null}
      </div>
    </div>
  )
}
