import { expect, test } from 'bun:test'

import {
  homePathForRole,
  isMentorPlanPath,
  isUserPlanPath,
  navigationItemMatchingPath,
  navigationItemsForRole,
  postAuthPath,
  primaryNavigationItemsForRole,
  resolveRoleDestination,
  safeReturnPath,
  secondaryNavigationItemsForRole,
  userGeneralSearch,
  userSplitNutritionGeneralPath,
} from '../src/features/navigation/model'

test('role navigation exposes only the current workspace', () => {
  expect(navigationItemsForRole('user')).toEqual([
    { label: 'Диалоги', to: '/app/dialogs' },
    { label: 'Встречи', to: '/app/meetings' },
    { label: 'Профиль', to: '/app/profile' },
    { label: 'Рефералы', to: '/app/referrals' },
    { label: 'Настройки', to: '/app/settings' },
    { label: 'Заметки', to: '/app/notes' },
  ])
  expect(navigationItemsForRole('admin')).toEqual([
    { label: 'Новости', to: '/admin/news' },
    { label: 'Профиль', to: '/admin/profile' },
    { label: 'Пользователи', to: '/admin/users' },
    { label: 'Настройки', to: '/admin/settings' },
  ])
  expect(navigationItemsForRole('mentor')).toEqual([
    { label: 'Диалоги', to: '/mentor/dialogs' },
    { label: 'Встречи', to: '/mentor/meetings' },
    { label: 'Профиль', to: '/mentor/profile' },
    { label: 'Пользователи', to: '/mentor/users' },
    { label: 'Настройки', to: '/mentor/settings' },
    { label: 'Заметки', to: '/mentor/notes' },
  ])
  expect(homePathForRole('user')).toBe('/app/dialogs')
  expect(homePathForRole('admin')).toBe('/admin/users')
  expect(homePathForRole('mentor')).toBe('/mentor/dialogs')
})

test('legacy diary and plan URLs open dialogs', () => {
  expect(userSplitNutritionGeneralPath('/app/diary')).toBe('/app/dialogs')
  expect(userSplitNutritionGeneralPath('/app/diary/news')).toBe('/app/dialogs')
  expect(userSplitNutritionGeneralPath('/app/plan')).toBe('/app/dialogs')
  expect(userSplitNutritionGeneralPath('/app/plan/current')).toBe('/app/dialogs')
  expect(userSplitNutritionGeneralPath('/app/plan/plan_custom')).toBe('/app/dialogs')
  expect(userSplitNutritionGeneralPath('/app/general')).toBe('/app/dialogs')
  expect(userSplitNutritionGeneralPath('/app/news')).toBeNull()
  expect(userGeneralSearch()).toEqual({ view: 'diary', planId: undefined, library: undefined })
})

test('role navigation separates primary and account-menu destinations', () => {
  expect(primaryNavigationItemsForRole('user')).toEqual([])
  expect(secondaryNavigationItemsForRole('user')).toEqual([
    { label: 'Профиль', to: '/app/profile' },
    { label: 'Настройки', to: '/app/settings' },
    { label: 'Заметки', to: '/app/notes' },
  ])
  expect(primaryNavigationItemsForRole('admin')).toEqual([])
  expect(secondaryNavigationItemsForRole('admin')).toEqual([
    { label: 'Профиль', to: '/admin/profile' },
    { label: 'Пользователи', to: '/admin/users' },
    { label: 'Настройки', to: '/admin/settings' },
  ])
  expect(secondaryNavigationItemsForRole('mentor')).toEqual([
    { label: 'Профиль', to: '/mentor/profile' },
    { label: 'Пользователи', to: '/mentor/users' },
    { label: 'Настройки', to: '/mentor/settings' },
    { label: 'Заметки', to: '/mentor/notes' },
  ])
  expect(primaryNavigationItemsForRole('mentor')).toEqual([])
})

test('post-auth landing opens a new dialog for user and mentor', () => {
  expect(postAuthPath('user', '/app/settings')).toBe('/app/dialogs')
  expect(postAuthPath('user')).toBe('/app/dialogs')
  expect(postAuthPath('user', '/app/settings', false)).toBe('/app/dialogs')
  expect(postAuthPath('user', undefined, false)).toBe('/app/dialogs')
  expect(postAuthPath('mentor', '/mentor/users')).toBe('/mentor/dialogs')
  expect(postAuthPath('mentor')).toBe('/mentor/dialogs')
  expect(postAuthPath('mentor', '/mentor')).toBe('/mentor/dialogs')
  expect(postAuthPath('admin', '/admin/users')).toBe('/admin/users')
  expect(postAuthPath('admin')).toBe('/admin/users')
  expect(postAuthPath('user', '/admin/users')).toBe('/app/dialogs')
})

