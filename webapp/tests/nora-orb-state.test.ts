import { expect, test } from 'bun:test'

import { noraOrbState } from '../src/features/dialogs/nora-orb-state'

test('maps Nora reply states onto orb animations', () => {
  expect(noraOrbState({ statusType: 'running', speaking: false, hasText: false })).toBe('thinking')
  expect(noraOrbState({ statusType: 'running', speaking: false, hasText: true })).toBe('speaking')
  expect(noraOrbState({ statusType: 'complete', speaking: true, hasText: true })).toBe('speaking')
  expect(noraOrbState({ statusType: 'incomplete', statusReason: 'error', speaking: false, hasText: false })).toBe('error')
  expect(noraOrbState({ statusType: 'complete', speaking: false, hasText: true })).toBe('idle')
  expect(noraOrbState({ statusType: 'incomplete', statusReason: 'cancelled', speaking: false, hasText: true })).toBe('idle')
})
