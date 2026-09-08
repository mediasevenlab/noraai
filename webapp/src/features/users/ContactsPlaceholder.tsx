export function ContactsPlaceholder() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--nora-radius-lg)] bg-[var(--dash-card-bg,var(--nora-panel))] shadow-[inset_0_0_0_1px_var(--dash-card-ring,var(--nora-border))]">
      <div className="border-b border-[var(--nora-divider)] p-3.5">
        <h2 className="text-[13px] font-semibold text-[var(--nora-text)]">Контакты</h2>
        <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--nora-text-tertiary)]">
          Телефон, мессенджеры и способы связи.
        </p>
      </div>
      <div className="grid gap-3 p-3.5">
        <div className="rounded-[var(--nora-radius-md)] bg-[var(--nora-inset)] px-3 py-8 text-center">
          <p className="text-[13px] font-medium text-[var(--nora-text-secondary)]">
            Раздел в разработке
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--nora-text-tertiary)]">
            Здесь появятся контактные данные клиента.
          </p>
        </div>
      </div>
    </div>
  )
}
