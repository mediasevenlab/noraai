/** Same soft blue as NoraBadge variant="blue" (tint-dimmed, not opaque fill). */
export const MENTEE_UNREAD_BADGE_CLASS =
  'inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--nora-tint-dimmed)] px-1.5 text-[10px] font-semibold leading-none tracking-tight text-[var(--nora-tint)] tabular-nums'

export function formatMentorUnreadBadge(count: number): string | null {
  if (count <= 0) return null
  if (count > 99) return '99+'
  return String(count)
}
