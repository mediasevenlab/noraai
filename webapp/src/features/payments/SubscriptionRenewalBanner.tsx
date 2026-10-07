import { CreditCardIcon } from '@/components/icons'

import { SidebarRelationCard } from '@/components/dashboard/SidebarRelationCard'

import { renewalCountdownLabel } from './model'
import { useSubscriptionAccess } from './subscription-access-context'

const reopen = 'Дневник, каталог и лента снова откроются после оплаты.'

export function subscriptionBannerCopy(notice: 'ending' | 'failed' | 'unpaid', daysLeft: number | null) {
  if (notice === 'ending') {
    return {
      value: renewalCountdownLabel(daysLeft ?? 1),
      description: 'Оплатите сейчас — новый срок начнётся после текущего.',
    }
  }
  if (notice === 'failed') {
    return { value: 'Не списалось', description: reopen }
  }
  return { value: 'Не продлена', description: reopen }
}

/** Sidebar card: countdown without autopay, or a failed charge when autopay is on. */
export function SubscriptionRenewalBanner() {
  const { overview } = useSubscriptionAccess()
  if (!overview?.renewalNotice) return null
  const copy = subscriptionBannerCopy(overview.renewalNotice, overview.daysLeft)

  return (
    <SidebarRelationCard
      actionLabel="Продлить"
      ariaLabel={`Продлить подписку. ${copy.value}`}
      description={copy.description}
      href="/app/payments"
      icon={CreditCardIcon}
      ink
      label="Подписка"
      value={copy.value}
    />
  )
}
