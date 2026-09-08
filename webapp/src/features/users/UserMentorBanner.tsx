import { GraduationCapIcon } from 'lucide-react'

import { SidebarRelationCard } from '@/components/dashboard/SidebarRelationCard'
import { useCurrentUserMentorQuery } from './queries'

function mentorLabel(mentor: {
  displayName: string | null
  nickname: string | null
  publicId: number
}) {
  return mentor.displayName ?? mentor.nickname ?? `ID ${mentor.publicId}`
}

/** Sidebar card — connected mentor, or a prompt to attach one. */
export function UserMentorBanner() {
  const mentorQuery = useCurrentUserMentorQuery()
  const mentor = mentorQuery.data?.mentor
  const name = mentor ? mentorLabel(mentor) : undefined

  return (
    <SidebarRelationCard
      actionLabel={mentor ? 'Открыть' : 'Подключить'}
      ariaLabel={mentor ? `Наставник: ${name}` : 'Подключить наставника'}
      description={
        mentor
          ? 'Ведёт рацион и видит ваш дневник.'
          : 'Подключите наставника по никнейму или ID в настройках.'
      }
      href="/app/settings"
      icon={GraduationCapIcon}
      label="Наставник"
      value={name ?? 'Ещё не подключён'}
    />
  )
}
