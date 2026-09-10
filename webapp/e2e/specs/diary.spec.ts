import {
  expect,
  registerCompletedUser,
  test,
  uniqueEmail,
} from '../helpers/test'

test('opens the add-meal composer from the diary', async ({ page }) => {
  await registerCompletedUser(page, uniqueEmail('web-e2e-diary-add'))

  await expect(page.getByRole('group', { name: 'Раздел' }).getByRole('button', { name: 'Дневник' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('button', { name: 'Статистика' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Добавить' }).click()
  const composer = page.getByRole('dialog')
  await composer.getByRole('heading', { name: 'Карточка приёма пищи' }).waitFor()
  await composer.getByRole('button', { name: 'Закрыть' }).last().click()
  await expect(composer).toHaveCount(0)
})
