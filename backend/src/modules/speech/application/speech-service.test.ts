import { expect, test } from 'bun:test'

import type { SpeechSpeaker } from './ports'
import { createSpeechService } from './speech-service'

test('the speaker receives plain sentences and the pieces come back as one recording', async () => {
  const heard: string[] = []
  const speaker: SpeechSpeaker = {
    async speak(text) {
      heard.push(text)
      return Uint8Array.from([heard.length])
    },
  }
  const audio = await createSpeechService(speaker).speak('**Готово.** Вторая фраза.')
  expect(heard).toEqual(['Готово. Вторая фраза.'])
  expect(Array.from(audio)).toEqual([1])
})

test('an answer that is only code is not spoken', async () => {
  const speaker: SpeechSpeaker = {
    async speak() {
      throw new Error('should not speak')
    },
  }
  await expect(createSpeechService(speaker).speak('```\ncode\n```')).rejects.toThrow('Нечего озвучивать')
})
