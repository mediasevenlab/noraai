export const ICON_PACK_STORAGE_KEY = 'nora-icon-pack'

/**
 * Header switch for the app's interface icons.
 * Hugeicons is the default. Lucide stays as the static set, Lucide Animated as the motion set.
 * Solar and Codicons are CC BY 4.0.
 * Devigner is MIT and CC BY 4.0. Circum is MPL-2.0.
 */
export const ICON_PACKS = [
  { id: 'lucide', label: 'Lucide' },
  { id: 'lucide-animated', label: 'Lucide Animated' },
  { id: 'hugeicons', label: 'Hugeicons' },
  { id: 'keyline', label: 'Keyline' },
  { id: 'devigner', label: 'Devigner' },
  { id: 'solar', label: 'Solar' },
  { id: 'akar', label: 'Akar' },
  { id: 'ant-design', label: 'Ant Design' },
  { id: 'circum', label: 'Circum' },
  { id: 'clarity', label: 'Clarity' },
  { id: 'codicon', label: 'Codicons' },
] as const

export type IconPackId = (typeof ICON_PACKS)[number]['id']

export const DEFAULT_ICON_PACK: IconPackId = 'hugeicons'

const ICON_PACK_IDS = new Set<string>(ICON_PACKS.map((item) => item.id))

export function parseIconPackId(value: string | null | undefined): IconPackId {
  if (value && ICON_PACK_IDS.has(value)) return value as IconPackId
  return DEFAULT_ICON_PACK
}

export function applyIconPackToDocument(pack: IconPackId) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-icon-pack', pack)
}
