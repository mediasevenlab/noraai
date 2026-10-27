import { DialogsNavigation } from '@/features/dialogs'
import { KnowledgeNavigation } from '@/features/knowledge'
import { MeetingsNavigation } from '@/features/meetings'

/** Dialogs are the user workspace. */
export function UserAppNavigation({ disabled = false }: { disabled?: boolean }) {
  return (
    <>
      <DialogsNavigation disabled={disabled} to="/app/dialogs" />
      <MeetingsNavigation disabled={disabled} to="/app/meetings" />
      <KnowledgeNavigation disabled={disabled} />
    </>
  )
}
