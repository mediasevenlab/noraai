import type { PasswordResetRequestResponse } from '@web-app-demo/contracts'

export function passwordResetAcceptedNotice(
  delivery: PasswordResetRequestResponse['delivery'],
) {
  if (delivery === 'unavailable') {
    return {
      title: 'Сброс по почте недоступен',
      body: 'Письма сейчас не отправляются. Войдите, если помните пароль, или напишите в поддержку.',
    }
  }
  return {
    title: 'Проверьте почту',
    body: 'Если аккаунт с таким адресом существует, инструкции по сбросу уже отправлены.',
  }
}
