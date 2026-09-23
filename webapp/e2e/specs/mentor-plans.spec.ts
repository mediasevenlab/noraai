import {
  completeUserQuestionnaire,
  createNamedPlan,
  e2ePassword,
  expect,
  fillRegisterForm,
  test,
  uniqueEmail,
  waitForGuestAuthForm,
} from '../helpers/test'

test('mentor sends a plan and the mentee sees it', async ({ browser, page }) => {
  const mentorNickname = `mentor_plan_${Date.now().toString(36).slice(-6)}`
  const planTitle = `Наставник ${Date.now().toString(36).slice(-6)}`
  const menteeEmail = uniqueEmail('web-e2e-mentee-plan')
  const menteeName = 'Подопечный E2E'

  await page.goto('/signup')
  await waitForGuestAuthForm(page, 'Создание аккаунта')
  await page.getByText('Наставник', { exact: true }).click()
  await page.getByLabel('Электронная почта').fill(uniqueEmail('web-e2e-mentor-plan'))
  await page.getByLabel('Пароль', { exact: true }).fill(e2ePassword)
  await page.getByLabel('Подтвердите пароль').fill(e2ePassword)
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await expect(page).toHaveURL(/\/mentor$/)
  await page.goto('/mentor/settings')
  await page.getByRole('button', { name: 'Изменить' }).click()
  await page.getByLabel('Ваш никнейм').fill(mentorNickname)
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page.getByText('Никнейм сохранён')).toBeVisible()

  const userContext = await browser.newContext()
  const userPage = await userContext.newPage()
  await userPage.goto(`/?ref=${mentorNickname}`)
  await waitForGuestAuthForm(userPage, 'Создание аккаунта')
  await expect(userPage.getByLabel('Никнейм или ID наставника')).toHaveValue(mentorNickname)
  await expect(userPage.getByLabel('Наставник найден')).toBeVisible()
  await fillRegisterForm(userPage, menteeEmail)
  await userPage.getByLabel('Имя').fill(menteeName)
  await expect(userPage.getByLabel('Наставник найден')).toBeVisible()
  await userPage.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await completeUserQuestionnaire(userPage)

  await page.goto('/mentor/plans')
  await createNamedPlan(page, planTitle)
  await expect(page.getByText('План сохранён')).toBeVisible()
  await expect(page).toHaveURL(/\/mentor\/plans\//)

  await page.getByRole('link', { name: 'Планы' }).click()
  await expect(page).toHaveURL(/\/mentor\/plans$/)
  await expect(page.getByRole('heading', { name: planTitle })).toBeVisible()
  await page.getByRole('button', { name: 'Отправить' }).click()

  const picker = page.getByRole('dialog')
  await expect(picker.getByRole('heading', { name: 'Выберите пользователя' })).toBeVisible()
  await picker.getByRole('button', { name: new RegExp(menteeName) }).click()
  await expect(page.getByText('План отправлен')).toBeVisible()

  await userPage.goto('/app/general?view=plan')
  await userPage.getByRole('group', { name: 'Раздел' }).getByRole('button', { name: 'Рационы' }).click()
  await expect(userPage.getByText('Наставник', { exact: true })).toBeVisible()
  await expect(userPage.getByRole('heading', { name: planTitle })).toBeVisible()

  await userContext.close()
})
