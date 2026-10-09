import * as React from 'react'

import { cn } from '@/lib/utils'

import { MEAL_COVER_PLACEHOLDER_SRC, MEAL_COVER_STUB_SRC } from './meal-cover'
import {
  applyMealPhotoFallback,
  displayMediaSrc,
  mealPhotoDisplaySize,
  mealPhotoNeedsPreview,
  mealPhotoOriginalSrc,
} from './media-display'

export function MealFeedPhoto({
  src,
  sizes,
  priority = false,
}: {
  src: string
  sizes: 'sm' | 'md' | 'lg'
  priority?: boolean
}) {
  const resolved = src.trim() || MEAL_COVER_STUB_SRC
  const displaySize = mealPhotoDisplaySize(sizes)
  const displaySrc = displayMediaSrc(resolved, displaySize)
  const previewSrc = displayMediaSrc(resolved, 'card')
  const originalSrc = mealPhotoOriginalSrc(resolved, displaySize)
  const showPreview = mealPhotoNeedsPreview(resolved, displaySize)
  const [loadedSrc, setLoadedSrc] = React.useState<string | null>(null)
  const fullReady = !showPreview || loadedSrc === displaySrc

  return (
    <>
      {showPreview ? (
        <img
          alt=""
          aria-hidden
          className="absolute inset-0 size-full object-cover select-none"
          decoding="async"
          draggable={false}
          src={previewSrc}
        />
      ) : null}
      <img
        alt=""
        className={cn(
          'absolute inset-0 size-full object-cover select-none',
          showPreview && 'transition-opacity duration-200 ease-out motion-reduce:duration-0',
          showPreview && !fullReady && 'opacity-0',
        )}
        data-display={displaySrc}
        data-original={originalSrc}
        decoding="async"
        draggable={false}
        fetchPriority={priority ? 'high' : 'auto'}
        loading="eager"
        onError={(event) => {
          applyMealPhotoFallback(event.currentTarget, MEAL_COVER_PLACEHOLDER_SRC)
          setLoadedSrc(displaySrc)
        }}
        onLoad={() => setLoadedSrc(displaySrc)}
        src={displaySrc}
      />
    </>
  )
}
