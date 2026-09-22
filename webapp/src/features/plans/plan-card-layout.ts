import { productFeedGridClass } from '@/components/nora/product-sheet'
import { cn } from '@/lib/utils'

export type PlanCardLayout = 'grid' | 'list'

const STORAGE_KEY = 'nora:plan-card-layout:v1'

export function readPlanCardLayout(): PlanCardLayout {
  if (typeof localStorage === 'undefined') return 'grid'
  return localStorage.getItem(STORAGE_KEY) === 'list' ? 'list' : 'grid'
}

export function writePlanCardLayout(layout: PlanCardLayout) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, layout)
}

/** Phone: one ration card across the screen. Wider layouts stay a multi-column grid. */
export function planFeedGridClass(layout: PlanCardLayout) {
  return cn(productFeedGridClass, layout === 'list' && 'max-md:grid-cols-1')
}
