import { readFileSync } from 'node:fs'

import { expect, test } from 'bun:test'

import { filterMentorUsersByQuery } from '../src/features/mentor/MentorMenteeNavigation'

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
  expect(source).not.toContain('useMentorUnreadByUserId')
  expect(source).not.toContain('непрочитанных приёмов')
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
  expect(appNav).toContain('to="/mentor/dialogs"')
  expect(appNav).not.toContain('Рационы')
  expect(appNav).not.toContain('Приложение')
  expect(appNav).not.toContain('Дневные рационы')
})

test('mentor users nav can load without a diary import cycle', () => {
  expect(typeof filterMentorUsersByQuery).toBe('function')
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

test('mentee workspace shows only the profile', () => {
  const pages = readFileSync(
    new URL('../src/features/mentor/pages.tsx', import.meta.url),
    'utf8',
  )
  expect(pages).toContain('Профиль подключённого пользователя.')
  expect(pages).not.toContain("label: 'Дневник'")
  expect(pages).not.toContain("label: 'Рационы'")
  expect(pages).not.toContain('planView')
  const questionnaire = readFileSync(
    new URL('../src/features/mentor/MentorMenteeQuestionnaire.tsx', import.meta.url),
    'utf8',
  )
  expect(questionnaire).toContain('Имя и никнейм.')
  expect(questionnaire).toContain('title="Данные профиля"')
  const workspace = readFileSync(
    new URL('../src/pages.tsx', import.meta.url),
    'utf8',
  )
  expect(workspace).toContain('<MentorMenteeDiary userId={userId} />')
  expect(workspace).not.toContain('<MenteeAssignedPlans')
})