test('cross-role destinations resolve to the current role home', () => {
  expect(resolveRoleDestination('user', '/app/profile')).toBe('/app/profile')
  expect(resolveRoleDestination('user', '/app/referrals')).toBe('/app/referrals')
  expect(resolveRoleDestination('user', '/app/diary')).toBe('/app/dialogs')
  expect(resolveRoleDestination('user', '/app/diary/news')).toBe('/app/dialogs')
  expect(resolveRoleDestination('user', '/app/feed')).toBe('/app/dialogs')
  expect(resolveRoleDestination('user', '/app/news')).toBe('/app/dialogs')
  expect(resolveRoleDestination('mentor', '/mentor/feed')).toBe('/mentor/dialogs')
  expect(resolveRoleDestination('mentor', '/mentor/news')).toBe('/mentor/dialogs')
  expect(resolveRoleDestination('admin', '/admin/news')).toBe('/admin/news')
  expect(resolveRoleDestination('user', '/app/rations')).toBe('/app/dialogs')
  expect(resolveRoleDestination('user', '/app/mentor-rations')).toBe('/app/dialogs')
  expect(resolveRoleDestination('user', '/app/plan')).toBe('/app/dialogs')
  expect(resolveRoleDestination('user', '/app/general')).toBe('/app/dialogs')
  expect(resolveRoleDestination('user', '/app/plan/current')).toBe('/app/dialogs')
  expect(resolveRoleDestination('user', '/app/saved')).toBe('/app/dialogs')
  expect(resolveRoleDestination('user', '/app/payments')).toBe('/app/dialogs')
  expect(resolveRoleDestination('user', '/admin/users')).toBe('/app/dialogs')
  expect(resolveRoleDestination('admin', '/admin/settings')).toBe('/admin/settings')
  expect(resolveRoleDestination('admin', '/admin/profile')).toBe('/admin/profile')
  expect(resolveRoleDestination('admin', '/app')).toBe('/admin/users')
  expect(resolveRoleDestination('mentor', '/mentor/users')).toBe('/mentor/users')
  expect(resolveRoleDestination('mentor', '/mentor/profile')).toBe('/mentor/profile')
  expect(resolveRoleDestination('mentor', '/mentor/meal-plan')).toBe('/mentor/dialogs')
  expect(resolveRoleDestination('mentor', '/mentor/mentor-rations')).toBe('/mentor/dialogs')
  expect(resolveRoleDestination('mentor', '/mentor')).toBe('/mentor/dialogs')
  expect(resolveRoleDestination('mentor', '/mentor/payments')).toBe('/mentor/dialogs')
  expect(resolveRoleDestination('mentor', '/admin/users')).toBe('/mentor/dialogs')
})

