/** Clock label for a model run, in seconds the person waited. */
export function reasoningClock(ms: number) {
  const seconds = Math.max(0, Math.round(ms / 1000))
  if (seconds < 60) return `${seconds} с`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest === 0 ? `${minutes} мин` : `${minutes} мин ${rest} с`
}

export function reasoningStatusLabel(ms: number, running: boolean, searched = false) {
  const base = reasoningStatusBase(ms, running)
  return searched ? `${base} · искала в интернете` : base
}

function reasoningStatusBase(ms: number, running: boolean) {
  if (running && ms < 1000) return 'Думает…'
  const clock = reasoningClock(ms)
  return running ? `Думает · ${clock}` : ms < 1000 ? 'Думала меньше секунды' : `Думала ${clock}`
}
