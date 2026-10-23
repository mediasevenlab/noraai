import { format } from 'date-fns'
import { ru as dateFnsRu } from 'date-fns/locale'
import type { NewsPost } from '@web-app-demo/contracts'

const WEEKDAY_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] as const

export function feedDayHeading(iso: string) {
  const day = new Date(iso)
  const weekday = WEEKDAY_SHORT[day.getDay()]
  const dayMonth = format(day, 'd MMM', { locale: dateFnsRu })
  return `${weekday}. ${dayMonth}`
}

export function newsDayKey(iso: string) {
  const day = new Date(iso)
  const month = String(day.getMonth() + 1).padStart(2, '0')
  const date = String(day.getDate()).padStart(2, '0')
  return `${day.getFullYear()}-${month}-${date}`
}

export function postsCountLabel(count: number) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return `${count} пост`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${count} поста`
  return `${count} постов`
}

export function groupNewsByDay(posts: NewsPost[]) {
  const groups: { dayKey: string; dayIso: string; posts: NewsPost[] }[] = []
  for (const post of posts) {
    const dayKey = newsDayKey(post.postedAt)
    const last = groups.at(-1)
    if (last?.dayKey === dayKey) last.posts.push(post)
    else groups.push({ dayKey, dayIso: post.postedAt, posts: [post] })
  }
  return groups
}
