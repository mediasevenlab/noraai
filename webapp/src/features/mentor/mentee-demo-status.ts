/** Demo-only activity signal for mentor sidebar until real tracking ships. */
export type MenteeActivity = 'green' | 'yellow' | 'red'

export type MenteeDemoStatus = {
  activity: MenteeActivity
  /** Unreviewed meal entries for the mentor (demo count). */
  unreadMeals: number
}

const ACTIVITY_ORDER: MenteeActivity[] = ['green', 'yellow', 'red']

const activityIconClass: Record<MenteeActivity, string> = {
  green: 'text-[#248a3d]',
  yellow: 'text-[#c98700]',
  red: 'text-[#c9224d]',
}

const activityLabel: Record<MenteeActivity, string> = {
  green: 'активен',
  yellow: 'средняя активность',
  red: 'низкая активность',
}

function hashUserId(userId: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < userId.length; index += 1) {
    hash ^= userId.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Stable demo status derived from mentee id (not persisted). */
export function demoMenteeNavStatus(userId: string): MenteeDemoStatus {
  const seed = hashUserId(userId)
  const activity = ACTIVITY_ORDER[seed % 3]!
  const base = (seed >>> 5) % 7
  const unreadMeals =
    activity === 'red' ? base + 3 : activity === 'yellow' ? base + 1 : base
  return { activity, unreadMeals }
}

export function menteeActivityIconClass(activity: MenteeActivity): string {
  return activityIconClass[activity]
}

export function menteeActivityLabel(activity: MenteeActivity): string {
  return activityLabel[activity]
}
