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
      <AlertDialogContent
        className="max-md:!gap-5 max-md:!px-5 max-md:!pt-5 max-md:!pb-[max(1.25rem,env(safe-area-inset-bottom))] max-md:text-left"
        data-delete-card-dialog=""
      >
        <AlertDialogHeader className="max-md:!place-items-start max-md:!gap-2 max-md:!text-left">
          <AlertDialogTitle className="max-md:!text-[17px] max-md:!leading-6">{title}</AlertDialogTitle>
          <AlertDialogDescription className="max-md:!text-left max-md:!text-sm max-md:!leading-5">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="max-md:!flex max-md:!flex-col-reverse max-md:!gap-2">
          <NoraButton
            className="max-md:!h-12 max-md:!w-full max-md:!text-[15px]"
            disabled={pending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="ghost"
          >
            Отмена
          </NoraButton>
          <NoraButton
            className="max-md:!h-12 max-md:!w-full max-md:!text-[15px]"
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
