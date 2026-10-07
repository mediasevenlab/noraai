import { createContext, useContext, type ReactNode } from 'react'

import { useSubscriptionOverview } from './use-subscription-overview'

type SubscriptionAccessValue = ReturnType<typeof useSubscriptionOverview>

const SubscriptionAccessContext = createContext<SubscriptionAccessValue | null>(null)

export function SubscriptionAccessProvider({ children }: { children: ReactNode }) {
  const access = useSubscriptionOverview()
  return <SubscriptionAccessContext.Provider value={access}>{children}</SubscriptionAccessContext.Provider>
}

export function useSubscriptionAccess() {
  const access = useContext(SubscriptionAccessContext)
  if (!access) {
    throw new Error('Subscription access is only available inside the user workspace')
  }
  return access
}
