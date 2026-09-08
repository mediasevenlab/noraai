import { UsersIcon } from 'lucide-react'

import { SidebarRelationCard } from '@/components/dashboard/SidebarRelationCard'
import { useMentorUsersQuery } from './queries'

/** Sidebar footer card — total mentees for the mentor role. */
export function MentorMenteesBanner() {
  const usersQuery = useMentorUsersQuery({
    page: 1,
    pageSize: 1,
  })
  const total = usersQuery.data?.total
  if (total == null) return null

  const badge = total > 99 ? '99+' : String(total)

  return (
    <SidebarRelationCard
      actionLabel="Открыть"
      ariaLabel={`Подопечные: ${total}`}
      badge={badge}
      description={
        total === 0
          ? 'Пока никто не подключён. Добавьте пользователя по никнейму или ID.'
          : 'Дневники и рационы тех, кто подключён к вам.'
      }
      href="/mentor/users"
      icon={UsersIcon}
      label="Подопечные"
    />
  )
}
