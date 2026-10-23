import type { OrbState } from '@/features/auth/mercury/orb-state'

export function noraOrbState(input: {
  statusType: string
  statusReason?: string
  speaking: boolean
  hasText: boolean
}): OrbState {
  if (input.speaking) return 'speaking'
  if (input.statusType === 'running') return input.hasText ? 'speaking' : 'thinking'
  if (input.statusType === 'incomplete' && input.statusReason === 'error') return 'error'
  return 'idle'
}
