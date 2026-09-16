import { e2eAdminEmail, e2eAdminPassword } from '../env'
import {
  completeUserQuestionnaire,
  e2ePassword,
  expect,
  fillLoginForm,
  fillRegisterForm,
  goToWorkspaceFromAccountMenu,
  openSidebarAccountMenu,
  test,
  uniqueEmail,
  waitForGuestAuthForm,
} from '../helpers/test'


test('keeps user and administrator workspaces separate', async ({ browser, page }) => {
  const userEmail = uniqueEmail('web-e2e-rbac-user')

  await page.goto('/admin/users')
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fadmin%2Fusers$/)
  // Direct signup keeps returnTo without racing the login→signup remount.
  await page.goto('/signup?returnTo=%2Fadmin%2Fusers')
  await fillRegisterForm(page, userEmail)
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await completeUserQuestionnaire(page)
  await expect(page.getByRole('link', { name: 'Мой дневник' })).toBeVisible()
  await openSidebarAccountMenu(page)
  await expect(page.getByRole('menuitem', { name: 'Платежи' })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('link', { name: 'Дашборд' })).toHaveCount(0)
  const sidebar = page.locator('[data-slot="sidebar"][data-state]')
  await expect(sidebar).toHaveAttribute('data-state', 'expanded')
  await goToWorkspaceFromAccountMenu(page, 'Профиль')
  await expect(page).toHaveURL(/\/app\/profile$/)
  await page.locator('[data-sidebar="trigger"]').click()
  await expect(sidebar).toHaveAttribute('data-state', 'collapsed')
  await page.reload()
  await expect(sidebar).toHaveAttribute('data-state', 'collapsed')
  await page.goto('/admin/users')
  await expect(page).toHaveURL(/\/app\/general/)

  const adminContext = await browser.newContext()
  const adminPage = await adminContext.newPage()
  await adminPage.goto('/login')
  await fillLoginForm(adminPage, e2eAdminEmail, e2eAdminPassword)
  await adminPage.getByRole('button', { name: 'Войти' }).click()

  await expect(adminPage).toHaveURL(/\/admin\/users$/)
  await expect(adminPage.getByRole('main')).toHaveCount(1)
  await expect(adminPage.getByRole('navigation', { name: 'Демо' })).toHaveCount(0)
  await expect(adminPage.getByRole('navigation', { name: 'Дизайн-система' })).toBeVisible()
  await expect(adminPage.getByRole('navigation', { name: 'Разделы рабочей области' })).toHaveCount(0)
  await expect(adminPage.getByRole('heading', { level: 1, name: 'Пользователи' })).toBeVisible()
  await expect(adminPage.getByRole('link', { name: 'Дашборд' })).toHaveCount(0)
  await openSidebarAccountMenu(adminPage)
  await expect(adminPage.getByRole('menuitem', { name: 'Пользователи' })).toBeVisible()
  await expect(adminPage.getByRole('menuitem', { name: 'Настройки' })).toBeVisible()
  await expect(adminPage.getByRole('menuitem', { name: 'Платежи' })).toHaveCount(0)
  await adminPage.keyboard.press('Escape')
  await expect(adminPage.getByRole('link', { name: 'Главная' })).toHaveCount(0)
  await adminPage.goto('/app/profile')
  await expect(adminPage).toHaveURL(/\/admin\/users$/)

  await adminContext.close()
})

