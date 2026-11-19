import { useEffect, useState } from 'react'

import { useAuth } from '@/features/auth'
import { cn } from '@/lib/utils'

import { loadOpenProcurements, loadProcurementSync, type ProcurementOpenList, type ProcurementSync } from './api'

const TEXT = 'font-[family-name:var(--nora-font)] text-[14px] font-normal leading-5'

const LAWS = ['44-ФЗ', '223-ФЗ', 'ПП-615']

export function ProcurementsPage() {
  const transport = useAuth().transport
  const [list, setList] = useState<ProcurementOpenList | null>(null)
  const [sync, setSync] = useState<ProcurementSync | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let current = true
    setList(null)
    setSync(null)
    setError('')
    loadProcurementSync(transport)
      .then((next) => {
        if (current) setSync(next)
      })
      .catch(() => {
        if (current) setSync(null)
      })
    loadOpenProcurements(transport)
      .then((next) => {
        if (current) setList(next)
      })
      .catch((reason: unknown) => {
        if (current) setError(reason instanceof Error ? reason.message : 'ЕИС сейчас не отвечает.')
      })
    return () => {
      current = false
    }
  }, [transport])

  return (
    <div className="h-full min-h-0 overflow-y-auto" data-procurements-open="">
      <div className={cn('mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 text-[var(--nora-text)] lg:grid-cols-[minmax(0,1fr)_15rem]', TEXT)}>
        <div className="flex min-w-0 flex-col gap-2">
          <header className="flex flex-col gap-1 pb-2">
            <h1 className="text-[16px] font-medium leading-6">Открытые закупки</h1>
            <p className="text-[var(--nora-text-secondary)]">
              Десять извещений, где подача заявок ещё не кончилась. Вложенные файлы не скачиваются.
            </p>
            {sync ? <p className="text-[var(--nora-text-secondary)]">{syncLine(sync)}</p> : null}
          </header>
          {error ? <p className="text-[var(--nora-text-secondary)]">{error}</p> : null}
          {!list && !error ? <p className="text-[var(--nora-text-secondary)]">Смотрю открытые извещения…</p> : null}
          {list?.notices.map((notice) => (
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

function syncLine(sync: ProcurementSync) {
  if (!sync.running) return 'Фоновая выгрузка на этом запуске выключена.'
  const phase = sync.phase === 'catalog' ? 'первый проход' : 'ежедневное дополнение'
  const cut = sync.truncated > 0 ? ` Дней, где список оборвался: ${sync.truncated}.` : ''
  return `${phase}, ${sync.day}, страница ${sync.page}. В очереди ${sync.queued}, архивов ${sync.saved}, общий вес ${archiveWeight(sync.zipBytes)}.${cut}`
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
