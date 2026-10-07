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
      <div className="max-lg:px-3.5">
        <NoraPageHeader
          description="Поиск аккаунтов и смена ролей."
          title="Пользователи"
          titleSize="display"
        />
      </div>
      <UserDirectory currentUser={currentUser} />
    </PageContainer>
  )
}

export function AdminSettings({ user }: { user: UserDto }) {
  return (
    <SettingsCanvas
      description="Имя администратора и тема рабочей области. Оформление можно оставить как в системе или выбрать светлую или тёмную тему."
      editable
      eyebrow="Администратор"
      meta={user.email}
      phoneSheet
      showMobileTitle
      title="Настройки"
    >
      <NicknamePanel user={user} />
      <AppearancePanel />
    </SettingsCanvas>
  )
}
