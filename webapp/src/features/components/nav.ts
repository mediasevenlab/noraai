import {
  COMPONENTS,
  NORA_COMPONENTS,
  getBaseIdForNoraDoc,
  isNoraOnlyComponent,
  type ComponentMeta,
} from '@/lib/components-nav'

export {
  COMPONENTS,
  NORA_COMPONENTS,
  getBaseIdForNoraDoc,
  isNoraOnlyComponent,
  type ComponentMeta,
}

export const COMP_BASE_PATH = '/admin/components'

export function componentPath(id: string) {
  return `${COMP_BASE_PATH}/${id}` as const
}

export function isComponentId(value: string) {
  return COMPONENTS.some((component) => component.id === value)
}

export function componentPageTitle(id: string | undefined) {
  if (!id) return 'Компоненты'
  return COMPONENTS.find((component) => component.id === id)?.name ?? 'Компоненты'
}
