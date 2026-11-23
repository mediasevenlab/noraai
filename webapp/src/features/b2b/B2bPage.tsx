import { useEffect, useState } from 'react'

import { useAuth } from '@/features/auth'
import { cn } from '@/lib/utils'

import { loadB2bProcedures, type B2bPage } from './api'

const TEXT = 'font-[family-name:var(--nora-font)] text-[14px] font-normal leading-5'

export function B2bCenterPage() {
  const transport = useAuth().transport
  const [page, setPage] = useState<B2bPage | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let current = true
    setPage(null)
    setError('')
    loadB2bProcedures(transport)
      .then((next) => {
        if (current) setPage(next)
      })
      .catch((reason: unknown) => {
        if (current) setError(reason instanceof Error ? reason.message : 'Список B2B-Center не открылся.')
      })
    return () => {
      current = false
    }
  }, [transport])

  const notices = page?.notices ?? []

  return (
    <div className="h-full min-h-0 overflow-y-auto" data-b2b-open="">
      <div className={cn('mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-6 text-[var(--nora-text)]', TEXT)}>
        <header className="flex flex-col gap-1 pb-2">
          <h1 className="text-[16px] font-medium leading-6">B2B-Center</h1>
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
              <div>
                <p className="text-[var(--nora-text-secondary)]">Статус</p>
                <p>{notice.status}</p>
              </div>
              <div>
                <p className="text-[var(--nora-text-secondary)]">Начало</p>
                <p>{notice.published || '—'}</p>
              </div>
              <div>
                <p className="text-[var(--nora-text-secondary)]">Вскрытие</p>
                <p>{notice.deadline || '—'}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