test('users and administrators manage unique nicknames in settings', async ({
  browser,
  page,
}) => {
  const firstEmail = uniqueEmail('web-e2e-nickname-first')
  const nickname = `mentor_${Date.now()}`
  await page.goto('/signup')
  await fillRegisterForm(page, firstEmail)
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await completeUserQuestionnaire(page)
  await page.goto('/app/settings')
  await page.getByLabel('Ваш никнейм').fill(nickname.toUpperCase())
  await page.getByRole('button', { name: 'Сохранить никнейм' }).click()
  await expect(page.getByText('Никнейм сохранён')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Ваш никнейм')).toHaveValue(nickname)

  const secondContext = await browser.newContext()
  const secondPage = await secondContext.newPage()
  await secondPage.goto('/signup')
  await fillRegisterForm(secondPage, uniqueEmail('web-e2e-nickname-second'))
  await secondPage.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await completeUserQuestionnaire(secondPage)
  await secondPage.goto('/app/settings')
  await secondPage.getByLabel('Ваш никнейм').fill(nickname)
  await secondPage.getByRole('button', { name: 'Сохранить никнейм' }).click()
  await expect(secondPage.getByText('Этот никнейм уже занят.')).toBeVisible()
  await secondContext.close()

  const adminContext = await browser.newContext()
  const adminPage = await adminContext.newPage()
  await adminPage.goto('/login')
  await fillLoginForm(adminPage, e2eAdminEmail, e2eAdminPassword)
  await adminPage.getByRole('button', { name: 'Войти' }).click()
  await expect(adminPage).toHaveURL(/\/admin\/users$/)
  await adminPage.goto('/admin/settings')
  await adminPage.getByLabel('Ваш никнейм').fill(`admin_${Date.now()}`)
  await adminPage.getByRole('button', { name: 'Сохранить никнейм' }).click()
  await expect(adminPage.getByText('Никнейм сохранён')).toBeVisible()
  await adminContext.close()
})

test('mentor manages only connected users by nickname or id', async ({
  browser,
  page,
}) => {
  const mentorNickname = `mentor_e2e_${Date.now().toString(36).slice(-6)}`
  await page.goto('/signup')
  await waitForGuestAuthForm(page, 'Создание аккаунта')
  await page.getByText('Наставник', { exact: true }).click()
  await page.getByLabel('Электронная почта').fill(uniqueEmail('web-e2e-mentor'))
  await page.getByLabel('Пароль', { exact: true }).fill(e2ePassword)
  await page.getByLabel('Подтвердите пароль').fill(e2ePassword)
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await expect(page).toHaveURL(/\/mentor$/)
  await page.goto('/mentor/settings')
  await page.getByLabel('Ваш никнейм').fill(mentorNickname)
  await page.getByRole('button', { name: 'Сохранить никнейм' }).click()
  await expect(page.getByText('Никнейм сохранён')).toBeVisible()
  const linkedUserEmail = uniqueEmail('web-e2e-linked-at-registration')
  const userContext = await browser.newContext()
  const userPage = await userContext.newPage()
  await userPage.goto(`/?ref=${mentorNickname}`)
  await expect(userPage).toHaveURL(new RegExp(`/signup\\?ref=${mentorNickname}$`))
  await waitForGuestAuthForm(userPage, 'Создание аккаунта')
  await expect(userPage.getByLabel('Никнейм или ID наставника')).toHaveValue(mentorNickname)
  await expect(userPage.getByLabel('Наставник найден')).toBeVisible()
  await userPage.getByLabel('Электронная почта').fill(linkedUserEmail)
  await userPage.getByLabel('Пароль', { exact: true }).fill(e2ePassword)
  await userPage.getByLabel('Подтвердите пароль').fill(e2ePassword)
  await userPage.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await completeUserQuestionnaire(userPage)
  await expect(userPage.getByRole('link', { name: 'Пользователи' })).toHaveCount(0)

  await goToWorkspaceFromAccountMenu(page, 'Пользователи')
  await expect(page).toHaveURL(/\/mentor\/users$/)
  const linkedUserRow = page.getByRole('row', { name: new RegExp(linkedUserEmail) })
  await expect(linkedUserRow).toBeVisible()

  await page.getByLabel(`Действия для ${linkedUserEmail}`).click()
  await page.getByRole('menuitem', { name: 'Отключить' }).click()
  const detachDialog = page.getByRole('alertdialog')
  await detachDialog.getByRole('button', { name: 'Отключить' }).click()
  await expect(linkedUserRow).toHaveCount(0)

  await userPage.goto('/app/settings')
  await userPage.getByLabel('Никнейм или ID наставника').fill(mentorNickname)
  await expect(userPage.getByLabel('Наставник найден')).toBeVisible()
  await userPage.getByRole('button', { name: 'Подключиться' }).click()
  await expect(userPage.getByText('Наставник подключён')).toBeVisible()
  await page.reload()
  await expect(linkedUserRow).toBeVisible()

  await userContext.close()
})

test('mobile workspace navigation closes the sidebar sheet', async ({ page }) => {
  const userEmail = uniqueEmail('web-e2e-mobile-sidebar')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/signup')
  await fillRegisterForm(page, userEmail)
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await completeUserQuestionnaire(page)

  await page.getByRole('button', { name: 'Открыть меню' }).click()
  const mobileMenu = page.getByRole('dialog')
  await expect(mobileMenu).toBeVisible()
  await page.getByRole('link', { name: 'Профиль' }).click()

  await expect(page).toHaveURL(/\/app\/profile$/)
  await expect(mobileMenu).toBeHidden()
})

test('workspace navigation and account controls are keyboard operable', async ({
  page,
}) => {
  await page.goto('/login')
  await fillLoginForm(page, e2eAdminEmail, e2eAdminPassword)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page).toHaveURL(/\/admin\/users$/)

  const accountMenu = page.getByRole('button', { name: 'Открыть меню аккаунта' })
  await accountMenu.focus()
  await page.keyboard.press('Enter')
  const usersItem = page.getByRole('menuitem', { name: 'Пользователи' })
  await expect(usersItem).toBeVisible()
  await usersItem.press('Enter')
  await expect(page).toHaveURL(/\/admin\/users$/)

  await accountMenu.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('menuitem', { name: 'Выйти' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menuitem', { name: 'Выйти' })).toBeHidden()
  await expect(accountMenu).toBeFocused()

  const sidebar = page.locator('[data-slot="sidebar"][data-state]')
  const sidebarTrigger = page.locator('[data-sidebar="trigger"]')
  await sidebarTrigger.focus()
  await page.keyboard.press('Enter')
  await expect(sidebar).toHaveAttribute('data-state', 'collapsed')
})

test('admin data surfaces recover from errors and expose safe directory states', async ({
  page,
}) => {
  await page.goto('/login')
  await fillLoginForm(page, e2eAdminEmail, e2eAdminPassword)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page).toHaveURL(/\/admin\/users$/)
  await expect(page.getByLabel('Поиск пользователей')).toBeVisible()

  let directoryRequests = 0
  await page.route('**/api/admin/users?*', async (route) => {
    directoryRequests += 1
    if (directoryRequests === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'INTERNAL_ERROR', message: 'Directory temporarily unavailable' },
        }),
      })
      return
    }
    await route.continue()
  })

  await page.reload()
  await expect(page.getByRole('alert')).toContainText('Directory temporarily unavailable')
  await page.getByRole('button', { name: 'Повторить' }).click()
  await expect(page.getByText(/Страница 1 из \d+ · \d+ пользователей/)).toBeVisible()

  await page.getByLabel('Поиск пользователей').fill(e2eAdminEmail)
  await page.getByRole('button', { name: 'Найти' }).click()
  await page.getByLabel(`Роль для ${e2eAdminEmail}`).click()
  await expect(page.getByRole('option', { name: 'Пользователь' })).toBeDisabled()
  await expect(page.getByRole('option', { name: 'Наставник' })).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByLabel('Поиск пользователей').fill(`missing-${Date.now()}@example.com`)
  await page.getByRole('button', { name: 'Найти' }).click()
  await expect(page.getByText('Пользователи не найдены', { exact: true })).toBeVisible()
  await expect(page.getByText('Попробуйте другое имя или email.')).toBeVisible()
})

