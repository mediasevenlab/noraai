import { Navigate } from '@tanstack/react-router'
import type { UserDto } from '@web-app-demo/contracts'

import { userGeneralSearch } from '@/features/navigation'

import { NoraPageHeader, PageContainer } from '@/components/PageLayout'
import { AccountProfileCard } from './AccountProfileCard'
import { ClientProfileCard, useClientProfileEditor } from './ClientProfileCard'
import { ContactsPlaceholder } from './ContactsPlaceholder'
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
    <PageContainer>
      <NoraPageHeader
        actions={profile.actions}
        badge="Профиль"
        description="Данные анкеты и прогресс заполнения профиля."
        title="Профиль"
      />
      {profile.isLoading ? (
        <p className="text-[12px] text-[var(--nora-text-tertiary)]">Загрузка анкеты…</p>
      ) : profile.isError ? (
        <p className="text-[12px] text-[var(--nora-error)]">
          Не удалось загрузить анкету.
        </p>
      ) : (
        <ClientProfileCard
          editing={profile.editing}
          onChange={profile.onChange}
          user={user}
          values={profile.values}
        />
      )}
      {profile.saveError ? (
        <p className="text-[12px] text-[var(--nora-error)]">
          Не удалось сохранить анкету. Попробуйте ещё раз.
        </p>
      ) : null}
      <p className="text-[11px] leading-relaxed text-[var(--nora-text-tertiary)]">
        Карточка заполняется по мере прохождения опроса. На части шагов можно
        оставить расширенный комментарий — он появится в карточке отдельным
        блоком. Пустые опциональные ответы скрыты.
      </p>
    </PageContainer>
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
    <PageContainer>
      <NoraPageHeader
        badge="Настройки"
        description="Управляйте профилем и подключением к наставнику."
        title="Настройки"
      />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ProfilePanel user={user} />
        <NicknamePanel user={user} />
        <TelegramUsernamePanel user={user} />
        <MentorConnectionPanel />
        <ContactsPlaceholder />
      </div>
    </PageContainer>
  )
}

export function UserReferrals({ user }: { user: UserDto }) {
  return (
    <PageContainer>
      <NoraPageHeader
        badge="Рефералы"
        description="Реферальная ссылка и люди, которые зарегистрировались по ней."
        title="Рефералы"
      />
      <div className="grid gap-4">
        <div className="grid max-w-xl items-start gap-4">
          <ReferralLinkPanel user={user} />
        </div>
        <ReferralsDirectory />
      </div>
    </PageContainer>
  )
}
