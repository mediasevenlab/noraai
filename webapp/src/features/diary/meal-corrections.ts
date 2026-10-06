export const MEAL_CORRECTIONS_PER_ACTOR = 2

export type MealCorrectionActor = 'user' | 'mentor'

/** Refinements after the original card. Older cards without an author count as the user's. */
export function mealCorrectionLimitReached(
  versions: readonly { authorRole?: MealCorrectionActor }[] | undefined,
  actor: MealCorrectionActor,
) {
  const used = (versions ?? [])
    .slice(1)
    .filter((version) => (version.authorRole ?? 'user') === actor).length
  return used >= MEAL_CORRECTIONS_PER_ACTOR
}
