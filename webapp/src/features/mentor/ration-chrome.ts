import {
  productSheetCardFrameClass,
  productSheetOverlayChipClass,
  productSheetTabTriggerClass,
} from '@/components/nora/product-sheet'
import { cn } from '@/lib/utils'

import type { RationGoal, RationMealSlot } from './rations-catalog'

export const RATION_DIALOG_FRAME_CLASS = productSheetCardFrameClass
export const RATION_OVERLAY_CHIP_CLASS = productSheetOverlayChipClass
export const RATION_TAB_CLASS = productSheetTabTriggerClass

export const SLOT_BADGE_CLASS: Record<RationMealSlot, string> = {
  Завтрак: 'bg-[var(--nora-badge-yellow-bg)] text-[var(--nora-badge-yellow-text)]',
  Обед: 'bg-[var(--nora-tint-dimmed)] text-[var(--nora-tint)]',
  Перекус: 'bg-[var(--nora-badge-purple-bg)] text-[var(--nora-badge-purple-text)]',
  Ужин: 'bg-[var(--nora-badge-green-bg)] text-[var(--nora-badge-green-text)]',
}

export const GOAL_BADGE_CLASS: Record<RationGoal, string> = {
  Похудение:
    'bg-[color-mix(in_srgb,var(--nora-badge-red-text)_18%,var(--nora-panel))] text-[var(--nora-badge-red-text)]',
  Набор:
    'bg-[color-mix(in_srgb,var(--nora-badge-yellow-text)_18%,var(--nora-panel))] text-[var(--nora-badge-yellow-text)]',
  Поддержание:
    'bg-[color-mix(in_srgb,var(--nora-badge-green-text)_18%,var(--nora-panel))] text-[var(--nora-badge-green-text)]',
  Здоровье:
    'bg-[color-mix(in_srgb,var(--nora-badge-purple-text)_18%,var(--nora-panel))] text-[var(--nora-badge-purple-text)]',
}

export const RATION_FROST_BADGE_CLASS = cn(
  'ios-glass-glare-soft inline-flex h-6 min-h-6 max-h-6 w-fit shrink-0 items-center self-start rounded-full border-0 px-2.5',
  'font-[family-name:var(--nora-font)] text-[12px] font-medium leading-none tracking-normal backdrop-blur-[8px]',
)

export const RATION_GOAL_CARD_BADGE_CLASS = cn(
  'ios-glass-glare-soft inline-flex h-[22px] min-h-[22px] max-h-[22px] w-fit shrink-0 items-center rounded-full border-0 px-[9px]',
  'font-[family-name:var(--nora-font)] text-[11.5px] font-normal leading-none tracking-normal backdrop-blur-[10px]',
)

export const RATION_PHOTO_FADE_MS = 280
export const RATION_PHOTO_SWIPE_PX = 36

/** Old 168px cover plus the composition and macros block that left the feed card. */
export const RATION_CARD_PREVIEW_MIN_CLASS = 'min-h-[220px]'

export const RATION_GROUP_CHIP_CLASS = cn(
  'ios-glass-glare inline-flex h-7 min-h-7 max-h-7 shrink-0 items-center gap-1 rounded-full border-0 bg-[var(--nora-input-bg)] py-0 pr-2.5 pl-2 text-[12px] font-normal leading-none text-[var(--nora-text-secondary)] backdrop-blur-[16px]',
)

export function formatRationGoalKcalCap(kcal: number) {
  return `до ${kcal.toLocaleString('ru-RU')} ккал`
}
