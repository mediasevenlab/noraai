import type { UserDto } from '@web-app-demo/contracts'

function Row({
  label,
  value,
  isFirst = false,
}: {
  label: string
  value: string
  isFirst?: boolean
}) {
  return (
    <div
      className={
        isFirst
          ? 'flex items-center justify-between gap-3 py-2.5'
          : 'flex items-center justify-between gap-3 border-t border-[var(--nora-divider)] py-2.5'
      }
    >
      <span className="shrink-0 text-[12px] text-[var(--nora-text-tertiary)]">
        {label}
      </span>
      <span className="min-w-0 truncate text-right text-[12px] font-normal text-[var(--nora-text-secondary)]">
        {value}
      </span>
    </div>
  )
}

/** Simple identity card for mentor/admin profile pages. */
export function AccountProfileCard({ user }: { user: UserDto }) {
  return (
    <article className="overflow-hidden rounded-[var(--nora-radius-lg)] bg-[var(--dash-card-bg,var(--nora-panel))] shadow-[inset_0_0_0_1px_var(--dash-card-ring,var(--nora-border))]">
      <div className="border-b border-[var(--nora-divider)] p-3.5">
        <h2 className="text-[13px] font-semibold text-[var(--nora-text)]">
          Данные аккаунта
        </h2>
        <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--nora-text-tertiary)]">
          Основная информация профиля рабочей области.
        </p>
      </div>
      <div className="p-3.5">
        <Row
          isFirst
          label="Имя"
          value={user.displayName?.trim() || '—'}
        />
        <Row label="Email" value={user.email} />
        <Row label="Никнейм" value={user.nickname ?? '—'} />
        <Row label="ID" value={String(user.publicId)} />
        <Row
          label="Роль"
          value={
            user.role === 'admin'
              ? 'Администратор'
              : user.role === 'mentor'
                ? 'Наставник'
                : 'Пользователь'
          }
        />
      </div>
    </article>
  )
}
