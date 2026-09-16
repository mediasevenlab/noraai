import {
  createNamedPlan,
  expect,
  registerCompletedUser,
  test,
  uniqueEmail,
} from '../helpers/test'

test('creates a plan and selects it with a start date', async ({ page }) => {
  const title = `План E2E ${Date.now().toString(36).slice(-6)}`
  await registerCompletedUser(page, uniqueEmail('web-e2e-plan-select'))

  await page.getByRole('group', { name: 'Раздел' }).getByRole('button', { name: 'Рационы' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Мой дневник' })).toBeVisible()

  await createNamedPlan(page, title)
  await expect(page.getByText('План создан')).toBeVisible()
  await expect(page.getByRole('heading', { name: title })).toBeVisible()

  const card = page.locator('article').filter({ has: page.getByRole('heading', { name: title }) })
  await card.getByRole('button', { name: 'Выбрать' }).click()
  const start = page.getByRole('dialog')
  await expect(start.getByRole('heading', { name: 'С какого дня начать' })).toBeVisible()
  await start.getByRole('button', { name: /^Начать / }).click()

  await expect(card.getByRole('button', { name: 'Выбран' })).toBeVisible()
})
