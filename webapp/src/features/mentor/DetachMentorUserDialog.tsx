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

export function DetachMentorUserDialog({
  error,
  isPending,
  onCancel,
  onConfirm,
  user,
}: {
  error: Error | null
  isPending: boolean
  onCancel: () => void
  onConfirm: () => void
  user: AdminUserSummary | null
}) {
  return (
    <AlertDialog
      open={user !== null}
      onOpenChange={(open) => {
        if (!open && !isPending) onCancel()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Отключить пользователя?</AlertDialogTitle>
          <AlertDialogDescription>
            {user
              ? `${user.email} исчезнет из вашего списка. Аккаунт пользователя не будет удалён.`
              : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Не удалось отключить пользователя</AlertTitle>
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
            {isPending ? 'Отключаем…' : 'Отключить'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
