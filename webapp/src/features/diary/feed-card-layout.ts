import { productFeedGridClass } from '@/components/nora/product-sheet'
import { cn } from '@/lib/utils'

export type FeedCardLayout = 'grid' | 'list'

const STORAGE_KEY = 'nora:feed-card-layout:v1'

export function readFeedCardLayout(): FeedCardLayout {
  if (typeof localStorage === 'undefined') return 'grid'
  return localStorage.getItem(STORAGE_KEY) === 'list' ? 'list' : 'grid'
}

export function writeFeedCardLayout(layout: FeedCardLayout) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, layout)
}

/** Phone: one feed card across the screen. Wider layouts stay a multi-column grid. */
export function feedGridClass(layout: FeedCardLayout) {
  return cn(productFeedGridClass, layout === 'list' && 'max-md:grid-cols-1')
}
