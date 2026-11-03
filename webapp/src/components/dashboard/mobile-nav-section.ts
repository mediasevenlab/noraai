export type MobileNavSection = 'dialogs' | 'meetings' | 'notes'

export function mobileNavSection(to: string): MobileNavSection | null {
  if (to === '/app/dialogs' || to === '/mentor/dialogs') return 'dialogs'
  if (to === '/app/meetings' || to === '/mentor/meetings') return 'meetings'
  if (to === '/app/notes' || to === '/mentor/notes') return 'notes'
  return null
}

export function dialogNavPath(to: string): '/app/dialogs' | '/mentor/dialogs' | null {
  if (to === '/app/dialogs' || to === '/mentor/dialogs') return to
  return null
}

export function meetingNavPath(to: string): '/app/meetings' | '/mentor/meetings' | null {
  if (to === '/app/meetings' || to === '/mentor/meetings') return to
  return null
}

export function notesNavPath(to: string): '/app/notes' | '/mentor/notes' | null {
  if (to === '/app/notes' || to === '/mentor/notes') return to
  return null
}
