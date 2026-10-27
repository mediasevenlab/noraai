import { Navigate } from '@tanstack/react-router'
import type { UserDto } from '@web-app-demo/contracts'

import { AtSignIcon, HashIcon, MailIcon, UserRoundIcon } from '@/components/icons'
import { SettingsCanvas, SettingsEntry, SettingsReadRows } from '@/components/settings-canvas'
import { SuggestionsSetting } from '@/features/dialogs'
import { MentorConnectionPanel } from './MentorConnectionPanel'
import { ProfileMobileMasthead } from './ProfileMobileMasthead'
import { ProfilePanel } from './ProfilePanel'
import { ReferralLinkPanel } from './ReferralLinkPanel'
import { ReferralsDirectory } from './ReferralsDirectory'

/** Legacy /app entry — Общее is the user landing. */
export function UserHome() {
  return <Navigate replace to="/app/dialogs" />
}

export function UserProfile({ user }: { user: UserDto }) {
  return (
    <SettingsCanvas
      ctaLabel="Профиль"
      description="Имя и никнейм."
      editable
      eyebrow="Аккаунт"
      lead={<ProfileMobileMasthead user={user} />}
      meta={user.email}
      panelsId="profile-panels"
      title="Профиль"
    >
      <ProfilePanel user={user} />
    </SettingsCanvas>
  )
}

/** Mentor/admin identity profile without the user questionnaire. */
export function AccountProfile({ user }: { user: UserDto }) {
  const roleLabel = user.role === 'admin'
    ? 'Администратор'
    : user.role === 'mentor'
      ? 'Наставник'
      : 'Пользователь'

  return (
    <SettingsCanvas
      description="Основные данные аккаунта рабочей области."
      eyebrow={roleLabel}
      meta={user.email}
      phoneSheet
      showJumpLink={false}
      showMobileTitle
      title="Профиль"
    >
      <SettingsEntry description="Имя, почта и роль." title="Данные аккаунта">
        <SettingsReadRows
          rows={[
            { icon: UserRoundIcon, label: 'Имя', value: user.displayName?.trim() || '—' },
            { icon: MailIcon, label: 'Email', value: user.email },
            { icon: AtSignIcon, label: 'Никнейм', value: user.nickname ?? '—' },
            { icon: HashIcon, label: 'ID', value: String(user.publicId) },
            { icon: UserRoundIcon, label: 'Роль', value: roleLabel },
          ]}
        />
      </SettingsEntry>
    </SettingsCanvas>
  )
}

export function UserSettings({
  user,
}: {
  user: UserDto
}) {
  return (
    <SettingsCanvas
      description="Подключение к наставнику и подсказки под ответами."
      eyebrow="Аккаунт"
      meta={user.email}
      phoneSheet
      showMobileTitle
      title="Настройки"
    >
      <MentorConnectionPanel />
      <SuggestionsSetting />
    </SettingsCanvas>
  )
}

export function UserReferrals({ user }: { user: UserDto }) {
  return (
    <SettingsCanvas
      description="Ссылка, по которой можно пригласить человека."
      descriptionClassName="line-clamp-none max-w-none"
      showJumpLink={false}
      eyebrow=""
      meta={user.email}
      panelsId="referrals-panels"
      phoneSheet
      showMobileTitle
      title="Рефералы"
    >
      <ReferralLinkPanel className="lg:w-[28.8rem]" layout="entry" user={user} />
      <ReferralsDirectory layout="entry" />
    </SettingsCanvas>
  )
}
