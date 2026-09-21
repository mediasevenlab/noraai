import { productFeedGridClass } from '@/components/nora/product-sheet'
import { cn } from '@/lib/utils'

export type DiaryCardLayout = 'grid' | 'list'

const STORAGE_KEY = 'nora:diary-card-layout:v1'

export function readDiaryCardLayout(): DiaryCardLayout {
  if (typeof localStorage === 'undefined') return 'grid'
  return localStorage.getItem(STORAGE_KEY) === 'list' ? 'list' : 'grid'
}

export function writeDiaryCardLayout(layout: DiaryCardLayout) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, layout)
}

export function diaryFeedGridClass(layout: DiaryCardLayout) {
  return cn(productFeedGridClass, layout === 'list' && 'max-md:grid-cols-1')
}
