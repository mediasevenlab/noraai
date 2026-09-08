import { BLOCKS, type BlockMeta } from '@/lib/components-nav'

export { BLOCKS, type BlockMeta }

export const BLOCKS_BASE_PATH = '/admin/blocks'

export function blockPath(id: string) {
  return `${BLOCKS_BASE_PATH}/${id}` as const
}

export function isBlockId(value: string) {
  return BLOCKS.some((block) => block.id === value)
}

export function blockPageTitle(id: string | undefined) {
  if (!id) return 'Блоки'
  return BLOCKS.find((block) => block.id === id)?.name ?? 'Блоки'
}
