import type { UserDto } from '@web-app-demo/contracts'

import { NoraPageHeader, PageContainer, PageHeader } from '@/components/PageLayout'
import { SettingsCanvas } from '@/components/settings-canvas'
import { AppearancePanel } from '@/features/settings'
import { AdminMetrics } from './AdminMetrics'
import { NicknamePanel } from '@/features/users'
import { UserDirectory } from './UserDirectory'

export function AdminDashboard() {
  return (
    <PageContainer>
      <PageHeader
        description="A live overview of accounts and administrator coverage."
        title="Dashboard"
      />
      <AdminMetrics />
    </PageContainer>
  )
}

export function AdminUsers({ currentUser }: { currentUser: UserDto }) {
  return (
    <PageContainer>
      <NoraPageHeader
        badge="Пользователи"
        description="Находите аккаунты и управляйте доступом без раскрытия учётных данных."
        showBrand
        title="Пользователи"
        titleSize="display"
      />
      <UserDirectory currentUser={currentUser} />
    </PageContainer>
  )
}

export function AdminSettings({ user }: { user: UserDto }) {
  return (
    <SettingsCanvas
      description="Имя администратора и тема рабочей области. Оформление можно оставить как в системе или выбрать светлую или тёмную тему."
      eyebrow="Администратор"
      meta={user.email}
      title="Настройки"
    >
      <NicknamePanel user={user} />
      <AppearancePanel />
    </SettingsCanvas>
  )
}
