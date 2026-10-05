import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import {
  DEFAULT_GENERATION_TOKEN_USAGE_VISIBLE,
  GENERATION_TOKEN_USAGE_STORAGE_KEY,
  parseGenerationTokenUsageVisible,
} from '../src/features/users/generation-token-usage-store'

describe('generation token usage setting', () => {
  test('stays off until the settings switch is turned on', () => {
    expect(DEFAULT_GENERATION_TOKEN_USAGE_VISIBLE).toBe(false)
    expect(parseGenerationTokenUsageVisible(null)).toBe(false)
    expect(parseGenerationTokenUsageVisible('false')).toBe(false)
    expect(parseGenerationTokenUsageVisible('true')).toBe(true)
    expect(parseGenerationTokenUsageVisible('maybe')).toBe(false)
    expect(GENERATION_TOKEN_USAGE_STORAGE_KEY).toContain('generation-token-usage')

    const panel = readFileSync(
      new URL('../src/features/users/GenerationTokenUsagePanel.tsx', import.meta.url),
      'utf8',
    )
    const page = readFileSync(
      new URL('../src/features/users/pages.tsx', import.meta.url),
      'utf8',
    )
    expect(panel).toContain('size="lg"')
    expect(panel).toContain('setGenerationTokenUsageVisible')
    expect(panel).not.toContain('useSettingsDraft')
    expect(panel).not.toContain('useSettingsMode')
    expect(page).toContain('<GenerationTokenUsagePanel />')
  })
})
