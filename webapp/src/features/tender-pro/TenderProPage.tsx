import { useEffect, useState } from 'react'

import { useAuth } from '@/features/auth'
import { cn } from '@/lib/utils'

import { loadTenderProProcedures, type TenderProPage as TenderProList } from './api'

const TEXT = 'font-[family-name:var(--nora-font)] text-[14px] font-normal leading-5'

export function TenderProPage() {
  const transport = useAuth().transport
  const [page, setPage] = useState<TenderProList | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let current = true
    setPage(null)
    setError('')
    loadTenderProProcedures(transport)
      .then((next) => {
        if (current) setPage(next)
      })
      .catch((reason: unknown) => {
        if (current) setError(reason instanceof Error ? reason.message : 'Список Tender.pro не открылся.')
      })
    return () => {
      current = false
    }
  }, [transport])

  const notices = page?.notices ?? []

  return (
    <div className="h-full min-h-0 overflow-y-auto" data-tender-pro-open="">
      <div className={cn('mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-6 text-[var(--nora-text)]', TEXT)}>
        <header className="flex flex-col gap-1 pb-2">
          <h1 className="text-[16px] font-medium leading-6">Tender.pro</h1>
          <p className="text-[var(--nora-text-secondary)]">
            {page?.message ?? (error ? '' : 'Смотрю процедуры…')}
          </p>
        </header>
        {error ? <p className="text-[var(--nora-text-secondary)]">{error}</p> : null}
        {notices.map((notice) => (
          <article key={notice.number} className="grid gap-3 border-t border-[var(--nora-border)] py-4 sm:grid-cols-[minmax(0,1fr)_11rem] sm:gap-6">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-[var(--nora-text-secondary)]">{notice.law}</p>
              <a
                className="underline decoration-[var(--nora-border)] underline-offset-2"
                href={notice.url}
                rel="noreferrer"
                target="_blank"
              >
                № {notice.number}
              </a>
              <h2 className="mt-1 text-[15px] font-medium leading-6">{notice.object}</h2>
              {notice.customer ? <p className="text-[var(--nora-text-secondary)]">{notice.customer}</p> : null}
            </div>
            <div className="flex flex-col gap-3 sm:items-end sm:text-right">
              {notice.price ? (
                <div>
                  <p className="text-[var(--nora-text-secondary)]">Цена</p>
                  <p>{notice.price}</p>
                </div>
              ) : null}
              <div>
                <p className="text-[var(--nora-text-secondary)]">Статус</p>
                <p>{notice.status}</p>
              </div>
              <div>
                <p className="text-[var(--nora-text-secondary)]">Открытие</p>
                <p>{notice.published || '—'}</p>
              </div>
              <div>
                <p className="text-[var(--nora-text-secondary)]">Окончание</p>
                <p>{notice.deadline || '—'}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
