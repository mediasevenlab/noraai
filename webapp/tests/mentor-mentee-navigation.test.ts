import { readFileSync } from 'node:fs'

import { expect, test } from 'bun:test'

import { formatMentorUnreadBadge } from '../src/features/mentor/unread-badge'
import { filterMentorUsersByQuery } from '../src/features/mentor/MentorMenteeNavigation'
import { useMentorUnreadByUserId } from '../src/features/mentor/use-mentor-unread-counts'

test('mentor users nav matches app group chrome without a tree rail', () => {
  const source = readFileSync(
    new URL('../src/features/mentor/MentorMenteeNavigation.tsx', import.meta.url),
    'utf8',
  )
  const trigger = source.slice(
    source.indexOf('<SidebarGroupLabel'),
    source.indexOf('<CollapsibleContent>'),
  )

  expect(source).toContain('SidebarGroupLabel')
  expect(trigger).toContain('Пользователи')
  expect(trigger.indexOf('Пользователи')).toBeLessThan(trigger.indexOf('ChevronRightIcon'))
  expect(source).not.toContain('border-l border-sidebar-foreground/15')
  expect(source).not.toContain('font-semibold')
  expect(source).toContain('filterMentorUsersByQuery')
  expect(source).toContain('useSidebarSearchQuery')
  expect(source).toContain('useMentorUnreadByUserId')
  expect(source).toContain('MENTEE_UNREAD_BADGE_CLASS')
  expect(source).toContain('formatMentorUnreadBadge')
  expect(source).toContain('Никого не найдено')
  expect(source).toContain('open={searching || open}')
})

test('mentor sidebar search does not hide overview or app sections', () => {
  const shell = readFileSync(
    new URL('../src/components/WorkspaceShell.tsx', import.meta.url),
    'utf8',
  )
  const sidebar = readFileSync(
    new URL('../src/components/dashboard/AppSidebar.tsx', import.meta.url),
    'utf8',
  )
  const appNav = readFileSync(
    new URL('../src/features/mentor/MentorMealPlanNavigation.tsx', import.meta.url),
    'utf8',
  )

  expect(shell).toContain('filterNavigationBySearch={user.role !== \'mentor\'}')
  expect(sidebar).toContain('filterNavigationBySearch')
  expect(appNav).not.toContain('useFilteredBySidebarSearch')
  expect(appNav).toContain('to="/mentor/plans"')
  expect(appNav).toContain('aria-label="Планы"')
  expect(appNav).not.toContain('Приложение')
  expect(appNav).not.toContain('Дневные рационы')
})

test('mentor users nav can load without a diary import cycle', () => {
  expect(typeof filterMentorUsersByQuery).toBe('function')
  expect(typeof useMentorUnreadByUserId).toBe('function')
})

test('mentor sidebar search matches connected users by name, nickname, or email', () => {
  const users = [
    { displayName: 'Дмитрий Резанов', nickname: 'drez', email: 'rezanovdv@mail.ru' },
    { displayName: 'Татьяна Ивлева', nickname: 'tanya', email: 'ivleva@example.com' },
    { displayName: null, nickname: 'user', email: 'user@nora.com' },
  ]
  expect(filterMentorUsersByQuery(users, '  дмитр  ').map((user) => user.email)).toEqual([
    'rezanovdv@mail.ru',
  ])
  expect(filterMentorUsersByQuery(users, 'TANYA').map((user) => user.nickname)).toEqual(['tanya'])
  expect(filterMentorUsersByQuery(users, 'nora.com').map((user) => user.email)).toEqual([
    'user@nora.com',
  ])
  expect(filterMentorUsersByQuery(users, 'xyz')).toEqual([])
  expect(filterMentorUsersByQuery(users, '  ')).toHaveLength(3)
})

test('unread badge hides zero and caps at 99+', () => {
  expect(formatMentorUnreadBadge(0)).toBeNull()
  expect(formatMentorUnreadBadge(-1)).toBeNull()
  expect(formatMentorUnreadBadge(1)).toBe('1')
  expect(formatMentorUnreadBadge(12)).toBe('12')
  expect(formatMentorUnreadBadge(99)).toBe('99')
  expect(formatMentorUnreadBadge(100)).toBe('99+')
})

test('mentee workspace menu includes diary, questionnaire and plan', () => {
  const pages = readFileSync(
    new URL('../src/features/mentor/pages.tsx', import.meta.url),
    'utf8',
  )
  expect(pages).toContain("{ value: 'diary', label: 'Дневник' }")
  expect(pages).toContain("{ value: 'questionnaire', label: 'Анкета' }")
  expect(pages).not.toContain("{ value: 'rations', label: 'Рационы' }")
  expect(pages).toContain("{ value: 'plan', label: 'План' }")
  expect(pages).toContain("next === 'plan'")
  expect(pages).toContain("view === 'plan'")
  expect(pages).toContain('planView')
  const workspace = readFileSync(
    new URL('../src/pages.tsx', import.meta.url),
    'utf8',
  )
  expect(workspace).toContain('<MenteeAssignedPlans')
})

test('mentor diary marks visible mentee meal cards as viewed', () => {
  const pages = readFileSync(
    new URL('../src/features/mentor/pages.tsx', import.meta.url),
    'utf8',
  )
  const news = readFileSync(
    new URL('../src/features/diary/pages/news.tsx', import.meta.url),
    'utf8',
  )
  expect(pages).toContain('useMarkMentorMealsViewedMutation')
  expect(pages).not.toContain('isPresentationUnreadMenteeEmail')
  expect(pages).not.toContain('markPresentationUnreadViewed')
  expect(pages).not.toContain('forceUnread')
  expect(pages).toContain('onMealsViewed={view === \'diary\' && mentee ? onMealsViewed : undefined}')
  expect(news).toContain('onMealsViewed')
  expect(news).toContain('IntersectionObserver')
  expect(news).toContain('intersectingMealIds')
  expect(news).toContain('rememberViewedMealIds')
  expect(news).toContain('unread={Boolean(')
  expect(news).toContain('meal.unread')
  expect(news).not.toContain('forceUnread')
})
