import {
  UserPlusIcon,
  UsersIcon,
  ShieldUserIcon,
} from '@/components/icons'

import { SectionCards } from '@/components/dashboard'
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { SectionLoading } from '@/components/nora/product-sheet'
import { useAdminDashboardQuery } from './queries'

export function AdminMetrics() {
  const query = useAdminDashboardQuery()

  if (query.isPending) {
    return <SectionLoading label="Загрузка сводки" />
  }

  if (query.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Dashboard is unavailable</AlertTitle>
        <AlertDescription>{query.error.message}</AlertDescription>
        <AlertAction>
          <Button onClick={() => void query.refetch()} size="sm" type="button" variant="outline">
            Try again
          </Button>
        </AlertAction>
      </Alert>
    )
  }

  return (
    <SectionCards
      items={[
        {
          description: 'All registered accounts.',
          icon: UsersIcon,
          label: 'Total users',
          value: query.data.totalUsers.toLocaleString(),
        },
        {
          description: 'Accounts with administrator access.',
          icon: ShieldUserIcon,
          label: 'Administrators',
          value: query.data.totalAdmins.toLocaleString(),
        },
        {
          description: 'Accounts created during the last seven days.',
          icon: UserPlusIcon,
          label: 'New in 7 days',
          value: query.data.newUsersLast7Days.toLocaleString(),
        },
      ]}
    />
  )
}
