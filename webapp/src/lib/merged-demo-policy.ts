/**
 * На совмещённых страницах (Base + Nora) порядок: сначала Nora,
 * затем Base-примеры, которых нет во Nora.
 * Здесь — названия Base-примеров, которые считаем очевидным дублем Nora.
 */
export const BASE_EXAMPLES_DROP: Record<string, readonly string[]> = {
  avatar: ["Basic", "Sizes", "Group"],
  input: ["Default", "With icon", "Invalid"],
  checkbox: ["Basic"],
  switch: ["Basic"],
  slider: ["Basic"],
  tabs: ["Line"],
  // dialog: Base с Trigger API — оставляем как интерактивные варианты
  progress: ["Basic", "Complete"],
  select: ["Basic"],
  breadcrumb: ["Basic"],
  empty: ["Basic", "With action"],
  separator: ["Horizontal"],
  collapsible: ["Default open"],
  item: ["Nav"],
  kbd: ["Basic"],
}

export function filterBaseExamples<T extends { title: string }>(
  baseId: string,
  examples: T[]
): T[] {
  const drop = new Set(BASE_EXAMPLES_DROP[baseId] ?? [])
  if (!drop.size) return examples
  return examples.filter((ex) => !drop.has(ex.title))
}
