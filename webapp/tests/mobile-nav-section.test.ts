import { expect, test } from 'bun:test'

import {
  dialogNavPath,
  meetingNavPath,
  mobileNavSection,
  notesNavPath,
} from '../src/components/dashboard/mobile-nav-section'

test('phone menu sections open a list for dialogs, meetings, and notes', () => {
  expect(mobileNavSection('/app/dialogs')).toBe('dialogs')
  expect(mobileNavSection('/mentor/dialogs')).toBe('dialogs')
  expect(mobileNavSection('/app/meetings')).toBe('meetings')
  expect(mobileNavSection('/mentor/meetings')).toBe('meetings')
  expect(mobileNavSection('/app/notes')).toBe('notes')
  expect(mobileNavSection('/mentor/notes')).toBe('notes')
  expect(mobileNavSection('/app/profile')).toBeNull()
  expect(mobileNavSection('/app/settings')).toBeNull()
  expect(dialogNavPath('/app/dialogs')).toBe('/app/dialogs')
  expect(meetingNavPath('/mentor/meetings')).toBe('/mentor/meetings')
  expect(notesNavPath('/app/profile')).toBeNull()
})
