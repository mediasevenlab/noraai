import { useEffect, useState } from 'react'
import type { UserDto } from '@web-app-demo/contracts'

import { SettingsCanvas, SettingsEntry } from '@/components/settings-canvas'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/features/auth'

import { createCompany, deleteCompany, loadCompanies, updateCompany, type Company } from './api'
import { notifyCompanyCatalog } from './selection'

export function CompaniesPage({ user }: { user: UserDto }) {
  const transport = useAuth().transport
  const [companies, setCompanies] = useState<Company[]>([])
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    let current = true
    loadCompanies(transport)
      .then((result) => {
        if (current) setCompanies(result.companies)
      })
      .catch((reason: unknown) => {
        if (current) setError(reason instanceof Error ? reason.message : 'Не удалось открыть компании')
      })
    return () => {
      current = false
    }
  }, [transport])

  function replace(next: Company) {
    setCompanies((current) => current.map((company) => company.id === next.id ? next : company))
    notifyCompanyCatalog()
  }

  async function add() {
    setError('')
    setPending(true)
    try {
      const company = await createCompany(transport, 'Новая компания')
      setCompanies((current) => [...current, company])
      setOpenId(company.id)
      notifyCompanyCatalog()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось добавить компанию')
    } finally {
      setPending(false)
    }
  }

  const opened = companies.find((company) => company.id === openId) ?? null

  return (
    <SettingsCanvas
      actions={(
        <button
          className="inline-flex h-8 items-center rounded-full border border-border bg-card px-3 text-[13px] font-medium text-foreground disabled:opacity-60"
          disabled={pending}
          type="button"
          onClick={() => void add()}
        >
          Добавить
        </button>
      )}
      description="Описание и ключевые слова, по которым в диалоге ищутся подходящие закупки."
      eyebrow="Аккаунт"
      meta={user.email}
      phoneSheet
      showJumpLink={false}
      showMobileTitle
      title="Компании"
    >
      <SettingsEntry
        description="Включённая компания появляется в кнопке закупок. Нажмите карточку, чтобы переименовать её и записать описание."
        hideTitleOnMobile={false}
        controlsClassName="px-4 py-4"
        title="Карточки"
      >
        {error ? <p className="mb-3 text-[13px] text-[var(--nora-error)]">{error}</p> : null}
        {companies.length === 0 ? (
          <p className="font-[family-name:var(--nora-font)] text-[13px] leading-5 text-[var(--nora-text-secondary)]">
            Пока нет компаний.
          </p>
        ) : (
          <ul className="flex flex-col">
            {companies.map((company) => (
              <li key={company.id} className="flex items-center gap-4 border-t border-[var(--nora-divider)] py-3 first:border-t-0 first:pt-1 last:pb-1">
                <button
                  className="min-w-0 flex-1 py-1.5 text-left"
                  data-text-button=""
                  type="button"
                  onClick={() => setOpenId(company.id)}
                >
                  <div className="truncate font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]">
                    {company.name}
                  </div>
                  <div className="mt-1 truncate font-[family-name:var(--nora-font)] text-[12px] leading-5 text-[var(--nora-text-tertiary)]">
                    {company.prompt.trim() || 'Описание не заполнено'}
                  </div>
                </button>
                <Switch
                  aria-label={company.enabled ? `Выключить ${company.name}` : `Включить ${company.name}`}
                  checked={company.enabled}
                  onCheckedChange={(enabled) => {
                    const previous = company.enabled
                    replace({ ...company, enabled })
                    void updateCompany(transport, company.id, { enabled }).catch((reason: unknown) => {
                      replace({ ...company, enabled: previous })
                      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить')
                    })
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </SettingsEntry>
      {opened ? (
        <CompanyDialog
          company={opened}
          onClose={() => setOpenId(null)}
          onDelete={async () => {
            await deleteCompany(transport, opened.id)
            setCompanies((current) => current.filter((company) => company.id !== opened.id))
            setOpenId(null)
            notifyCompanyCatalog()
          }}
          onSave={async (patch) => {
            const saved = await updateCompany(transport, opened.id, patch)
            replace(saved)
            setOpenId(null)
          }}
        />
      ) : null}
    </SettingsCanvas>
  )
}

function CompanyDialog({
  company,
  onClose,
  onDelete,
  onSave,
}: {
  company: Company
  onClose: () => void
  onDelete: () => Promise<void>
  onSave: (patch: { name: string; prompt: string }) => Promise<void>
}) {
  const [name, setName] = useState(company.name)
  const [prompt, setPrompt] = useState(company.prompt)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setError('')
    setPending(true)
    try {
      await onSave({ name, prompt })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить')
      setPending(false)
    }
  }

  async function remove() {
    setError('')
    setPending(true)
    try {
      await onDelete()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось удалить')
      setPending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onMouseDown={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-[var(--nora-panel)] p-4 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="company-dialog-title" className="font-heading text-[20px] font-bold tracking-[-0.02em]">Компания</h2>
        <label className="mt-4 block font-[family-name:var(--nora-font)] text-[13px] font-medium" htmlFor="company-name">
          Название
        </label>
        <input
          id="company-name"
          className="mt-1 h-10 w-full rounded-xl bg-[var(--nora-inset)] px-3 text-[16px] outline-none lg:text-[13px]"
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <label className="mt-3 block font-[family-name:var(--nora-font)] text-[13px] font-medium" htmlFor="company-prompt">
          Описание и ключевые слова
        </label>
        <textarea
          id="company-prompt"
          className="mt-1 min-h-40 w-full resize-y rounded-xl bg-[var(--nora-inset)] px-3 py-2 text-[16px] leading-5 outline-none lg:text-[13px]"
          maxLength={4000}
          placeholder="Чем занимается компания и по каким словам искать закупки"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
        {error ? <p className="mt-2 text-[13px] text-[var(--nora-error)]">{error}</p> : null}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          {confirmDelete ? (
            <button className="text-[13px] text-[var(--nora-error)]" disabled={pending} type="button" onClick={() => void remove()}>
              Удалить компанию
            </button>
          ) : (
            <button className="text-[13px] text-[var(--nora-error)]" disabled={pending} type="button" onClick={() => setConfirmDelete(true)}>
              Удалить
            </button>
          )}
          <div className="flex gap-2">
            <button className="h-8 rounded-full px-3 text-[13px]" type="button" onClick={onClose}>Закрыть</button>
            <button
              className="h-8 rounded-full bg-[var(--nora-text)] px-3 text-[13px] text-[var(--nora-panel)] disabled:opacity-60"
              disabled={pending || name.trim().length === 0}
              type="button"
              onClick={() => void save()}
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
