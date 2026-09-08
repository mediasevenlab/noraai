import { describe, expect, test } from 'bun:test'

describe('telegram poller identity binding', () => {
  test('meals and notify pollers do not bind accounts from typed nick or phone', async () => {
    const meals = await Bun.file(new URL('./telegram-meals-poller.ts', import.meta.url)).text()
    const notify = await Bun.file(new URL('./telegram-notify-poller.ts', import.meta.url)).text()

    expect(meals).not.toContain('typedNick')
    expect(meals).not.toContain('typedPhone')
    expect(meals).not.toContain('looksLikeTelegramUsername(text)')
    expect(meals).not.toContain('looksLikeTelegramPhone(text)')
    expect(meals).not.toContain('awaitingUsername')
    expect(meals).toContain('provenTelegramIdentity')

    expect(notify).not.toContain('looksLikeTelegramUsername(text)')
    expect(notify).toContain('provenTelegramIdentity')
    expect(notify).toContain('completeTelegramLink')
  })
})
