import { Navigate } from '@tanstack/react-router'
import type { UserDto } from '@web-app-demo/contracts'

import { userGeneralSearch } from '@/features/navigation'

import { NoraPageHeader, PageContainer } from '@/components/PageLayout'
import { SettingsCanvas } from '@/components/settings-canvas'
import { AccountProfileCard } from './AccountProfileCard'
import { ClientProfileCard, useClientProfileEditor } from './ClientProfileCard'
import { MentorConnectionPanel } from './MentorConnectionPanel'
import { NicknamePanel } from './NicknamePanel'
import { ProfilePanel } from './ProfilePanel'
import { QuestionnaireOnboarding } from './QuestionnaireOnboarding'
import { TelegramUsernamePanel } from './TelegramUsernamePanel'
import { ReferralLinkPanel } from './ReferralLinkPanel'
import { ReferralsDirectory } from './ReferralsDirectory'

/** Legacy /app entry — Общее is the user landing. */
export function UserHome() {
  return <Navigate replace search={userGeneralSearch()} to="/app/general" />
}

export function UserProfile({ user }: { user: UserDto }) {
  const profile = useClientProfileEditor()

  return (
    <SettingsCanvas
      actions={profile.actions}
      ctaLabel="Профиль"
      description="Анкета, которую вы заполнили: пол, цель, активность и ограничения. Пустые необязательные ответы здесь не показываются."
      divided={false}
      eyebrow="Анкета"
      meta={user.email}
      panelsId="profile-panels"
      title="Профиль"
    >
      {profile.isLoading ? (
        <li className="font-[family-name:var(--nora-font)] text-[13px] font-light text-[var(--nora-text-tertiary)] lg:ml-auto lg:w-lg">
          Загрузка анкеты…
        </li>
      ) : profile.isError ? (
        <li className="font-[family-name:var(--nora-font)] text-[13px] text-[var(--nora-error)] lg:ml-auto lg:w-lg">
          Не удалось загрузить анкету.
        </li>
      ) : (
        <ClientProfileCard
          editing={profile.editing}
          layout="entry"
          onChange={profile.onChange}
          user={user}
          values={profile.values}
        />
      )}
      {profile.saveError ? (
        <li className="pt-4 font-[family-name:var(--nora-font)] text-[13px] text-[var(--nora-error)] lg:ml-auto lg:w-lg">
          Не удалось сохранить анкету. Попробуйте ещё раз.
        </li>
      ) : null}
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
        badge="Профиль"
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
      description="Имя, которое видно в рабочей области, публичный никнейм и связь с Telegram собраны в этом разделе. Здесь же можно подключиться к наставнику."
      eyebrow="Аккаунт"
      meta={user.email}
      title="Настройки"
    >
      <ProfilePanel user={user} />
      <NicknamePanel user={user} />
      <TelegramUsernamePanel user={user} />
      <MentorConnectionPanel />
    </SettingsCanvas>
  )
}

export function UserReferrals({ user }: { user: UserDto }) {
  return (
    <SettingsCanvas
      ctaLabel="Рефералы"
      description="Ссылка запоминает людей, которые зарегистрировались по ней. В каталоге видно, кто пришёл, и бонус за каждого."
      eyebrow="Социальная сеть"
      meta={user.email}
      panelsId="referrals-panels"
      title="Рефералы"
    >
      <ReferralLinkPanel layout="entry" user={user} />
      <ReferralsDirectory layout="entry" />
    </SettingsCanvas>
  )
}
