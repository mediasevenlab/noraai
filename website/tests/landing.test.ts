import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')

test('landing build keeps SEO-critical content in semantic static HTML', () => {
  assert.match(html, /<html lang="ru"/)
  assert.match(html, /<title>24nutrition — дневник питания и планы<\/title>/)
  assert.match(html, /name="description"/)
  assert.equal(html.match(/<h1\b/g)?.length, 1)
  assert.match(html, /Питание под контролем/)
  assert.match(html, /<header/)
  assert.match(html, /<main id="main-content"/)
  assert.match(html, /<footer/)
})

test('landing header and hero link to auth routes', () => {
  assert.match(html, /href="\/login"/)
  assert.match(html, /href="\/signup"/)
  assert.match(html, />Войти</)
  assert.match(html, />Регистрация</)
})

test('landing build contains the complete modular section flow without client islands', () => {
  for (const sectionId of ['features', 'process', 'results', 'cta']) {
    assert.match(html, new RegExp(`id="${sectionId}"`))
  }
  assert.doesNotMatch(html, /<astro-island/)
})
