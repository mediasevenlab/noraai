import type { AdminUserSummary, UserRole } from '@web-app-demo/contracts'

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

const roleLabels: Record<UserRole, string> = {
  admin: 'администратором',
  mentor: 'наставником',
  user: 'пользователем',
}

export function RoleChangeDialog({
  error,
  isPending,
  onCancel,
  onConfirm,
  pendingChange,
}: {
  error: Error | null
  isPending: boolean
  onCancel: () => void
  onConfirm: () => void
  pendingChange: {
    role: UserRole
    user: AdminUserSummary
  } | null
}) {
  return (
    <AlertDialog
      open={pendingChange !== null}
      onOpenChange={(open) => {
        if (!open && !isPending) onCancel()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Изменить роль пользователя?</AlertDialogTitle>
          <AlertDialogDescription>
            {pendingChange
              ? `${pendingChange.user.email} станет ${roleLabels[pendingChange.role]}. Активные сессии будут отозваны.`
              : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Роль не изменена</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Отмена</AlertDialogCancel>
          <Button disabled={isPending} onClick={onConfirm}>
            {isPending ? 'Изменяем…' : 'Изменить роль'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
