import { Navigate } from '@tanstack/react-router'
import type { UserDto } from '@web-app-demo/contracts'
import { useState } from 'react'

import { userGeneralSearch } from '@/features/navigation'

import { NoraPageHeader, PageContainer } from '@/components/PageLayout'
import { SettingsCanvas } from '@/components/settings-canvas'
import { AccountProfileCard } from './AccountProfileCard'
import { ClientProfileCard, useClientProfileEditor } from './ClientProfileCard'
import { MentorConnectionPanel } from './MentorConnectionPanel'
import { NicknamePanel } from './NicknamePanel'
import { ProfileMobileMasthead, type ProfileMobileTab } from './ProfileMobileMasthead'
import { ProfilePanel } from './ProfilePanel'
import { QuestionnaireOnboarding } from './QuestionnaireOnboarding'
import { GenerationTokenUsagePanel } from './GenerationTokenUsagePanel'
import { TelegramUsernamePanel } from './TelegramUsernamePanel'
import { ReferralLinkPanel } from './ReferralLinkPanel'
import { ReferralsDirectory } from './ReferralsDirectory'

/** Legacy /app entry — Общее is the user landing. */
export function UserHome() {
  return <Navigate replace search={userGeneralSearch()} to="/app/general" />
}

function ProfileQuestionnaire({ className, user }: { className?: string, user: UserDto }) {
  const profile = useClientProfileEditor()

  if (profile.isLoading) {
    return (
      <li className="font-[family-name:var(--nora-font)] text-[13px] font-light text-[var(--nora-text-tertiary)] lg:ml-auto lg:w-lg">
        Загрузка анкеты…
      </li>
    )
  }

  if (profile.isError) {
    return (
      <li className="font-[family-name:var(--nora-font)] text-[13px] text-[var(--nora-error)] lg:ml-auto lg:w-lg">
        Не удалось загрузить анкету.
      </li>
    )
  }

  return (
    <>
      <ClientProfileCard
        editing={profile.editing}
        layout="entry"
        onChange={profile.onChange}
        sectionClassName={className}
        user={user}
        values={profile.values}
      />
      {profile.saveError ? (
        <li className="pt-4 font-[family-name:var(--nora-font)] text-[13px] text-[var(--nora-error)] lg:ml-auto lg:w-lg">
          Не удалось сохранить анкету. Попробуйте ещё раз.
        </li>
      ) : null}
    </>
  )
}

export function UserProfile({ user }: { user: UserDto }) {
  const [tab, setTab] = useState<ProfileMobileTab>('profile')
  const accountClass = tab === 'questionnaire' ? 'max-lg:hidden' : undefined
  const questionnaireClass = tab === 'profile' ? 'max-lg:hidden' : undefined

  return (
    <SettingsCanvas
      ctaLabel="Профиль"
      description="Имя и никнейм, затем анкета: пол, цель, активность и ограничения."
      divided={false}
      editable
      eyebrow="Аккаунт"
      lead={(
        <ProfileMobileMasthead
          onTab={setTab}
          tab={tab}
          user={user}
        />
      )}
      meta={user.email}
      panelsId="profile-panels"
      title="Профиль"
    >
      <ProfilePanel className={accountClass} user={user} />
      <NicknamePanel className={accountClass} user={user} />
      <ProfileQuestionnaire className={questionnaireClass} user={user} />
    </SettingsCanvas>
  )
}

export function UserOnboarding() {
  return <QuestionnaireOnboarding />
}

/** Mentor/admin identity profile without the user questionnaire. */
export function AccountProfile({
  user,
  showBrand = false,
  titleSize = 'brand',
}: {
  user: UserDto
  showBrand?: boolean
  titleSize?: 'brand' | 'display'
}) {
  return (
    <PageContainer>
      <NoraPageHeader
        description="Основные данные аккаунта рабочей области."
        showBrand={showBrand}
        title="Профиль"
        titleSize={titleSize}
      />
      <div className="max-w-xl">
        <AccountProfileCard user={user} />
      </div>
    </PageContainer>
  )
}

export function UserSettings({
  user,
}: {
  user: UserDto
}) {
  return (
    <SettingsCanvas
      description="Приёмы из Telegram через бота и подключение к наставнику."
      divided={false}
      editable
      eyebrow="Аккаунт"
      meta={user.email}
      phoneSheet
      title="Настройки"
    >
      <TelegramUsernamePanel user={user} />
      <MentorConnectionPanel />
      <GenerationTokenUsagePanel />
    </SettingsCanvas>
  )
}

export function UserReferrals({ user }: { user: UserDto }) {
  return (
    <SettingsCanvas
      ctaLabel="Рефералы"
      description="Ссылка запоминает людей, которые зарегистрировались по ней. В каталоге видно, кто пришёл, и бонус за каждого."
      divided={false}
      eyebrow="Социальная сеть"
      meta={user.email}
      panelsId="referrals-panels"
      phoneSheet
      title="Рефералы"
    >
      <ReferralLinkPanel layout="entry" user={user} />
      <ReferralsDirectory layout="entry" />
    </SettingsCanvas>
  )
}
