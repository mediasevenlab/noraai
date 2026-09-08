import type { AdminUserSummary } from '@web-app-demo/contracts'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export function DeleteUserDialog({
  error,
  isPending,
  onCancel,
  onConfirm,
  pendingUser,
}: {
  error: Error | null
  isPending: boolean
  onCancel: () => void
  onConfirm: () => void
  pendingUser: AdminUserSummary | null
}) {
  return (
    <AlertDialog
      open={pendingUser !== null}
      onOpenChange={(open) => {
        if (!open && !isPending) onCancel()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
          <AlertDialogDescription>
            {pendingUser
              ? `${pendingUser.email} будет полностью удалён вместе со всеми активными сессиями. Это действие нельзя отменить.`
              : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Пользователь не удалён</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Отмена</AlertDialogCancel>
          <Button
            disabled={isPending}
            onClick={onConfirm}
            variant="destructive"
          >
            {isPending ? 'Удаляем…' : 'Удалить навсегда'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
