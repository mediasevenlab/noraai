import type { UserDto } from '@web-app-demo/contracts'
import { CircleCheckIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { FieldDescription } from '@/components/ui/field'
import { SettingsEntry } from '@/components/settings-canvas'
import { cn } from '@/lib/utils'

type ReferralLinkVariant = 'referral' | 'mentor'

const VARIANT_COPY: Record<
  ReferralLinkVariant,
  { title: string; description: string }
> = {
  referral: {
    title: 'Реферальная ссылка',
    description:
      'Чтобы запомнить приглашённых.',
  },
  mentor: {
    title: 'Ссылка для подключения пользователей',
    description:
      'По ссылке пользователи подключатся к вам.',
  },
}

export function ReferralLinkPanel({
  user,
  variant = 'referral',
  layout = 'card',
}: {
  user: UserDto
  variant?: ReferralLinkVariant
  layout?: 'card' | 'entry'
}) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const code = referralCodeForUser(user)
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const referralUrl = `${origin}/?ref=${encodeURIComponent(code)}`
  const copy = VARIANT_COPY[variant]
  const fieldId = variant === 'mentor' ? 'mentor-invite-link' : 'referral-link'
  const isCopied = copyState === 'copied'

  useEffect(() => {
    if (copyState !== 'copied') return
    const timer = window.setTimeout(() => setCopyState('idle'), 2000)
    return () => window.clearTimeout(timer)
  }, [copyState])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }
  }

  const linkField = (
    <div className="grid gap-1.5">
      <button
        aria-describedby={`${fieldId}-hint`}
        aria-label={isCopied ? 'Ссылка скопирована' : 'Скопировать ссылку'}
        className={cn(
          'group relative flex h-8 w-full min-w-0 items-center rounded-[var(--nora-radius-md,8px)] px-3 text-left font-[family-name:var(--nora-font)] text-[13px] outline-none transition-[box-shadow,background-color] duration-[var(--nora-duration,0.15s)]',
          layout === 'entry' ? 'bg-[var(--nora-panel)]' : 'bg-[var(--nora-input-bg)]',
          'cursor-pointer hover:bg-[color-mix(in_srgb,var(--nora-input-bg)_88%,var(--nora-text)_4%)]',
          'focus-visible:bg-[var(--nora-panel)] focus-visible:shadow-[var(--nora-shadow-focus)]',
        )}
        id={fieldId}
        data-settings-field=""
        onClick={() => void copyLink()}
        type="button"
      >
        <span className="min-w-0 flex-1 truncate pr-10 text-[13px] font-normal text-[var(--nora-text)]">
          {referralUrl}
        </span>
        <CircleCheckIcon
          aria-hidden={!isCopied}
          className={cn(
            'pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-green-600 transition-opacity duration-[var(--nora-duration,0.15s)]',
            isCopied ? 'opacity-100' : 'opacity-0',
          )}
        />
      </button>
      <p
        className={
          layout === 'entry'
            ? 'font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]'
            : 'text-[11px] leading-relaxed font-normal text-[var(--nora-text-tertiary)]'
        }
        id={`${fieldId}-hint`}
      >
        {layout === 'entry'
          ? 'Нажмите, чтобы скопировать.'
          : user.nickname
            ? `Никнейм в ссылке: ${user.nickname}. Нажмите на поле, чтобы скопировать.`
            : `Публичный ID в ссылке: ${user.publicId}. Нажмите на поле, чтобы скопировать.`}
      </p>
      {copyState === 'error' ? (
        <FieldDescription className="font-normal text-[var(--nora-error)]">
          Не удалось скопировать. Скопируйте ссылку вручную.
        </FieldDescription>
      ) : null}
    </div>
  )

  if (layout === 'entry') {
    return (
      <SettingsEntry
        badge={variant === 'mentor' ? 'Наставник' : 'Ссылка'}
        description={copy.description}
        title={copy.title}
      >
        {linkField}
      </SettingsEntry>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--nora-radius-lg)] bg-[var(--dash-card-bg,var(--nora-panel))] shadow-[inset_0_0_0_1px_var(--dash-card-ring,var(--nora-border))]">
      <div className="grid gap-3 p-3.5">
        <div className="grid gap-0.5">
          <h2 className="text-[13px] font-semibold text-[var(--nora-text)]">
            {copy.title}
          </h2>
          <p className="text-[11px] leading-relaxed text-[var(--nora-text-tertiary)]">
            {copy.description}
          </p>
        </div>
        {linkField}
      </div>
    </div>
  )
}

export function referralCodeForUser(
  user: Pick<UserDto, 'nickname' | 'publicId'>,
) {
  return user.nickname ?? String(user.publicId)
}
