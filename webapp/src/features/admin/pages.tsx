import type { UserDto } from '@web-app-demo/contracts'

import { NoraPageHeader, PageContainer, PageHeader } from '@/components/PageLayout'
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
    <PageContainer>
      <NoraPageHeader
        badge="Настройки"
        description="Управляйте идентичностью администратора и внешним видом рабочей области."
        showBrand
        title="Настройки"
        titleSize="display"
      />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <NicknamePanel user={user} />
        <AppearancePanel />
      </div>
    </PageContainer>
  )
}
