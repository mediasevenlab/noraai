import { AtSignIcon, MailIcon, UserRoundIcon } from '@/components/icons'
import { SettingsCanvas, SettingsEntry, SettingsReadRows } from '@/components/settings-canvas'

export function MentorMenteeQuestionnaire({
  displayName,
  email,
  nickname,
}: {
  displayName?: string | null
  email?: string | null
  nickname?: string | null
}) {
  return (
    <div className="-mx-3 sm:-mx-6 md:-mx-10 lg:-mx-12">
      <SettingsCanvas
        className="md:pt-2 md:pb-8"
        description="Имя и никнейм."
        eyebrow="Аккаунт"
        meta={email ?? undefined}
        panelsId="mentee-profile"
        showJumpLink={false}
        title="Профиль"
      >
        <SettingsEntry
          description="Имя и никнейм."
          title="Данные профиля"
        >
          <SettingsReadRows
            rows={[
              { icon: UserRoundIcon, label: 'Отображаемое имя', value: displayName?.trim() || email || '—' },
              { icon: MailIcon, label: 'Email', value: email || '—' },
              { icon: AtSignIcon, label: 'Ваш никнейм', value: nickname || '—' },
            ]}
          />
        </SettingsEntry>
      </SettingsCanvas>
    </div>
  )
}
