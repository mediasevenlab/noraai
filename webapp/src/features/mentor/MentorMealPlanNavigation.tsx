import { DialogsNavigation } from '@/features/dialogs'
import { KnowledgeNavigation } from '@/features/knowledge'

export function MentorMealPlanNavigation() {
  return (
    <>
      <DialogsNavigation to="/mentor/dialogs" />
      <KnowledgeNavigation />
    </>
  )
}