test('workspace account menu keeps a failed logout visible and retryable', async ({ page }) => {
  const userEmail = uniqueEmail('web-e2e-sidebar-logout')
  await page.goto('/signup')
  await fillRegisterForm(page, userEmail)
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await completeUserQuestionnaire(page)

  await page.route('**/api/auth/logout', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'UNAVAILABLE', message: 'Temporary logout failure' },
      }),
    })
  })

  const sidebar = page.locator('[data-slot="sidebar"][data-state]')
  const accountMenu = page.getByRole('button', { name: 'Открыть меню аккаунта' })
  await page.locator('[data-sidebar="trigger"]').click()
  await expect(sidebar).toHaveAttribute('data-state', 'collapsed')
  await accountMenu.click()
  await page.getByRole('menuitem', { name: 'Выйти' }).click()

  await expect(sidebar).toHaveAttribute('data-state', 'expanded')
  await expect(page.getByText('Не удалось выйти. Попробуйте ещё раз.')).toBeVisible()
  await expect(page).toHaveURL(/\/app\/general/)
  await accountMenu.click()
  await expect(page.getByRole('menuitem', { name: 'Выйти' })).toBeEnabled()
})

test('role mutation failures are announced inside the confirmation dialog', async ({
  browser,
  page,
}) => {
  const userEmail = uniqueEmail('web-e2e-role-error')
  await page.goto('/signup')
  await fillRegisterForm(page, userEmail)
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await completeUserQuestionnaire(page)

  const adminContext = await browser.newContext()
  const adminPage = await adminContext.newPage()
  await adminPage.goto('/login')
  await fillLoginForm(adminPage, e2eAdminEmail, e2eAdminPassword)
  await adminPage.getByRole('button', { name: 'Войти' }).click()
  await expect(adminPage).toHaveURL(/\/admin\/users$/)
  await adminPage.goto('/admin/users')
  await expect(adminPage.getByLabel('Поиск пользователей')).toBeVisible()
  await adminPage.getByLabel('Поиск пользователей').fill(userEmail)
  await adminPage.getByRole('button', { name: 'Найти' }).click()
  await adminPage.route('**/api/admin/users/*/role', async (route) => {
    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'CONFLICT',
          message: 'The requested role change conflicts with administrator policy',
        },
      }),
    })
  })

  await adminPage.getByLabel(`Роль для ${userEmail}`).click()
  await adminPage.getByRole('option', { name: 'Администратор' }).click()
  const dialog = adminPage.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Изменить роль' }).click()

  await expect(dialog).toContainText('Роль не изменена')
  await expect(dialog).toContainText('administrator policy')
  await adminContext.close()
})

