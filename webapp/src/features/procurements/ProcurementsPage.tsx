import { useEffect, useState } from 'react'

import { useAuth } from '@/features/auth'
import { cn } from '@/lib/utils'

import { loadProcurementSync, loadSavedProcurements, type ProcurementSavedPage, type ProcurementSync } from './api'

const TEXT = 'font-[family-name:var(--nora-font)] text-[14px] font-normal leading-5'

const LAWS = [
  { id: '44', label: '44-ФЗ' },
  { id: '223', label: '223-ФЗ' },
  { id: '615', label: 'ПП-615' },
] as const

export function ProcurementsPage() {
  const transport = useAuth().transport
  const [page, setPage] = useState(1)
  const [draft, setDraft] = useState('')
  const [phrases, setPhrases] = useState<string[]>([])
  const [memory, setMemory] = useState<string[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [rank, setRank] = useState(false)
  const [laws, setLaws] = useState<string[]>([])
  const [list, setList] = useState<ProcurementSavedPage | null>(null)
  const [sync, setSync] = useState<ProcurementSync | null>(null)
  const [error, setError] = useState('')
  const lawsKey = laws.join(',')
  const phrasesKey = phrases.join('\n')
  const narrowed = phrases.length > 0 || laws.length > 0
  const typed = foldPhrase(draft)
  const suggestions = memory.filter((item) => !phrases.includes(item) && (!typed || item.includes(typed))).slice(0, 8)

  useEffect(() => {
    setMemory(readPhrases())
  }, [])

  useEffect(() => {
    setPage(1)
  }, [phrasesKey, rank, lawsKey])

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
      loadSavedProcurements(transport, page, { phrases, laws, rank })
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
    const syncTimer = setInterval(() => {
      loadProcurementSync(transport)
        .then((next) => {
          if (current) setSync(next)
        })
        .catch(() => {
          if (current) setSync(null)
        })
    }, 10_000)
    const listTimer = setInterval(load, 30_000)
    return () => {
      current = false
      clearInterval(syncTimer)
      clearInterval(listTimer)
    }
  }, [transport, page, phrasesKey, rank, lawsKey])

  const notices = list?.notices ?? []

  return (
    <div className="h-full min-h-0 overflow-y-auto" data-procurements-open="">
      <div className={cn('mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 text-[var(--nora-text)] lg:grid-cols-[minmax(0,1fr)_15rem]', TEXT)}>
        <div className="order-2 flex min-w-0 flex-col gap-2 lg:order-1">
          <header className="flex flex-col gap-3 pb-2">
            <h1 className="text-[16px] font-medium leading-6">Открытые закупки</h1>
            {sync ? <DownloadProgress sync={sync} /> : null}
            <p className="text-[var(--nora-text-secondary)]">
              {list
                ? `${narrowed ? 'Найдено' : 'Сохранено'} ${grouped(list.total)}. На странице 50 карточек.`
                : 'Смотрю сохранённые извещения…'}
            </p>
          </header>
          {error ? <p className="text-[var(--nora-text-secondary)]">{error}</p> : null}
          {list && notices.length === 0 && !error ? (
            <p className="text-[var(--nora-text-secondary)]">
              {narrowed ? 'По этому запросу ничего нет.' : 'Сохранённых извещений пока нет.'}
            </p>
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
                {rank && phrases.length > 0 ? (
                  <p className="text-[var(--nora-text-secondary)]">Совпало ключей: {notice.matches}</p>
                ) : null}
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
        <aside className="order-1 flex flex-col gap-4 lg:order-2 lg:pt-1">
          <h2 className="text-[15px] font-medium leading-6">Параметры</h2>
          <div className="flex flex-col gap-2">
            {phrases.length > 0 ? (
              <ul className="flex flex-wrap gap-1">
                {phrases.map((phrase) => (
                  <li key={phrase} className="inline-flex items-center gap-1 rounded-md border border-[var(--nora-border)] px-2 py-0.5">
                    {phrase}
                    <button
                      aria-label={`Убрать ${phrase}`}
                      className="text-[var(--nora-text-secondary)]"
                      onClick={() => setPhrases((current) => current.filter((item) => item !== phrase))}
                      type="button"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="relative">
            <input
              aria-label="Поиск закупок"
              className="w-full border-b border-[var(--nora-border)] bg-transparent pb-1 outline-none"
              data-procurements-search=""
              onBlur={() => setMenuOpen(false)}
              onChange={(event) => {
                setDraft(event.target.value)
                setMenuOpen(true)
              }}
              onFocus={() => setMenuOpen(true)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addPhrase(draft, phrases, setPhrases, setMemory)
                  setDraft('')
                  setMenuOpen(false)
                }
                if (event.key === 'Backspace' && draft === '') setPhrases((current) => current.slice(0, -1))
                if (event.key === 'Escape') setMenuOpen(false)
              }}
              placeholder="Фраза и Enter"
              value={draft}
            />
            {menuOpen && suggestions.length > 0 ? (
              <ul className="absolute top-full z-10 mt-1 flex w-full flex-col border border-[var(--nora-border)] bg-[var(--nora-panel)]">
                {suggestions.map((phrase) => (
                  <li key={phrase} className="flex items-center gap-2">
                    <button
                      className="min-w-0 flex-1 px-2 py-1 text-left"
                      onMouseDown={(event) => {
                        event.preventDefault()
                        addPhrase(phrase, phrases, setPhrases, setMemory)
                        setDraft('')
                      }}
                      type="button"
                    >
                      {phrase}
                    </button>
                    <button
                      aria-label={`Удалить ${phrase} из списка`}
                      className="px-2 py-1 text-[var(--nora-text-secondary)]"
                      onMouseDown={(event) => {
                        event.preventDefault()
                        forgetPhrase(phrase, setMemory)
                      }}
                      type="button"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            </div>
            <p className="text-[var(--nora-text-secondary)]">Ищет карточки, где есть хотя бы одна фраза.</p>
            <label className="mt-2 flex items-center gap-2">
              <input
                checked={rank}
                disabled={phrases.length === 0}
                onChange={() => setRank((current) => !current)}
                type="checkbox"
              />
              По числу совпадений
            </label>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[var(--nora-text-secondary)]">Закон</p>
            {LAWS.map((law) => (
              <label key={law.id} className="flex items-center gap-2">
                <input
                  checked={laws.includes(law.id)}
                  onChange={() => {
                    setLaws((current) => current.includes(law.id)
                      ? current.filter((item) => item !== law.id)
                      : [...current, law.id])
                  }}
                  type="checkbox"
                />
                {law.label}
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[var(--nora-text-secondary)]">Этап</p>
            <p>Подача заявок</p>
          </div>
          <p className="text-[var(--nora-text-secondary)]">
            ПП-615 пока не скачивается. Когда срок подачи заявок проходит, карточка и архив удаляются.
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
  const firstPass = sync.phase === 'packs'
  const waiting = !firstPass && sync.sweepTotal > 0 && sync.sweepDone >= sync.sweepTotal
  return (
    <div className="flex flex-col gap-4">
      <Meter
        done={sync.sweepDone}
        label="Выгрузка"
        lines={[
          `${waiting ? 'Последняя позиция' : 'Сейчас'}: ${sync.day}`,
          firstPass
            ? `Первый проход: ${grouped(sync.cellsDone)} из ${grouped(sync.cellsTotal)}`
            : 'Первый проход закончен',
          firstPass
            ? `Осталось ${sync.sweepNote}`
            : `Подкачка: ${sync.sweepNote}. ${grouped(sync.sweepDone)} из ${grouped(sync.sweepTotal)}`,
          `Сохранено: ${grouped(sync.saved)}`,
          `Закрытых не записано: ${grouped(sync.dropped)}`,
          `Архив: ${archiveWeight(sync.zipBytes)}`,
        ]}
        total={sync.sweepTotal}
      />
      <Meter
        done={sync.indexed}
        label="Разбор для поиска"
        lines={[
          `Разобрано: ${grouped(sync.indexed)} из ${grouped(sync.saved)}`,
          'По разобранным поиск идёт по тексту извещения. По остальным — по номеру, предмету и заказчику.',
        ]}
        total={sync.saved}
      />
    </div>
  )
}

function Meter({ done, label, lines, total }: { done: number; label: string; lines: string[]; total: number }) {
  const ratio = total > 0 ? Math.min(100, (done / total) * 100) : 0
  const shown = ratio > 0 && ratio < 10 ? ratio.toFixed(1).replace('.', ',') : String(Math.round(ratio))
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-medium leading-6">{label}</h2>
        <p className="text-[var(--nora-text-secondary)]">{shown}%</p>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-[var(--nora-border)]" aria-hidden="true">
        <div className="h-full bg-[var(--nora-text)]" style={{ width: `${ratio}%` }} />
      </div>
      <ul className="flex flex-col gap-1 text-[var(--nora-text-secondary)]">
        {lines.map((line) => <li key={line}>{line}</li>)}
      </ul>
    </section>
  )
}

function addPhrase(
  value: string,
  phrases: string[],
  setPhrases: (value: string[] | ((current: string[]) => string[])) => void,
  setMemory: (value: string[] | ((current: string[]) => string[])) => void,
) {
  const phrase = foldPhrase(value)
  if (!phrase || phrases.includes(phrase) || phrases.length >= 8) return
  setPhrases((current) => current.includes(phrase) || current.length >= 8 ? current : [...current, phrase])
  setMemory((current) => {
    const next = [phrase, ...current.filter((item) => item !== phrase)].slice(0, 24)
    writePhrases(next)
    return next
  })
}

function forgetPhrase(phrase: string, setMemory: (value: string[] | ((current: string[]) => string[])) => void) {
  setMemory((current) => {
    const next = current.filter((item) => item !== phrase)
    writePhrases(next)
    return next
  })
}

function foldPhrase(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').slice(0, 80)
}

function readPhrases() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PHRASE_KEY) ?? '[]') as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string' && foldPhrase(item) === item).slice(0, 24)
  } catch {
    return []
  }
}

function writePhrases(phrases: string[]) {
  localStorage.setItem(PHRASE_KEY, JSON.stringify(phrases))
}

const PHRASE_KEY = 'nora-procurement-phrases'

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
