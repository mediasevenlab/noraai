export const DS_PAGES = [
  { id: 'overview', name: 'Введение' },
  { id: 'colors', name: 'Цвет' },
  { id: 'typography', name: 'Типографика' },
  { id: 'icons', name: 'Иконки' },
  { id: 'spacing', name: 'Сетка и отступы' },
  { id: 'radius', name: 'Скругления' },
  { id: 'shadows', name: 'Тени и высота' },
  { id: 'borders', name: 'Рамки и разделители' },
  { id: 'motion', name: 'Анимация' },
  { id: 'tokens', name: 'Все токены' },
] as const

export type DsPageId = (typeof DS_PAGES)[number]['id']

export const DS_BASE_PATH = '/admin/ds'

export function dsPath(id: DsPageId) {
  return `${DS_BASE_PATH}/${id}` as const
}

export function isDsPageId(value: string): value is DsPageId {
  return DS_PAGES.some((page) => page.id === value)
}

export function dsPageTitle(id: string) {
  return DS_PAGES.find((page) => page.id === id)?.name ?? 'Дизайн-система'
}
