export function isAuthSessionPending({
  isRefreshing,
  accessToken,
  user,
  meError,
}: {
  isRefreshing: boolean
  accessToken: string | null
  user: unknown
  meError: unknown
}) {
  if (isRefreshing) return true
  if (accessToken && !user && !meError) return true
  return false
}