test('return paths accept only known internal destinations for the current role', () => {
  expect(safeReturnPath('user', '/app/profile')).toBe('/app/profile')
  expect(safeReturnPath('user', '/app/meetings')).toBe('/app/meetings')
  expect(safeReturnPath('mentor', '/mentor/meetings?id=00000000-0000-7000-8000-000000000001')).toBe(
    '/mentor/meetings?id=00000000-0000-7000-8000-000000000001',
  )
  expect(safeReturnPath('user', '/app/referrals')).toBe('/app/referrals')
  expect(safeReturnPath('user', '/app/diary')).toBe('/app/dialogs')
  expect(safeReturnPath('user', '/app/diary/news')).toBe('/app/dialogs')
  expect(safeReturnPath('user', '/app/feed')).toBe('/app/dialogs')
  expect(safeReturnPath('user', '/app/news')).toBe('/app/dialogs')
  expect(safeReturnPath('mentor', '/mentor/feed')).toBe('/mentor/dialogs')
  expect(safeReturnPath('mentor', '/mentor/news')).toBe('/mentor/dialogs')
  expect(safeReturnPath('admin', '/admin/news')).toBe('/admin/news')
  expect(safeReturnPath('user', '/app/rations')).toBe('/app/dialogs')
  expect(safeReturnPath('user', '/app/mentor-rations')).toBe('/app/dialogs')
  expect(safeReturnPath('user', '/app/plan')).toBe('/app/dialogs')
  expect(safeReturnPath('user', '/app/general')).toBe('/app/dialogs')
  expect(safeReturnPath('user', '/app/general?view=plan')).toBe('/app/dialogs')
  expect(safeReturnPath('user', '/app/plan/current')).toBe('/app/dialogs')
  expect(safeReturnPath('user', '/app/saved')).toBe('/app/dialogs')
  expect(safeReturnPath('user', '/app')).toBe('/app/dialogs')
  expect(safeReturnPath('user', '/app/payments')).toBe('/app/dialogs')
  expect(safeReturnPath('admin', '/admin/users?page=2')).toBe('/admin/users?page=2')
  expect(safeReturnPath('admin', '/admin/profile')).toBe('/admin/profile')
  expect(safeReturnPath('mentor', '/mentor/users')).toBe('/mentor/users')
  expect(safeReturnPath('mentor', '/mentor/profile')).toBe('/mentor/profile')
  expect(safeReturnPath('mentor', '/mentor/meal-plan')).toBe('/mentor/dialogs')
  expect(safeReturnPath('mentor', '/mentor/mentor-rations')).toBe('/mentor/dialogs')
  expect(safeReturnPath('mentor', '/mentor/payments')).toBe('/mentor/dialogs')
  expect(safeReturnPath('user', '/admin')).toBeNull()
  expect(safeReturnPath('admin', 'https://attacker.example/admin')).toBeNull()
  expect(safeReturnPath('admin', '//attacker.example/admin')).toBeNull()
  expect(safeReturnPath('user', '/app/unknown')).toBeNull()
  expect(safeReturnPath('admin', '/admin/ds/colors')).toBe('/admin/ds/colors')
  expect(safeReturnPath('admin', '/admin/ds/overview?x=1')).toBe('/admin/ds/overview?x=1')
  expect(safeReturnPath('user', '/admin/ds/colors')).toBeNull()
  expect(safeReturnPath('admin', '/admin/ds/colors/extra')).toBeNull()
  expect(safeReturnPath('admin', '/admin/components')).toBe('/admin/components')
  expect(safeReturnPath('admin', '/admin/components/button')).toBe('/admin/components/button')
  expect(safeReturnPath('user', '/admin/components/button')).toBeNull()
  expect(safeReturnPath('admin', '/admin/blocks')).toBe('/admin/blocks')
  expect(safeReturnPath('admin', '/admin/blocks/nora-toolbar')).toBe('/admin/blocks/nora-toolbar')
  expect(safeReturnPath('user', '/admin/blocks/stats')).toBeNull()
  expect(safeReturnPath('admin', '/admin/blocks/stats/extra')).toBeNull()
  expect(safeReturnPath('admin', '/admin/stack')).toBe('/admin/stack')
  expect(safeReturnPath('user', '/admin/stack')).toBeNull()
  expect(safeReturnPath('admin', '/admin/stack/extra')).toBeNull()
  expect(safeReturnPath('admin', '/admin/steps')).toBe('/admin/steps')
  expect(safeReturnPath('user', '/admin/steps')).toBeNull()
  expect(safeReturnPath('admin', '/admin')).toBe('/admin')
  expect(safeReturnPath('admin', '/admin/demo/dashboard')).toBe('/admin/users')
  expect(safeReturnPath('admin', '/admin/demo/news')).toBe('/admin/users')
  expect(safeReturnPath('user', '/admin/demo/dashboard')).toBeNull()
  expect(safeReturnPath('admin', '/admin/demo/news/extra')).toBeNull()
})

test('retired ration bookmarks land on Общее plan', () => {
  expect(navigationItemMatchingPath('user', '/app/mentor-rations')?.to).toBe('/app/dialogs')
  expect(navigationItemMatchingPath('user', '/app/my-rations')?.to).toBe('/app/dialogs')
  expect(navigationItemMatchingPath('user', '/app/rations')?.to).toBe('/app/dialogs')
  expect(postAuthPath('user', '/app/mentor-rations')).toBe('/app/dialogs')
  expect(postAuthPath('user', '/app/my-rations')).toBe('/app/dialogs')
  expect(resolveRoleDestination('user', '/app/my-rations')).toBe('/app/dialogs')
  expect(safeReturnPath('user', '/app/my-rations')).toBe('/app/dialogs')
})

test('user weekly plan folds into Общее', () => {
  expect(isUserPlanPath('/app/plan')).toBe(true)
  expect(isUserPlanPath('/app/plan/current')).toBe(true)
  expect(isUserPlanPath('/app/plan/plan_custom')).toBe(true)
  expect(isUserPlanPath('/app/rations')).toBe(false)
  expect(navigationItemMatchingPath('user', '/app/plan')?.label).toBe('Диалоги')
  expect(navigationItemMatchingPath('user', '/app/plan/current')?.to).toBe('/app/dialogs')
  expect(navigationItemMatchingPath('user', '/app/plan/plan_custom')?.to).toBe('/app/dialogs')
  expect(postAuthPath('user', '/app/plan/current')).toBe('/app/dialogs')
  expect(safeReturnPath('user', '/app/plan/plan_custom')).toBe('/app/dialogs')
})

test('mentor plans keep one sidebar item for the list and an opened plan', () => {
  expect(isMentorPlanPath('/mentor/plans')).toBe(true)
  expect(isMentorPlanPath('/mentor/plans/abc-uuid')).toBe(true)
  expect(isMentorPlanPath('/mentor/mentor-rations')).toBe(false)
  expect(navigationItemMatchingPath('mentor', '/mentor/plans/abc-uuid')?.to).toBe('/mentor/dialogs')
  expect(navigationItemMatchingPath('mentor', '/mentor/users/user-1')?.label).toBe('Пользователи')
  expect(safeReturnPath('mentor', '/mentor/plans/abc-uuid')).toBe('/mentor/dialogs')
  expect(postAuthPath('mentor', '/mentor/plans/abc-uuid')).toBe('/mentor/dialogs')
})
