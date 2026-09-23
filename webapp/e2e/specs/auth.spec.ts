import {
  completeUserQuestionnaire,
  e2ePassword,
  expect,
  goToWorkspaceFromAccountMenu,
  logoutFromAccountMenu,
  openSidebarAccountMenu,
  test,
  uniqueEmail,
  waitForGuestAuthForm,
} from '../helpers/test'


test('registers, restores the session, opens protected UI, and logs out', async ({ page }) => {
  const email = uniqueEmail()
  const displayName = 'Web E2E User'

  await page.goto('/signup')
  await waitForGuestAuthForm(page, 'Создание аккаунта')

  await expect(page.getByRole('main')).toHaveCount(1)
  const signupPassword = page.getByLabel('Пароль', { exact: true })
  const signupPasswordDescriptions = await signupPassword.getAttribute('aria-describedby')
  expect(signupPasswordDescriptions).toBeTruthy()
  const [signupPasswordRequirementId] = signupPasswordDescriptions!.split(/\s+/)
  await expect(page.locator(`[id="${signupPasswordRequirementId}"]`)).toHaveText(
    'Минимум 8 символов',
  )
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await expect(page.getByText('Введите корректный адрес электронной почты.')).toBeVisible()
  await expect(page.getByText('Пароль должен содержать от 8 до 128 символов.')).toBeVisible()

  await page.getByLabel('Имя').fill('A')
  await page.getByLabel('Электронная почта').fill(email)
  await page.getByLabel('Пароль', { exact: true }).fill(e2ePassword)
  await page.getByLabel('Подтвердите пароль').fill(e2ePassword)
  await page.getByRole('link', { name: 'Войти' }).click()
  await expect(page.getByLabel('Имя')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Войти' })).toBeEnabled()

  await page.getByRole('link', { name: 'Зарегистрироваться' }).click()
  await page.getByLabel('Имя').fill(displayName)
  await page.getByLabel('Электронная почта').fill(email)
  await page.getByLabel('Пароль', { exact: true }).fill(e2ePassword)
  await page.getByLabel('Подтвердите пароль').fill(e2ePassword)
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await completeUserQuestionnaire(page)
  await expect(page.getByRole('main')).toHaveCount(1)
  await expect(page.getByRole('navigation', { name: 'Питание' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Мой дневник' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Общее' })).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1, name: 'Мой дневник' })).toBeVisible()
  await openSidebarAccountMenu(page)
  await expect(page.getByRole('menuitem', { name: 'Профиль' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Настройки' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('link', { name: 'Дашборд' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Пользователи' })).toHaveCount(0)
  await expect
    .poll(async () =>
      (await page.context().cookies()).some(
        (cookie) => cookie.name === 'web_app_demo_refresh' && cookie.httpOnly,
      ),
    )
    .toBe(true)

  const refreshAfterReload = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/auth/refresh') && response.request().method() === 'POST',
  )
  const meAfterReload = page.waitForResponse(
    (response) => response.url().endsWith('/api/auth/me') && response.request().method() === 'GET',
  )

  await page.reload()

  await expect((await refreshAfterReload).status()).toBe(200)
  await expect((await meAfterReload).status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1, name: 'Мой дневник' })).toBeVisible()

  await goToWorkspaceFromAccountMenu(page, 'Профиль')
  await expect(page).toHaveURL(/\/app\/profile$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Профиль' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Базовые данные' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Изменить' })).toBeVisible()

  await goToWorkspaceFromAccountMenu(page, 'Настройки')
  await page.getByRole('button', { name: 'Изменить' }).click()
  await expect(page.getByLabel('Отображаемое имя')).toHaveValue(displayName)
  await page.getByLabel('Отображаемое имя').fill(' A ')
  await expect(page.getByText('Имя должно содержать не меньше 2 символов.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Сохранить', exact: true })).toBeDisabled()
  await page.getByLabel('Отображаемое имя').fill('  Updated Web User  ')
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page.getByText('Профиль сохранён')).toBeVisible()
  await expect(page.getByText('Updated Web User', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Updated Web User', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Переключить на тёмную тему' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('web_app_demo_theme')))
    .toBe('dark')

  await page.route('**/api/auth/logout', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'UNAVAILABLE', message: 'Temporary logout failure' },
      }),
    })
  })
  await logoutFromAccountMenu(page)
  await expect(page.getByText('Не удалось выйти. Попробуйте ещё раз.')).toBeVisible()
  await page.unroute('**/api/auth/logout')

  await logoutFromAccountMenu(page)
  await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible()
  await page.getByLabel('Электронная почта').fill(email)
  await page.getByLabel('Пароль', { exact: true }).fill(e2ePassword)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page).toHaveURL(/\/app\/settings$/)
  await expect(page.locator('html')).toHaveClass(/dark/)

  await goToWorkspaceFromAccountMenu(page, 'Профиль')

  await logoutFromAccountMenu(page)
  await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible()
  await page.getByLabel('Электронная почта').fill(email)
  await page.getByLabel('Пароль', { exact: true }).fill('wrong-password')
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page.getByText('Неверный email или пароль.')).toBeVisible()

  await page.getByLabel('Пароль', { exact: true }).fill(e2ePassword)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page).toHaveURL(/\/app\/profile$/)
})