test('promoting a user revokes the old session and opens the admin workspace after login', async ({
  browser,
  page,
}) => {
  const userEmail = uniqueEmail('web-e2e-promoted-user')

  await page.goto('/signup')
  await fillRegisterForm(page, userEmail)
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await completeUserQuestionnaire(page)

  const adminContext = await browser.newContext()
  const adminPage = await adminContext.newPage()
  await adminPage.goto('/login')
  await fillLoginForm(adminPage, e2eAdminEmail, e2eAdminPassword)
  await adminPage.getByRole('button', { name: 'Войти' }).click()
  await expect(adminPage).toHaveURL(/\/admin\/users$/)
  await adminPage.goto('/admin/users')

  await adminPage.getByLabel('Поиск пользователей').fill(userEmail)
  await adminPage.getByRole('button', { name: 'Найти' }).click()
  const roleSelect = adminPage.getByLabel(`Роль для ${userEmail}`)
  await expect(roleSelect).toBeVisible()
  await roleSelect.click()
  await adminPage.getByRole('option', { name: 'Администратор' }).click()
  await expect(adminPage.getByRole('alertdialog')).toContainText(userEmail)
  await adminPage.getByRole('button', { name: 'Изменить роль' }).click()
  await expect(adminPage.getByText('Роль изменена')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible()
  await fillLoginForm(page, userEmail, e2ePassword)
  await page.getByRole('button', { name: 'Войти' }).click()

  await expect(page).toHaveURL(/\/admin\/users$/)
  await expect(page.getByRole('navigation', { name: 'Дизайн-система' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Дашборд' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Главная' })).toHaveCount(0)

  await adminContext.close()
})

test('administrator deletes another user but cannot delete the current account', async ({
  browser,
  page,
}) => {
  const userEmail = uniqueEmail('web-e2e-deleted-user')
  await page.goto('/signup')
  await fillRegisterForm(page, userEmail)
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await completeUserQuestionnaire(page)

  const adminContext = await browser.newContext()
  const adminPage = await adminContext.newPage()
  await adminPage.goto('/login')
  await fillLoginForm(adminPage, e2eAdminEmail, e2eAdminPassword)
  await adminPage.getByRole('button', { name: 'Войти' }).click()
  await expect(adminPage).toHaveURL(/\/admin\/users$/)
  await adminPage.goto('/admin/users')

  await adminPage.getByLabel('Поиск пользователей').fill(e2eAdminEmail)
  await adminPage.getByRole('button', { name: 'Найти' }).click()
  await adminPage.getByLabel(`Действия для ${e2eAdminEmail}`).click()
  await expect(adminPage.getByRole('menuitem', { name: 'Удалить' })).toBeDisabled()
  await adminPage.keyboard.press('Escape')

  await adminPage.getByLabel('Поиск пользователей').fill(userEmail)
  await adminPage.getByRole('button', { name: 'Найти' }).click()
  await adminPage.getByLabel(`Действия для ${userEmail}`).click()
  await adminPage.getByRole('menuitem', { name: 'Удалить' }).click()
  const dialog = adminPage.getByRole('alertdialog')
  await expect(dialog).toContainText(userEmail)
  await adminPage.getByRole('button', { name: 'Удалить навсегда' }).click()

  await expect(adminPage.getByText('Пользователь удалён')).toBeVisible()
  await expect(adminPage.getByLabel(`Действия для ${userEmail}`)).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible()

  await adminContext.close()
})
