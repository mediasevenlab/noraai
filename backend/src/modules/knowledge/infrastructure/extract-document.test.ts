import { expect, test } from 'bun:test'
import sharp from 'sharp'

import { KnowledgeFailure } from '../domain/errors'
import { chooseScanRotation, hasTextLayer, resolveDocumentText, type ScanPage } from './extract-document'
import { collapseRepeatedLines } from './read-scan'

const page: ScanPage = { page: 1, jpeg: Buffer.from('jpeg') }

test('a text layer is kept and the scan is not read', async () => {
  let called = false
  const text = await resolveDocumentText(
    'Это обычный договор с достаточным количеством букв.',
    async () => {
      called = true
      return [page]
    },
    async () => 'со скана',
  )
  expect(text).toContain('договор')
  expect(called).toBe(false)
})

test('a scan is read from its pages', async () => {
  const text = await resolveDocumentText(
    '   ',
    async () => [page],
    async (pages) => `страница ${pages[0]?.page}`,
  )
  expect(text).toBe('страница 1')
  expect(hasTextLayer('   ')).toBe(false)
})

test('a sideways page turns so the heading stays at the top', async () => {
  const bar = await sharp({
    create: { width: 180, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .png()
    .toBuffer()
  const upright = await sharp({
    create: { width: 240, height: 360, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .composite([
      { input: bar, top: 20, left: 30 },
      { input: bar, top: 40, left: 30 },
      { input: bar, top: 60, left: 30 },
    ])
    .jpeg()
    .toBuffer()
  expect(await chooseScanRotation(upright)).toBe(0)
  expect(await chooseScanRotation(await sharp(upright).rotate(90).toBuffer())).toBe(-90)
  expect(await chooseScanRotation(await sharp(upright).rotate(-90).toBuffer())).toBe(90)
})

test('a repeated scan line is kept twice', () => {
  const text = ['Строка', 'Строка', 'Строка', 'Строка', 'Другая'].join('\n')
  expect(collapseRepeatedLines(text).split('\n')).toEqual(['Строка', 'Строка', 'Другая'])
})

test('a scan without a reader explains that recognition is not configured', async () => {
  await expect(resolveDocumentText(' ', async () => [page])).rejects.toThrow(KnowledgeFailure)
  await expect(resolveDocumentText(' ', async () => [page])).rejects.toThrow('Распознавание сканов не настроено')
})
