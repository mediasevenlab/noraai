import { DialogsNavigation } from '@/features/dialogs'
import { KnowledgeNavigation } from '@/features/knowledge'
import { MeetingsNavigation } from '@/features/meetings'

export function MentorMealPlanNavigation() {
  return (
    <>
      <DialogsNavigation to="/mentor/dialogs" />
      <MeetingsNavigation to="/mentor/meetings" />
      <KnowledgeNavigation />
    </>
  )
}
