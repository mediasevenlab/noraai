import type { MealSource } from '@web-app-demo/contracts'

import { mealAssumptionsBlockShare } from './meal-share'

export type MentorMealNotifyMentee = {
  publicId: number
  nickname: string | null
  displayName: string | null
}

export type MentorMealNotifyMeal = {
  title: string
  mealSlot: string
  kcal: number
  protein: number
  fat: number
  carbs: number
  ingredients: string
  source: MealSource
}

export type MentorMealNotifyPayload = {
  chatId: string
  menteeLabel: string
  menteePublicId: number
  title: string
  mealSlot: string
  kcal: number
  protein: number
  fat: number
  carbs: number
  ingredients: string
  source: MealSource
  text: string
}

export function shouldNotifyMentorOfNewMeal(input: {
  actorUserId: string
  mentorId: string
  assumptions?: readonly string[]
}) {
  if (input.actorUserId === input.mentorId) return false
  if (mealAssumptionsBlockShare(input.assumptions ?? [])) return false
  return true
}

export function menteeNotifyLabel(mentee: MentorMealNotifyMentee) {
  const name = mentee.displayName?.trim() || mentee.nickname?.trim()
  if (name && mentee.nickname?.trim() && mentee.displayName?.trim() && mentee.nickname !== mentee.displayName) {
    return `${mentee.displayName.trim()} (@${mentee.nickname.trim()})`
  }
  if (name) return name
  return `пользователь #${mentee.publicId}`
}

export function formatMentorMealNotifyText(input: {
  mentee: MentorMealNotifyMentee
  meal: MentorMealNotifyMeal
}) {
  const ingredients = input.meal.ingredients.trim()
  const composition = ingredients.length > 280 ? `${ingredients.slice(0, 277)}…` : ingredients
  const lines = [
    '🍽 Новый приём в дневнике',
    '',
    `Подопечный: ${menteeNotifyLabel(input.mentee)} · #${input.mentee.publicId}`,
    `Приём: ${input.meal.mealSlot}`,
    `Блюдо: ${input.meal.title}`,
    `КБЖУ: ${input.meal.kcal} ккал · Б ${input.meal.protein} · Ж ${input.meal.fat} · У ${input.meal.carbs}`,
  ]
  if (composition) {
    lines.push('', 'Состав:', composition)
  }
  return lines.join('\n')
}

export function buildMentorMealNotifyPayload(input: {
  chatId: string
  mentee: MentorMealNotifyMentee
  meal: MentorMealNotifyMeal
}): MentorMealNotifyPayload {
  return {
    chatId: input.chatId,
    menteeLabel: menteeNotifyLabel(input.mentee),
    menteePublicId: input.mentee.publicId,
    title: input.meal.title,
    mealSlot: input.meal.mealSlot,
    kcal: input.meal.kcal,
    protein: input.meal.protein,
    fat: input.meal.fat,
    carbs: input.meal.carbs,
    ingredients: input.meal.ingredients,
    source: input.meal.source,
    text: formatMentorMealNotifyText(input),
  }
}

export function notifyBotHelpMessage() {
  return [
    'Это бот уведомлений для наставников.',
    'Привяжите Telegram кодом из настроек приложения — тогда сюда будут приходить новые приёмы подопечных.',
    'Фото еды отправляйте в бот дневника, не сюда.',
  ].join('\n')
}

export function notifyBotLinkedMessage() {
  return '✅ Telegram привязан. Когда подопечный добавит приём в дневник, сообщение придёт сюда.'
}
