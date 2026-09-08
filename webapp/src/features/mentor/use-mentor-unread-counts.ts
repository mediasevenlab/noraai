import { useMemo } from 'react'

import { useMentorUnreadMealsQuery } from './queries'

export function useMentorUnreadByUserId(enabled = true) {
  const unread = useMentorUnreadMealsQuery(enabled)

  return useMemo(() => {
    const map = new Map<string, number>()
    for (const item of unread.data?.items ?? []) {
      map.set(item.userId, item.unreadCount)
    }
    return map
  }, [unread.data?.items])
}
