import { useEffect, useState } from 'react'

import { useAuth } from '@/features/auth'
import { cn } from '@/lib/utils'

import { loadProcurementSync, loadSavedProcurements, type ProcurementSavedPage, type ProcurementSync } from './api'

const TEXT = 'font-[family-name:var(--nora-font)] text-[14px] font-normal leading-5'

const LAWS = ['44-ФЗ', '223-ФЗ', 'ПП-615']

export function ProcurementsPage() {
  const transport = useAuth().transport
  const [page, setPage] = useState(1)
  const [list, setList] = useState<ProcurementSavedPage | null>(null)
  const [sync, setSync] = useState<ProcurementSync | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let current = true
    setError('')
    const load = () => {
      loadProcurementSync(transport)
        .then((next) => {
          if (current) setSync(next)
        })
        .catch(() => {
          if (current) setSync(null)
        })
      loadSavedProcurements(transport, page)
        .then((next) => {
          if (!current) return
          setList(next)
          if (next.page !== page) setPage(next.page)
        })
        .catch((reason: unknown) => {
          if (current) setError(reason instanceof Error ? reason.message : 'Список закупок не открылся.')
        })
    }
    load()
    const timer = setInterval(load, 30_000)
    return () => {
      current = false
      clearInterval(timer)
    }
  }, [transport, page])

  const notices = list?.notices ?? []

  return (
    <div className="h-full min-h-0 overflow-y-auto" data-procurements-open="">
      <div className={cn('mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 text-[var(--nora-text)] lg:grid-cols-[minmax(0,1fr)_15rem]', TEXT)}>
        <div className="flex min-w-0 flex-col gap-2">
          <header className="flex flex-col gap-3 pb-2">
            <h1 className="text-[16px] font-medium leading-6">Открытые закупки</h1>
            {sync ? <DownloadProgress sync={sync} /> : null}
            <p className="text-[var(--nora-text-secondary)]">
              {list ? `Сохранено ${grouped(list.total)}. На странице 50 карточек, список растёт вместе с выгрузкой.` : 'Смотрю сохранённые извещения…'}
            </p>
          </header>
          {error ? <p className="text-[var(--nora-text-secondary)]">{error}</p> : null}
          {list && notices.length === 0 && !error ? (
            <p className="text-[var(--nora-text-secondary)]">Сохранённых извещений пока нет.</p>
          ) : null}
          {notices.map((notice) => (
            <article key={notice.number} className="grid gap-3 border-t border-[var(--nora-border)] py-4 sm:grid-cols-[minmax(0,1fr)_11rem] sm:gap-6">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-[var(--nora-text-secondary)]">{notice.law}</p>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <a
                    className="underline decoration-[var(--nora-border)] underline-offset-2"
                    href={notice.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    № {notice.number}
                  </a>
                  <span>{notice.status}</span>
                </div>
                <h2 className="mt-1 text-[15px] font-medium leading-6">{notice.object}</h2>
                {notice.customer ? <p className="text-[var(--nora-text-secondary)]">{notice.customer}</p> : null}
              </div>
              <div className="flex flex-col gap-3 sm:items-end sm:text-right">
                <div>
                  <p className="text-[var(--nora-text-secondary)]">Начальная цена</p>
                  <p>{notice.price || '—'}</p>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-1">
                  <DateLine label="Размещено" value={notice.published} />
                  <DateLine label="Обновлено" value={notice.updated} />
                  <div className="col-span-2 sm:col-span-1">
                    <DateLine label="Окончание подачи заявок" value={notice.deadline} />
                  </div>
                </dl>
              </div>
            </article>
          ))}
          {list && list.total > 0 ? (
            <nav aria-label="Страницы закупок" className="flex items-center justify-between gap-3 border-t border-[var(--nora-border)] pt-4">
              <button
                className="disabled:opacity-40"
                disabled={list.page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                Назад
              </button>
              <p className="text-[var(--nora-text-secondary)]">
                Страница {grouped(list.page)} из {grouped(list.pageCount)}
              </p>
              <button
                className="disabled:opacity-40"
                disabled={list.page >= list.pageCount}
                onClick={() => setPage((current) => current + 1)}
                type="button"
              >
                Дальше
              </button>
            </nav>
          ) : null}
        </div>
        <aside className="flex flex-col gap-4 lg:pt-1">
          <h2 className="text-[15px] font-medium leading-6">Параметры</h2>
          <div className="flex flex-col gap-1">
            <p className="text-[var(--nora-text-secondary)]">Закон</p>
            <ul>
              {LAWS.map((law) => (
                <li key={law}>{law}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[var(--nora-text-secondary)]">Этап</p>
            <p>Подача заявок</p>
          </div>
          <p className="text-[var(--nora-text-secondary)]">
            Поиск и остальные фильтры заработают на сохранённом наборе открытых заявок.
          </p>
        </aside>
      </div>
    </div>
  )
}

function DownloadProgress({ sync }: { sync: ProcurementSync }) {
  if (!sync.running) {
    return <p className="text-[var(--nora-text-secondary)]">Фоновая выгрузка на этом запуске выключена.</p>
  }
  const ratio = sync.cellsTotal > 0 ? Math.min(100, (sync.cellsDone / sync.cellsTotal) * 100) : 0
  const shown = ratio < 10 ? ratio.toFixed(1).replace('.', ',') : String(Math.round(ratio))
  return (
    <div className="flex flex-col gap-2">
      <div className="h-1 overflow-hidden rounded-full bg-[var(--nora-border)]">
        <div className="h-full bg-[var(--nora-text)]" style={{ width: `${ratio}%` }} />
      </div>
      <p className="text-[var(--nora-text-secondary)]">
        {sync.day}. Пройдено {grouped(sync.cellsDone)} из {grouped(sync.cellsTotal)} ({shown}%). Осталось {sync.eta}. Сохранено {grouped(sync.saved)}, закрытых снято {grouped(sync.dropped)}, общий вес {archiveWeight(sync.zipBytes)}.
      </p>
    </div>
  )
}

function grouped(value: number) {
  return new Intl.NumberFormat('ru-RU').format(value)
}

function archiveWeight(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`
  const kilo = bytes / 1024
  if (kilo < 1024) return `${Math.round(kilo)} КБ`
  const mega = kilo / 1024
  if (mega < 1024) return `${mega.toFixed(1).replace('.', ',')} МБ`
  return `${(mega / 1024).toFixed(1).replace('.', ',')} ГБ`
}

function DateLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--nora-text-secondary)]">{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  )
}
