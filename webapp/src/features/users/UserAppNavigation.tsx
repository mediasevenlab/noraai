import { DialogsNavigation } from '@/features/dialogs'
import { KnowledgeNavigation } from '@/features/knowledge'

/** Dialogs are the user workspace. */
export function UserAppNavigation({ disabled = false }: { disabled?: boolean }) {
  return (
    <>
      <DialogsNavigation disabled={disabled} to="/app/dialogs" />
      <KnowledgeNavigation disabled={disabled} />
    </>
  )
}
