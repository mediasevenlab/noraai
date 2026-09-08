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
