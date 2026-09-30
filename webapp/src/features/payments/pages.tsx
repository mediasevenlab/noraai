import { NoraEmpty } from '@/components/nora/primitives'
import { NoraPageHeader, PageContainer } from '@/components/PageLayout'

function SubscriptionPaymentsPage() {
  return (
    <PageContainer>
      <NoraPageHeader
        description="Оплата сервиса ещё не подключена."
        title="Подписка"
      />
      <NoraEmpty
        description="История списаний и карта появятся здесь, когда биллинг будет готов. Сейчас это не счёт и не способ оплаты."
        title="Оплата пока недоступна"
      />
    </PageContainer>
  )
}

export function UserPayments() {
  return <SubscriptionPaymentsPage />
}

export function MentorPayments() {
  return <SubscriptionPaymentsPage />
}
