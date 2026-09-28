import { EyeIcon, EyeOffIcon } from 'lucide-react'

import { authFieldAdornmentClassName, authFieldIconClassName } from './auth-control-styles'

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
      className={`${authFieldAdornmentClassName} border-0 bg-transparent text-[var(--nora-text-secondary)] outline-none transition-colors hover:text-[var(--nora-text)] focus-visible:text-[var(--nora-text)] focus-visible:shadow-[var(--nora-shadow-focus)]`}
      onClick={onToggle}
      onMouseDown={(event) => {
        // Keep focus in the password field while toggling.
        event.preventDefault()
      }}
      type="button"
    >
      {visible ? (
        <EyeOffIcon aria-hidden className={authFieldIconClassName} strokeWidth={1.75} />
      ) : (
        <EyeIcon aria-hidden className={authFieldIconClassName} strokeWidth={1.75} />
      )}
    </button>
  )
}
