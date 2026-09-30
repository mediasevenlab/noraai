export const SIDEBAR_SHADE_STORAGE_KEY = 'nora-sidebar-shade'

function option(percent: number, label: string) {
  return { id: String(percent), label, percent } as const
}

export const SIDEBAR_SHADES = [
  option(0, '0% · сейчас'),
  option(1, '1%'),
  option(2, '2%'),
  option(3, '3%'),
  option(4, '4%'),
  option(5, '5%'),
  option(6, '6%'),
  option(7, '7%'),
  option(8, '8%'),
] as const

export type SidebarShadeId = (typeof SIDEBAR_SHADES)[number]['id']

export const DEFAULT_SIDEBAR_SHADE: SidebarShadeId = '0'

const SIDEBAR_SHADE_IDS = new Set<string>(SIDEBAR_SHADES.map((item) => item.id))

export function parseSidebarShadeId(value: string | null | undefined): SidebarShadeId {
  if (value && SIDEBAR_SHADE_IDS.has(value)) return value as SidebarShadeId
  return DEFAULT_SIDEBAR_SHADE
}

export function applySidebarShadeToDocument(shade: SidebarShadeId) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-sidebar-shade', shade)
}
