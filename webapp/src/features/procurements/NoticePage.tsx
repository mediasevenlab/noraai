import { useEffect, useRef, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'

import { useAuth } from '@/features/auth'

import { loadProcurementNotice, type ProcurementNoticeCard } from './api'

const TEXT = 'font-[family-name:var(--nora-font)] text-[14px] font-normal leading-5'
const FIELD_KEY = 'nora-procurement-card-fields'

/** Service fields stay in the archive and in Nora's answers. The card hides them until the person turns them on. */
const HIDDEN_LABELS = new Set([
  'Статус',
  'Версия',
  'Не в реестре недобросовестных',
  'Признак места поставки',
  'Срочная закупка',
  'Совместная закупка',
  'Скрытая закупка',
  'Решение антимонопольного органа',
  'Полотовая закупка',
  'Смещение часового пояса',
  'Тип организации',
  'Редактирование лота',
  'Новые коды',
  'Преимущество нацрежима',
  'Запрет нацрежима',
  'Ограничение нацрежима',
  'Исключение нацрежима',
  'Для малого и среднего бизнеса',
  'Исключить из плана',
  'Требование о субподряде',
  'Не учитывать в закупках',
  'Централизованная закупка',
  'Совместный лот',
  'Регистрационный номер плана',
  'Идентификатор плана',
  'Номер позиции',
  'Позиция плана лота',
  'Идентификатор позиции',
  'Отменено',
])

type CardSection = ProcurementNoticeCard['sections'][number]

function fieldKey(section: string, label: string) {
  return `${section}\n${label}`
}

function readPrefs() {
  try {
    const raw = localStorage.getItem(FIELD_KEY)
    const parsed = raw ? JSON.parse(raw) as unknown : {}
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as Record<string, boolean>
  } catch {
    return {}
  }
}

function fieldVisible(section: string, label: string, prefs: Record<string, boolean>) {
  const stored = prefs[fieldKey(section, label)]
  if (typeof stored === 'boolean') return stored
  return !HIDDEN_LABELS.has(label)
}

function columnLabels(section: CardSection) {
  const seen = new Set<string>()
  const labels: string[] = []
  for (const field of section.fields) {
    if (seen.has(field.label)) continue
    seen.add(field.label)
    labels.push(field.label)
  }
  return labels
}

function FieldValue({ value }: { value: string }) {
  const lines = value.split('\n').map((line) => line.trim()).filter(Boolean)
  const url = lines.find((line) => /^https?:\/\//.test(line))
  const name = lines.find((line) => line !== url)
  if (!url) return value
  return (
    <a className="underline decoration-[var(--nora-border)] underline-offset-2" href={url} rel="noreferrer" target="_blank">
      {name || url}
    </a>
  )
}

function FieldFilter({
  sections,
  prefs,
  onToggle,
}: {
  sections: CardSection[]
  prefs: Record<string, boolean>
  onToggle: (section: string, label: string, visible: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={box}>
      <button
        aria-expanded={open}
        className="rounded-md border border-[var(--nora-border)] px-3 py-1 text-[var(--nora-text)]"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        Поля
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 max-h-[70vh] w-[min(92vw,960px)] overflow-auto rounded-md border border-[var(--nora-border)] bg-[var(--nora-panel)] p-4 shadow-lg">
          <div className="flex flex-wrap gap-x-8 gap-y-6">
            {sections.map((section) => (
              <div key={section.title} className="w-52">
                <p className="mb-2 font-medium">{section.title}</p>
                <ul className="flex flex-col gap-1.5">
                  {columnLabels(section).map((label) => {
                    const checked = fieldVisible(section.title, label, prefs)
                    return (
                      <li key={label}>
                        <label className="flex items-start gap-2">
                          <input
                            checked={checked}
                            className="mt-0.5"
                            type="checkbox"
                            onChange={() => onToggle(section.title, label, !checked)}
                          />
                          <span>{label}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function NoticePage() {
  const transport = useAuth().transport
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const number = pathname.split('/').filter(Boolean).at(-1) ?? ''
  const [card, setCard] = useState<ProcurementNoticeCard | null>(null)
  const [error, setError] = useState('')
  const [prefs, setPrefs] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setPrefs(readPrefs())
  }, [])

  useEffect(() => {
    let current = true
    setCard(null)
    setError('')
    loadProcurementNotice(transport, number)
      .then((next) => {
        if (current) setCard(next)
      })
      .catch(() => {
        if (current) setError('Карточка не открылась.')
      })
    return () => {
      current = false
    }
  }, [number, transport])

  function toggleField(section: string, label: string, visible: boolean) {
    const next = { ...prefs, [fieldKey(section, label)]: visible }
    setPrefs(next)
    localStorage.setItem(FIELD_KEY, JSON.stringify(next))
  }

  const sections = card?.sections ?? []

  return (
    <div className={`${TEXT} flex h-full min-h-0 flex-col text-[var(--nora-text)]`} data-procurement-notice="">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 pt-6 sm:px-6">
        <a className="text-[var(--nora-text-secondary)] underline decoration-[var(--nora-border)] underline-offset-2" href="/app/procurements">
          К списку
        </a>
        {sections.length > 0 ? <FieldFilter prefs={prefs} sections={sections} onToggle={toggleField} /> : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
          {error ? <p>{error}</p> : null}
          {!card && !error ? <p className="text-[var(--nora-text-secondary)]">Открываю карточку…</p> : null}
          {card ? (
            <>
              <header className="flex flex-col gap-2">
                <p className="text-[var(--nora-text-secondary)]">{card.law}</p>
                <h1 className="text-[22px] font-medium leading-7">{card.object}</h1>
                <p>№ {card.number}</p>
                {card.customer ? <p>{card.customer}</p> : null}
                <p>{card.price || 'Цена не указана'}</p>
                {card.deadline ? <p className="text-[var(--nora-text-secondary)]">Окончание подачи заявок: {card.deadline}</p> : null}
                {card.url ? (
                  <a className="underline decoration-[var(--nora-border)] underline-offset-2" href={card.url} rel="noreferrer" target="_blank">
                    Страница на zakupki.gov.ru
                  </a>
                ) : null}
              </header>
              {card.parsed && sections.length > 0 ? (
                sections.map((section, index) => {
                  const fields = section.fields.filter((field) => fieldVisible(section.title, field.label, prefs))
                  if (fields.length === 0) return null
                  return (
                    <section key={`${section.title}-${index}`} className="flex flex-col gap-3 border-t border-[var(--nora-border)] pt-4">
                      <h2 className="text-[16px] font-medium">{section.title}</h2>
                      <dl className="flex flex-col gap-3">
                        {fields.map((field, fieldIndex) => (
                          <div key={`${field.label}-${fieldIndex}`} className="grid gap-1 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-4">
                            <dt className="text-[var(--nora-text-secondary)]">{field.label}</dt>
                            <dd className="whitespace-pre-wrap break-words"><FieldValue value={field.value} /></dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  )
                })
              ) : (
                <p>Это извещение ещё разбирается. Пока видна только короткая карточка.</p>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
