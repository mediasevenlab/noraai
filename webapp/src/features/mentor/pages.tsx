import type { UserDto } from '@web-app-demo/contracts'
import type { ReactNode } from 'react'
import {
  noraPageDescriptionClass,
  noraPageTitleClass,
} from '@/components/PageLayout'
import { SettingsCanvas, SettingsEntry, SettingsReadRows } from '@/components/settings-canvas'
import { HashIcon, UserRoundIcon } from '@/components/icons'
import { productFeedPageClass } from '@/components/nora/product-sheet'
import { SuggestionsSetting } from '@/features/dialogs'
import {
  NicknamePanel,
  ProfilePanel,
} from '@/features/users'
import { MentorMenteeQuestionnaire } from './MentorMenteeQuestionnaire'
import { MentorUserDirectory } from './MentorUserDirectory'
import { useMentorUsersQuery } from './queries'

export function MentorHome({ user }: { user: UserDto }) {
  return (
    <MentorHomeShell
      description="Управляйте подключёнными пользователями и настройками наставника."
      title={`Добро пожаловать, ${user.displayName ?? user.email}`}
    />
  )
}

export function MentorUsers({ user }: { user: UserDto }) {
  return (
    <SettingsCanvas
      description="Подключённые пользователи и бонус за каждого."
      eyebrow="Наставник"
      meta={user.email}
      phoneSheet
      showJumpLink={false}
      showMobileTitle
      title="Пользователи"
    >
      <MentorUserDirectory />
    </SettingsCanvas>
  )
}

export function MentorProfile({ user }: { user: UserDto }) {
  return (
    <SettingsCanvas
      ctaLabel="Профиль"
      description="Имя и никнейм в приложении."
      editable
      eyebrow="Аккаунт"
      meta={user.email}
      phoneSheet
      showMobileTitle
      title="Профиль"
    >
      <ProfilePanel user={user} />
      <SettingsEntry description="Роль и номер." title="Аккаунт">
        <SettingsReadRows
          rows={[
            { icon: UserRoundIcon, label: 'Роль', value: 'Наставник' },
            { icon: HashIcon, label: 'ID', value: String(user.publicId) },
          ]}
        />
      </SettingsEntry>
    </SettingsCanvas>
  )
}

export function MentorMenteeDiary({ userId }: { userId: string }) {
  const users = useMentorUsersQuery({
    page: 1,
    pageSize: 100,
  })
  const mentee = users.data?.items.find((item) => item.id === userId)
  const title = mentee?.displayName ?? mentee?.nickname ?? mentee?.email ?? 'Пользователь'

  return (
    <div className={productFeedPageClass}>
      <header className="mb-6">
        <h1 className={noraPageTitleClass}>{title}</h1>
        <p className={noraPageDescriptionClass}>Профиль подключённого пользователя.</p>
      </header>
      <MentorMenteeQuestionnaire
        displayName={mentee?.displayName}
        email={mentee?.email}
        nickname={mentee?.nickname}
      />
    </div>
  )
}

/** @deprecated Use MentorMenteeDiary */
export function MentorMenteePlaceholder({ userId }: { userId: string }) {
  return <MentorMenteeDiary userId={userId} />
}

export function MentorSettings({ user }: { user: UserDto }) {
  return (
    <SettingsCanvas
      description="Имя наставника и подсказки под ответами."
      editable
      eyebrow="Наставник"
      meta={user.email}
      phoneSheet
      showMobileTitle
      title="Настройки"
    >
      <NicknamePanel user={user} />
      <SuggestionsSetting />
    </SettingsCanvas>
  )
}

function MentorHomeShell({
  description,
  title = 'Главная',
  children,
}: {
  description: string
  title?: string
  children?: ReactNode
}) {
  return (
    <div className="news-page relative min-h-full">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(900px 420px at 12% -10%, color-mix(in srgb, var(--nora-tint) var(--dash-glow-tint), transparent), transparent 60%),
            radial-gradient(700px 380px at 90% 0%, color-mix(in srgb, var(--nora-component) var(--dash-glow-component), transparent), transparent 55%),
            linear-gradient(180deg, var(--nora-canvas) 0%, var(--dash-atmosphere-mid) 48%, var(--nora-canvas) 100%)
          `,
        }}
      />
      <div className={productFeedPageClass}>
        <header className="hidden md:block">
          <div className="mb-1.5 flex items-center gap-2">
            <h1 className={noraPageTitleClass}>{title}</h1>
          </div>
          <p className={`mt-1.5 ${noraPageDescriptionClass}`}>{description}</p>
        </header>
        {children}
      </div>
    </div>
  )
}

