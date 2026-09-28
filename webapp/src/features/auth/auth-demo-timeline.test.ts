import { describe, expect, test } from 'bun:test'

import {
  AUTH_DEMO_CAPTIONS,
  authDraftDemoReadyCaptionAtMs,
  authIntroOpenAtMs,
} from '@/features/diary'
import { authRationAddOpenAtMs } from '@/features/mentor'

import {
  AUTH_DEMO_TIMELINE_GROUPS,
  authDemoActiveStepId,
  authDemoSurfaceWindow,
  authDemoTimelineGroups,
  authDemoTimelineMarks,
} from './auth-demo-timeline'

describe('auth demo timeline marks', () => {
  test('places a chip on each demonstration step in clock order', () => {
    const marks = authDemoTimelineMarks()
    expect(marks[0]).toMatchObject({ id: 'diary', atMs: 0, chip: 'Дневник' })
    expect(marks.find((item) => item.id === 'add')?.atMs).toBe(authIntroOpenAtMs())
    expect(marks.find((item) => item.id === 'ready')?.atMs).toBe(
      authIntroOpenAtMs() + authDraftDemoReadyCaptionAtMs(),
    )
    const readyAt = marks.find((item) => item.id === 'ready')!.atMs
    const nutrientsAt = marks.find((item) => item.id === 'nutrients')!.atMs
    const savedAt = marks.find((item) => item.id === 'saved')!.atMs
    const shareAt = marks.find((item) => item.id === 'share')!.atMs
    const planAt = marks.find((item) => item.id === 'rationAdd')!.atMs
    expect(nutrientsAt).toBeGreaterThan(readyAt + 4 * 420)
    expect(savedAt).toBeGreaterThan(nutrientsAt)
    expect(shareAt).toBeGreaterThan(savedAt)
    expect(planAt).toBeGreaterThan(shareAt)
    expect(marks.find((item) => item.id === 'saved')?.chip).toBe('Избранное')
    expect(marks.find((item) => item.id === 'share')?.chip).toBe('Лента')
    expect(marks.map((item) => item.atMs)).toEqual(
      [...marks.map((item) => item.atMs)].sort((a, b) => a - b),
    )
    expect(new Set(marks.map((item) => item.id)).size).toBe(marks.length)
    for (const item of marks) {
      expect(item.title).toBe(AUTH_DEMO_CAPTIONS[item.id].title)
      expect(item.chip.length).toBeGreaterThan(2)
    }
    expect(marks.at(-1)!.id).toBe('mentorSaved')
    expect(marks.find((item) => item.id === 'mentorCreate')?.chip).toBe('Создать')
    expect(marks.find((item) => item.id === 'mentorEditor')?.chip).toBe('Сборка')
    expect(marks.find((item) => item.id === 'mentorSaved')?.chip).toBe('Отправка')
    expect(marks.at(-1)!.atMs).toBeGreaterThan(60_000)
    expect(marks.at(-1)!.atMs).toBeLessThan(240_000)
    const rationAdd = marks.find((item) => item.id === 'rationAdd')!
    const rationDay = marks.find((item) => item.id === 'rationDay')!
    expect(rationAdd.chip).toBe('В дневник')
    expect(rationDay.chip).toBe('День')
    expect(rationDay.atMs - rationAdd.atMs).toBe(authRationAddOpenAtMs())
  })

  test('highlights the step that the clock is currently in', () => {
    const marks = authDemoTimelineMarks()
    expect(authDemoActiveStepId(0, marks)).toBe('diary')
    expect(authDemoActiveStepId(authIntroOpenAtMs(), marks)).toBe('add')
    expect(authDemoActiveStepId(authIntroOpenAtMs() - 1, marks)).toBe('diary')
    const last = marks.at(-1)!
    const previous = marks.at(-2)!
    expect(authDemoActiveStepId(last.atMs, marks)).toBe(last.id)
    expect(authDemoActiveStepId(last.atMs - 1, marks)).toBe(previous.id)
  })

  test('folds the demo chips into four product steps', () => {
    const marks = authDemoTimelineMarks()
    const groups = authDemoTimelineGroups()
    expect(groups.map((item) => item.chip)).toEqual([
      'Дневник',
      'Лента',
      'План',
      'Наставник',
    ])
    expect(groups.map((item) => item.id)).toEqual([
      'diary',
      'saved',
      'rationAdd',
      'mentorCreate',
    ])
    expect(groups[0]?.atMs).toBe(0)
    expect(groups[1]?.atMs).toBe(marks.find((item) => item.id === 'saved')!.atMs)
    expect(groups[2]?.atMs).toBe(marks.find((item) => item.id === 'rationAdd')!.atMs)
    expect(groups[3]?.atMs).toBe(marks.find((item) => item.id === 'mentorCreate')!.atMs)
    expect(authDemoActiveStepId(groups[1]!.atMs, groups)).toBe('saved')
    expect(authDemoActiveStepId(groups[2]!.atMs - 1, groups)).toBe('saved')
    expect(authDemoActiveStepId(groups[3]!.atMs, groups)).toBe('mentorCreate')
    const covered = new Set(AUTH_DEMO_TIMELINE_GROUPS.flatMap((group) => group.stepIds))
    for (const item of marks) expect(covered.has(item.id)).toBe(true)
  })

  test('keeps diary and feed on login, plan on user signup, mentor on mentor signup', () => {
    const all = authDemoTimelineGroups()
    expect(authDemoTimelineGroups('login').map((item) => item.chip)).toEqual(['Дневник', 'Лента'])
    expect(authDemoTimelineGroups('signup-user').map((item) => item.chip)).toEqual(['План'])
    expect(authDemoTimelineGroups('signup-mentor').map((item) => item.chip)).toEqual(['Наставник'])
    expect(authDemoTimelineGroups('signup-user')[0]?.atMs).toBe(0)
    expect(authDemoTimelineGroups('signup-mentor')[0]?.atMs).toBe(0)

    const login = authDemoSurfaceWindow('login')
    expect(login.startMs).toBe(0)
    expect(login.endMs).toBe(all.find((item) => item.id === 'rationAdd')!.atMs)

    const originUser = all.find((item) => item.id === 'rationAdd')!.atMs
    const signupUser = authDemoSurfaceWindow('signup-user')
    expect(signupUser.startMs).toBe(0)
    expect(signupUser.endMs).toBe(all.find((item) => item.id === 'mentorCreate')!.atMs - originUser)

    const signupMentor = authDemoSurfaceWindow('signup-mentor')
    expect(signupMentor.startMs).toBe(0)
    expect(signupMentor.endMs).toBe(Number.POSITIVE_INFINITY)
  })
})
