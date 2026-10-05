import { NoraButton } from '@/components/nora/primitives'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function DeleteCardDialog({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  pending?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog
      onOpenChange={(next) => {
        if (pending) return
        onOpenChange(next)
      }}
      open={open}
    >
      <AlertDialogContent data-delete-card-dialog="">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <NoraButton disabled={pending} onClick={() => onOpenChange(false)} type="button" variant="ghost">
            Отмена
          </NoraButton>
          <NoraButton
            disabled={pending}
            onClick={onConfirm}
            type="button"
            variant="destructive"
          >
            {pending ? 'Удаление…' : confirmLabel}
          </NoraButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
