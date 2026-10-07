import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/features/auth'
import { ApiRequestError } from '@/platform/api'

import { readSubscriptionOverview, type SubscriptionOverview } from './api'

export function useSubscriptionOverview() {
  const { transport, user } = useAuth()
  const [overview, setOverview] = useState<SubscriptionOverview | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!user) return
    try {
      setOverview(await readSubscriptionOverview(transport))
      setError(null)
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : 'Не удалось загрузить платежи.')
    }
  }, [transport, user])

  useEffect(() => {
    void reload()
  }, [reload])

  return { error, overview, reload }
}