test('hides password reset until email delivery is configured', async ({ page }) => {
  await page.goto('/login')
  await waitForGuestAuthForm(page, 'Вход в аккаунт')
  await expect(page.getByRole('link', { name: 'Забыли пароль?' })).toHaveCount(0)

  await page.goto('/forgot-password')
  await expect(page).toHaveURL(/\/login/)

  await page.goto('/reset-password#token=truncated')
  await expect(page).toHaveURL(/\/login/)
})

test('keeps one logical browser session active across concurrent tabs', async ({ page }) => {
  const email = uniqueEmail('web-e2e-tabs')

  await page.goto('/signup')
  await waitForGuestAuthForm(page, 'Создание аккаунта')
  await page.getByLabel('Электронная почта').fill(email)
  await page.getByLabel('Пароль', { exact: true }).fill(e2ePassword)
  await page.getByLabel('Подтвердите пароль').fill(e2ePassword)
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await completeUserQuestionnaire(page)

  const secondPage = await page.context().newPage()
  await secondPage.goto('/')
  await expect(secondPage).toHaveURL(/\/app\/general/)

  await Promise.all([page.reload(), secondPage.reload()])

  await expect(page).toHaveURL(/\/app\/general/)
  await expect(secondPage).toHaveURL(/\/app\/general/)
  await expect(page.getByRole('heading', { level: 1, name: 'Мой дневник' })).toBeVisible()
  await expect(secondPage.getByRole('heading', { level: 1, name: 'Мой дневник' })).toBeVisible()

  await page.route('**/api/auth/logout', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'UNAVAILABLE', message: 'Temporary logout failure' } }),
    })
  })
  await logoutFromAccountMenu(page)
  await expect(page.getByText('Не удалось выйти. Попробуйте ещё раз.')).toBeVisible()

  await logoutFromAccountMenu(secondPage)
  await expect(secondPage.getByRole('button', { name: 'Войти' })).toBeVisible()
  await expect(page.getByText('Не удалось выйти. Попробуйте ещё раз.')).toHaveCount(0)
})

test('remote logout recovers a tab from a transient bootstrap error', async ({ page }) => {
  const email = uniqueEmail('web-e2e-bootstrap-logout')

  await page.goto('/signup')
  await waitForGuestAuthForm(page, 'Создание аккаунта')
  await page.getByLabel('Электронная почта').fill(email)
  await page.getByLabel('Пароль', { exact: true }).fill(e2ePassword)
  await page.getByLabel('Подтвердите пароль').fill(e2ePassword)
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await completeUserQuestionnaire(page)

  const healthyPage = await page.context().newPage()
  await healthyPage.goto('/')
  await expect(healthyPage).toHaveURL(/\/app\/general/)

  await page.route('**/api/auth/refresh', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'UNAVAILABLE', message: 'Temporary bootstrap failure' },
      }),
    })
  })
  await page.reload()
  await expect(page.getByText('Проверка сессии временно недоступна')).toBeVisible()

  await logoutFromAccountMenu(healthyPage)
  await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible()
})

