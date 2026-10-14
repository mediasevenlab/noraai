/**
 * Draft attaches stay on the hero until the saved meal has another photo.
 * After that the open card shows the meal gallery, including a new slide.
 */
export function mealAddDialogHeroSlides(input: {
  previewSlides: readonly string[]
  formedImages: readonly string[]
  versionCount: number
}) {
  const formed = input.formedImages
  const preview = input.previewSlides
  if (formed.length > 1 || input.versionCount > 1) return [...formed]
  if (preview.length > 0) return [...preview]
  return [...formed]
}

export function nextComposerHeroIndex(input: {
  previous: readonly string[]
  next: readonly string[]
  activeIndex: number
}) {
  if (input.next.length === 0) return 0
  if (input.next.length > input.previous.length) return input.next.length - 1
  if (input.next.length === input.previous.length) {
    return Math.min(Math.max(0, input.activeIndex), input.next.length - 1)
  }

  let removed = input.previous.findIndex((src, index) => src !== input.next[index])
  if (removed < 0) removed = input.previous.length - 1
  if (input.activeIndex > removed) return input.activeIndex - 1
  if (input.activeIndex === removed) return Math.max(0, removed - 1)
  return input.activeIndex
}
