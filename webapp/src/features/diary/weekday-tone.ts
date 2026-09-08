/** JS `Date#getDay()`: 0 Sunday … 6 Saturday. Distinct from diary status chips. */
export const WEEKDAY_TONE_CLASS = [
  'bg-[rgba(244,63,94,0.14)] text-[#e11d48] data-active:bg-[rgba(244,63,94,0.22)] data-active:text-[#e11d48]',
  'bg-[rgba(14,165,233,0.14)] text-[#0284c7] data-active:bg-[rgba(14,165,233,0.22)] data-active:text-[#0284c7]',
  'bg-[rgba(124,58,237,0.14)] text-[#7c3aed] data-active:bg-[rgba(124,58,237,0.22)] data-active:text-[#7c3aed]',
  'bg-[rgba(13,148,136,0.14)] text-[#0f766e] data-active:bg-[rgba(13,148,136,0.22)] data-active:text-[#0f766e]',
  'bg-[rgba(249,115,22,0.16)] text-[#ea580c] data-active:bg-[rgba(249,115,22,0.24)] data-active:text-[#ea580c]',
  'bg-[rgba(79,70,229,0.14)] text-[#4f46e5] data-active:bg-[rgba(79,70,229,0.22)] data-active:text-[#4f46e5]',
  'bg-[rgba(219,39,119,0.14)] text-[#db2777] data-active:bg-[rgba(219,39,119,0.22)] data-active:text-[#db2777]',
] as const

export const WEEKDAY_TEXT_COLOR = [
  '#e11d48',
  '#0284c7',
  '#7c3aed',
  '#0f766e',
  '#ea580c',
  '#4f46e5',
  '#db2777',
] as const

export const WEEKDAY_ICON_CLASS = [
  'text-[#e11d48]',
  'text-[#0284c7]',
  'text-[#7c3aed]',
  'text-[#0f766e]',
  'text-[#ea580c]',
  'text-[#4f46e5]',
  'text-[#db2777]',
] as const

export function weekdayToneClass(day: number) {
  return WEEKDAY_TONE_CLASS[((day % 7) + 7) % 7]
}

export function weekdayIconClass(day: number) {
  return WEEKDAY_ICON_CLASS[((day % 7) + 7) % 7]
}