test('unknown routes wait for session recovery before choosing their return destination', async ({
  page,
}) => {
  const email = uniqueEmail('web-e2e-not-found')
  await page.goto('/signup')
  await waitForGuestAuthForm(page, 'Создание аккаунта')
  await page.getByLabel('Электронная почта').fill(email)
  await page.getByLabel('Пароль', { exact: true }).fill(e2ePassword)
  await page.getByLabel('Подтвердите пароль').fill(e2ePassword)
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await completeUserQuestionnaire(page)

  let failRefresh = true
  await page.route('**/api/auth/refresh', async (route) => {
    if (!failRefresh) {
      await route.continue()
      return
    }
    failRefresh = false
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'UNAVAILABLE', message: 'Temporary bootstrap failure' },
      }),
    })
  })

  await page.goto('/missing-page')
  await expect(page.getByText('Проверка сессии временно недоступна')).toBeVisible()
  await page.getByRole('button', { name: 'Повторить' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Страница не найдена' })).toBeVisible()
  await page.getByRole('button', { name: 'Вернуться в кабинет' }).click()
  await expect(page).toHaveURL(/\/app\/general/)
  await page.goto('/app/diary/news')
  await expect(page).toHaveURL(/\/app\/general/)
})

test('concurrent account changes converge every tab on the winning cookie session', async ({ page }) => {
  const firstEmail = uniqueEmail('web-e2e-account-a')
  const secondEmail = uniqueEmail('web-e2e-account-b')
  const secondPage = await page.context().newPage()

  await Promise.all([page.goto('/signup'), secondPage.goto('/signup')])
  await Promise.all([
    waitForGuestAuthForm(page, 'Создание аккаунта'),
    waitForGuestAuthForm(secondPage, 'Создание аккаунта'),
  ])
  await page.getByLabel('Электронная почта').fill(firstEmail)
  await page.getByLabel('Пароль', { exact: true }).fill(e2ePassword)
  await page.getByLabel('Подтвердите пароль').fill(e2ePassword)
  await secondPage.getByLabel('Электронная почта').fill(secondEmail)
  await secondPage.getByLabel('Пароль', { exact: true }).fill(e2ePassword)
  await secondPage.getByLabel('Подтвердите пароль').fill(e2ePassword)

  await Promise.all([
    page.getByRole('button', { name: 'Зарегистрироваться' }).click(),
    secondPage.getByRole('button', { name: 'Зарегистрироваться' }).click(),
  ])

  // Both tabs share a cookie jar. Re-navigate before onboarding so the UI is
  // bootstrapped for the winning session instead of a stale registration response.
  await page.goto('/app/onboarding')
  if ((await page.url()).includes('/app/onboarding')) {
    await completeUserQuestionnaire(page)
  }
  await secondPage.goto('/app/diary')
  if ((await secondPage.url()).includes('/app/onboarding')) {
    await completeUserQuestionnaire(secondPage)
  }
  // Cookie changes are not an observable cross-tab event; a navigation forces
  // the first tab to re-bootstrap against the winning shared cookie session.
  await page.goto('/app/diary')
  await expect(page).toHaveURL(/\/app\/general/)
  await expect(secondPage).toHaveURL(/\/app\/general/)
  let winningEmail = ''
  await expect
    .poll(async () => {
      const [firstTabText, secondTabText] = await Promise.all([
        page.locator('body').innerText(),
        secondPage.locator('body').innerText(),
      ])
      winningEmail = [firstEmail, secondEmail].find(
        (candidate) => firstTabText.includes(candidate) && secondTabText.includes(candidate),
      ) ?? ''
      return winningEmail
    })
    .not.toBe('')
})
