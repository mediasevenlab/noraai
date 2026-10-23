import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

export { expect, test }

export const e2ePassword = 'password123'

export function uniqueEmail(prefix = 'web-e2e') {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '')
  const suffix = Math.random().toString(36).slice(2, 8)

  return `${prefix}-${timestamp}-${suffix}@example.com`
}

/** Wait for login/signup after optional transient session bootstrap failures. */
export async function waitForGuestAuthForm(page: Page, heading: string | RegExp) {
  await expect(async () => {
    const retry = page.getByRole('button', { name: 'Повторить' })
    if (await retry.isVisible()) {
      await retry.click()
    }
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
  }).toPass()
}

export async function fillRegisterForm(
  page: Page,
  email: string,
  password = e2ePassword,
) {
  await waitForGuestAuthForm(page, 'Создание аккаунта')
  await page.getByLabel('Электронная почта').fill(email)
  await expect(page.getByLabel('Электронная почта')).toHaveValue(email)
  await page.getByLabel('Пароль', { exact: true }).fill(password)
  await page.getByLabel('Подтвердите пароль').fill(password)
}

export async function fillLoginForm(
  page: Page,
  email: string,
  password: string,
) {
  await waitForGuestAuthForm(page, 'Вход в аккаунт')
  await page.getByLabel('Электронная почта').fill(email)
  await page.getByLabel('Пароль', { exact: true }).fill(password)
}

/** Registration no longer asks for a questionnaire; the app opens directly. */
export async function completeUserQuestionnaire(page: Page) {
  await expect(page).toHaveURL(/\/app\/dialogs/)
}

export async function registerCompletedUser(
  page: Page,
  email: string,
  displayName = 'Web E2E User',
) {
  await page.goto('/signup')
  await fillRegisterForm(page, email)
  await page.getByLabel('Имя').fill(displayName)
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await completeUserQuestionnaire(page)
}

export async function createNamedPlan(
  page: Page,
  title: string,
  mealTitle = 'Овсянка',
) {
  await page.getByRole('button', { name: 'Создать рацион' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByPlaceholder('Например, Офис без срывов')).toBeVisible()
  await dialog.getByPlaceholder('Например, Офис без срывов').fill(title)
  await dialog.getByRole('button', { name: 'Открыть день 1' }).click()
  await dialog.getByRole('tab', { name: 'Завтрак' }).click()
  await dialog.getByPlaceholder('Название блюда').fill(mealTitle)
  await dialog.getByRole('button', { name: 'Создать рацион' }).click()
}

export async function openSidebarAccountMenu(page: Page) {
  await page.getByRole('button', { name: 'Открыть меню аккаунта' }).click()
}

export async function goToWorkspaceFromAccountMenu(page: Page, name: string) {
  await openSidebarAccountMenu(page)
  await page.getByRole('menuitem', { name, exact: true }).click()
}

export async function logoutFromAccountMenu(page: Page) {
  await goToWorkspaceFromAccountMenu(page, 'Выйти')
}
