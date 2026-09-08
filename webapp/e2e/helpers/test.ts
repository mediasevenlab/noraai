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

async function choosePlaque(page: Page, name: string | RegExp) {
  await page.getByRole('radio', { name }).click()
}

async function chooseCheckboxPlaque(page: Page, name: string | RegExp) {
  await page.getByRole('checkbox', { name }).click()
}

async function fillLabeledInput(page: Page, label: string, value: string) {
  await page.getByLabel(new RegExp(`^${label}`)).fill(value)
}

async function goNext(page: Page) {
  await page.getByRole('button', { name: 'Далее' }).click()
}

/** Completes the post-signup questionnaire for role=user. */
export async function completeUserQuestionnaire(page: Page) {
  await expect(page).toHaveURL(/\/app\/onboarding$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Базовые данные' }),
  ).toBeVisible()

  await choosePlaque(page, 'Мужской')
  await fillLabeledInput(page, 'Возраст', '30 лет')
  await fillLabeledInput(page, 'Рост', '180 см')
  await fillLabeledInput(page, 'Вес', '85 кг')
  await goNext(page)

  await expect(page.getByRole('heading', { level: 1, name: 'Цель' })).toBeVisible()
  await choosePlaque(page, /Похудение/)
  await choosePlaque(page, /3 месяца/)
  await page.getByLabel(/^Комментарий/).fill('Хочу стабильный прогресс.')
  await goNext(page)

  await expect(page.getByRole('heading', { level: 1, name: 'Активность' })).toBeVisible()
  await choosePlaque(page, /Умеренная/)
  await choosePlaque(page, /3 раза/)
  await choosePlaque(page, /1\.5–2\.5 л/)
  await goNext(page)

  await expect(page.getByRole('heading', { level: 1, name: 'Быт' })).toBeVisible()
  await choosePlaque(page, /7–8 ч/)
  await choosePlaque(page, /Смешанно/)
  await choosePlaque(page, /Обычное/)
  await goNext(page)

  await expect(page.getByRole('heading', { level: 1, name: 'Ограничения' })).toBeVisible()
  await chooseCheckboxPlaque(page, /^Нет/)
  await page.getByLabel(/^Комментарий/).fill('Без особых ограничений.')
  await goNext(page)

  await expect(page.getByRole('heading', { level: 1, name: 'Контекст' })).toBeVisible()
  await choosePlaque(page, /Без особенностей/)
  await choosePlaque(page, /Иногда/)
  await choosePlaque(page, /Есть опыт/)
  await page.getByRole('button', { name: 'Завершить' }).click()

  await expect(page).toHaveURL(/\/app\/general/)
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
