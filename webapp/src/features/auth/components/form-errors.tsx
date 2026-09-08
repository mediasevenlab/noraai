import { NoraToast } from '@/components/nora'

export function FormAlert({
  message,
  title = 'Ошибка авторизации',
}: {
  message: string | null
  title?: string
}) {
  if (!message) return null

  return (
    <NoraToast
      className="h-auto min-h-10 w-full items-start justify-start gap-2.5 py-2.5"
      variant="error"
    >
      <div className="min-w-0 grid gap-0.5 text-left">
        <p className="text-xs font-semibold text-[var(--nora-toast-text)]">{title}</p>
        <p className="text-[11px] leading-relaxed font-normal text-[color-mix(in_srgb,var(--nora-toast-text)_78%,transparent)]">
          {message}
        </p>
      </div>
    </NoraToast>
  )
}
