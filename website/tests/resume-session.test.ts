import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const page = await readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8')

test('landing resumes an existing session before showing the marketing page', () => {
  assert.match(page, /landing-session-check/)
  assert.match(page, /\/api\/auth\/refresh/)
  assert.match(page, /\/api\/auth\/me/)
  assert.match(page, /web_app_demo:auth-cookie-mutation/)
  assert.match(page, /\/app\/general/)
  assert.match(page, /\/app\/onboarding/)
  assert.match(page, /\/mentor/)
  assert.match(page, /\/admin\/users/)
})
