import { EyeIcon, EyeOffIcon } from 'lucide-react'

/** Visibility toggle that stays vertically centered inside an auth field. */
export function AuthPasswordToggleButton({
  visible,
  onToggle,
}: {
  visible: boolean
  onToggle: () => void
}) {
  return (
    <button
      aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
      aria-pressed={visible}
      className="absolute inset-y-0 right-0 z-[2] flex w-9 items-center justify-center border-0 bg-transparent text-[var(--nora-text-tertiary)] outline-none transition-colors hover:text-[var(--nora-text)] focus-visible:text-[var(--nora-text)] focus-visible:shadow-[var(--nora-shadow-focus)]"
      onClick={onToggle}
      onMouseDown={(event) => {
        // Keep focus in the password field while toggling.
        event.preventDefault()
      }}
      type="button"
    >
      {visible ? (
        <EyeOffIcon aria-hidden className="size-3.5" />
      ) : (
        <EyeIcon aria-hidden className="size-3.5" />
      )}
    </button>
  )
}
