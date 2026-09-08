export type MediaDisplaySize = 'card' | 'full'

export function mealPhotoDisplaySize(sizes: 'sm' | 'md' | 'lg'): MediaDisplaySize {
  return sizes === 'lg' ? 'full' : 'card'
}

export function displayMediaSrc(src: string, size: MediaDisplaySize): string {
  const trimmed = src.trim()
  if (!trimmed || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return trimmed
  if (trimmed.includes('/api/meals/')) return withMealImageSize(trimmed, size)
  return catalogVariantSrc(trimmed, size)
}

export function mealPhotoFallbackSrc(input: {
  attempted: 'display' | 'original' | 'placeholder'
  displaySrc: string
  originalSrc: string
  placeholder: string
}) {
  if (input.attempted === 'display' && input.displaySrc !== input.originalSrc) {
    return input.originalSrc
  }
  if (input.attempted !== 'placeholder') return input.placeholder
  return null
}

export function applyMealPhotoFallback(image: HTMLImageElement, placeholder: string) {
  const attempted =
    image.dataset.fallback === '1'
      ? 'original'
      : image.dataset.fallback === '2'
        ? 'placeholder'
        : 'display'
  const next = mealPhotoFallbackSrc({
    attempted,
    displaySrc: image.dataset.display ?? '',
    originalSrc: image.dataset.original ?? '',
    placeholder,
  })
  if (!next) return
  image.dataset.fallback = next === placeholder ? '2' : '1'
  image.src = next
}

export function mealPhotoOriginalSrc(src: string, size: MediaDisplaySize) {
  if (size === 'card' && src.includes('/api/meals/')) return displayMediaSrc(src, 'full')
  return src
}

export function mealPhotoNeedsPreview(src: string, size: MediaDisplaySize) {
  if (size !== 'full') return false
  const preview = displayMediaSrc(src, 'card')
  const full = displayMediaSrc(src, 'full')
  return Boolean(preview) && preview !== full
}

export function prefetchMealPhoto(src: string, size: MediaDisplaySize = 'full') {
  if (typeof Image === 'undefined') return
  const href = displayMediaSrc(src, size)
  if (!href || href.startsWith('blob:') || href.startsWith('data:')) return
  const image = new Image()
  image.decoding = 'async'
  image.src = href
}

function withMealImageSize(src: string, size: MediaDisplaySize) {
  const { path, query, hash } = splitUrl(src)
  const params = new URLSearchParams(query)
  params.set('size', size)
  const nextQuery = params.toString()
  return `${path}?${nextQuery}${hash}`
}

function catalogVariantSrc(src: string, size: MediaDisplaySize) {
  const { path, query, hash } = splitUrl(src)
  if (!/\.(jpe?g|png|webp)$/i.test(path)) return src
  if (/\.card\.webp$/i.test(path)) return src
  // Plan catalog photos are originals from the recipe source, without .card.webp siblings.
  if (path.startsWith('/catalog/')) return src
  const extension = size === 'card' ? '.card.webp' : '.webp'
  const variant = path.replace(/\.[^.]+$/, extension)
  const suffix = query ? `?${query}` : ''
  return `${variant}${suffix}${hash}`
}

function splitUrl(src: string) {
  const hashIndex = src.indexOf('#')
  const hash = hashIndex >= 0 ? src.slice(hashIndex) : ''
  const withoutHash = hashIndex >= 0 ? src.slice(0, hashIndex) : src
  const queryIndex = withoutHash.indexOf('?')
  if (queryIndex < 0) return { path: withoutHash, query: '', hash }
  return {
    path: withoutHash.slice(0, queryIndex),
    query: withoutHash.slice(queryIndex + 1),
    hash,
  }
}
