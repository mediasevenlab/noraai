import { useEffect, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'

import { useAuth } from '@/features/auth'

import { loadProcurementNotice, type ProcurementNoticeCard } from './api'

const TEXT = 'font-[family-name:var(--nora-font)] text-[14px] font-normal leading-5'

function FieldValue({ value }: { value: string }) {
  if (!/^https?:\/\//.test(value)) return value
  return (
    <a className="underline decoration-[var(--nora-border)] underline-offset-2" href={value} rel="noreferrer" target="_blank">
      {value}
    </a>
  )
}

export function NoticePage() {
  const transport = useAuth().transport
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const number = pathname.split('/').filter(Boolean).at(-1) ?? ''
  const [card, setCard] = useState<ProcurementNoticeCard | null>(null)
  const [error, setError] = useState('')

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

  return (
    <div className={`${TEXT} h-full min-h-0 overflow-y-auto text-[var(--nora-text)]`} data-procurement-notice="">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
        <a className="text-[var(--nora-text-secondary)] underline decoration-[var(--nora-border)] underline-offset-2" href="/app/procurements">
          К списку
        </a>
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
            {card.parsed && card.sections.length > 0 ? (
              card.sections.map((section, index) => (
                <section key={`${section.title}-${index}`} className="flex flex-col gap-3 border-t border-[var(--nora-border)] pt-4">
                  <h2 className="text-[16px] font-medium">{section.title}</h2>
                  <dl className="flex flex-col gap-3">
                    {section.fields.map((field, fieldIndex) => (
                      <div key={`${field.label}-${fieldIndex}`} className="grid gap-1 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
                        <dt className="text-[var(--nora-text-secondary)]">{field.label}</dt>
                        <dd className="whitespace-pre-wrap break-words"><FieldValue value={field.value} /></dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))
            ) : (
              <p>Это извещение ещё разбирается. Пока видна только короткая карточка.</p>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
