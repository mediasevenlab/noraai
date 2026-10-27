import { expect, test } from 'bun:test'

import { speechChunks, spokenText } from './spoken-text'

test('speech reads the words of a markdown answer', () => {
  const spoken = spokenText(`## Итог

**Спикер 1 (Михаил)** обсудил линии.

\`\`\`
console.log('не читать')
\`\`\`

Подробнее в [протоколе](https://example.com).`)
  expect(spoken).toBe('Итог Спикер 1 (Михаил) обсудил линии. Подробнее в протоколе.')
  expect(spoken).not.toContain('console')
})

test('a long answer is spoken in sentence-sized pieces', () => {
  const sentence = 'На участке навески шесть линий. '
  const chunks = speechChunks(sentence.repeat(80))
  expect(chunks.length).toBeGreaterThan(1)
  expect(chunks[0]?.length).toBeLessThanOrEqual(220)
  expect(chunks.every((chunk) => chunk.length <= 1200)).toBe(true)
  expect(chunks[0]?.endsWith('.')).toBe(true)
})
