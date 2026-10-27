const SESSION_KEY = 'nora-workspace-open'

export function openingThreadId(userId: string) {
  try {
    if (sessionStorage.getItem(SESSION_KEY) !== '1') return undefined
  } catch {
    return undefined
  }
  return storedOpenThread(userId)
}

export function rememberWorkspaceEntry() {
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    /* a private tab still opens a new chat */
  }
}

export function storedOpenThread(userId: string) {
  try {
    const saved = localStorage.getItem(`dialogs:${userId}:open`)
    if (!saved) return undefined
    const raw = localStorage.getItem(`dialogs:${userId}:threads`)
    const threads = raw ? JSON.parse(raw) as Array<{ remoteId?: string; status?: string }> : []
    return threads.some((item) => item.remoteId === saved && item.status !== 'archived') ? saved : undefined
  } catch {
    return undefined
  }
}

export function rememberOpenThread(userId: string, threadId: string | undefined) {
  if (!threadId) return
  try {
    localStorage.setItem(`dialogs:${userId}:open`, threadId)
  } catch {
    /* the open dialog still stays for this page load */
  }
}
