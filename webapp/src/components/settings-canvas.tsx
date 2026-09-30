import { useNavigate } from '@tanstack/react-router'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { ArrowUpRightIcon, CheckIcon, PencilIcon, XIcon, type LucideIcon } from '@/components/icons'

import { userGeneralSearch } from '@/features/navigation'

import { cn } from '@/lib/utils'

/** Как дата под названием приёма. */
const settingsCaptionClass =
  'font-[family-name:var(--nora-font)] text-[12px] font-normal leading-5 text-[var(--nora-text-tertiary)]'

/** Как строка состава в окне приёма. */
const settingsBodyClass =
  'line-clamp-2 overflow-hidden font-[family-name:var(--nora-font)] text-[13px] font-[250] leading-5 whitespace-normal text-[var(--nora-text-secondary)]'

/**
 * Поля и кнопки: кегль 13px. На телефоне у настоящих полей ввода вычисленный
 * кегль 16px (иначе iOS зумит фокус), а рисуется он как 14px — см. index.css.
 * Кнопки и списки зума не вызывают, поэтому у них кегль сразу 13px.
 * Высота на узком экране 40px у кнопок (зона нажатия), у полей после масштаба 32px.
 */
const settingsControlsClass = cn(
  'mt-4 rounded-[16px] bg-[var(--settings-substrate,var(--nora-inset))] px-3.5 py-3.5',
  '[&_form]:!gap-2.5',
  '[&_[data-slot=field-group]]:!mt-0',
  '[&_[data-slot=field-label]]:!mb-0.5 [&_[data-slot=field-label]]:!font-[family-name:var(--nora-font)] [&_[data-slot=field-label]]:!text-[13px] [&_[data-slot=field-label]]:!font-medium [&_[data-slot=field-label]]:!leading-5 [&_[data-slot=field-label]]:!text-[var(--nora-text)]',
  '[&_[data-slot=field-description]]:!mt-0 [&_[data-slot=field-description]]:!font-[family-name:var(--nora-font)] [&_[data-slot=field-description]]:!text-[12px] [&_[data-slot=field-description]]:!font-light [&_[data-slot=field-description]]:!leading-5 [&_[data-slot=field-description]]:!text-[var(--nora-text-tertiary)]',
  '[&_[data-slot=input]]:!bg-[var(--settings-field-bg,var(--nora-panel))] [&_[data-slot=input]]:!px-3 [&_[data-slot=input]]:!text-[16px] [&_[data-slot=input]]:!font-normal [&_[data-slot=input]]:!leading-5',
  '[&_[data-slot=input]:disabled]:!bg-[var(--settings-field-bg,var(--nora-panel))] [&_[data-slot=input]:disabled]:!opacity-100 [&_[data-slot=input]:disabled]:!text-[var(--nora-text-secondary)]',
  'lg:[&_[data-slot=input]]:!h-8 lg:[&_[data-slot=input]]:!min-h-8 lg:[&_[data-slot=input]]:!text-[13px]',
  '[&_[data-slot=select-trigger]]:!h-10 [&_[data-slot=select-trigger]]:!min-h-10 [&_[data-slot=select-trigger]]:!bg-[var(--settings-field-bg,var(--nora-panel))] [&_[data-slot=select-trigger]]:!px-3 [&_[data-slot=select-trigger]]:!text-[13px] [&_[data-slot=select-trigger]]:!font-normal',
  'lg:[&_[data-slot=select-trigger]]:!h-8 lg:[&_[data-slot=select-trigger]]:!min-h-8',
  '[&_[data-settings-field]]:!h-8 [&_[data-settings-field]]:!min-h-8 [&_[data-settings-field]]:!bg-[var(--settings-field-bg,var(--nora-panel))] [&_[data-settings-field]]:!text-[13px]',
  '[&_button:not([data-choice-plaque]):not([data-settings-field])]:!h-10 [&_button:not([data-choice-plaque]):not([data-settings-field])]:!min-h-10 [&_button:not([data-choice-plaque]):not([data-settings-field])]:!px-3 [&_button:not([data-choice-plaque]):not([data-settings-field])]:!text-[13px] [&_button:not([data-choice-plaque]):not([data-settings-field])]:!font-normal',
  'lg:[&_button:not([data-choice-plaque]):not([data-settings-field])]:!h-8 lg:[&_button:not([data-choice-plaque]):not([data-settings-field])]:!min-h-8',
  '[&_button:not([data-choice-plaque])_span]:!text-[13px] [&_button:not([data-choice-plaque])_span]:!font-normal',
)

/** Раскладка страницы настроек в том же виде, что «Разработка». */
function SettingsCanvasView({
  actions,
  children,
  ctaLabel = 'Настройки',
  description,
  eyebrow,
  meta,
  divided = true,
  lead,
  panelsId = 'settings-panels',
  phoneSheet,
  title,
}: {
  actions?: ReactNode
  children: ReactNode
  ctaLabel?: string
  description: string
  divided?: boolean
  eyebrow: string
  lead?: ReactNode
  meta?: string
  panelsId?: string
  phoneSheet?: boolean
  title: string
}) {
  return (
    <div className={cn(
      'mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-10 px-3 pt-3 pb-8 sm:px-6 md:px-10 md:py-12 lg:flex-row lg:gap-16 lg:px-12',
      (lead || phoneSheet) && 'max-lg:min-h-full max-lg:flex-1 max-lg:gap-0 max-lg:pb-0',
      (lead || phoneSheet) && 'max-lg:bg-[color-mix(in_srgb,var(--nora-text)_9%,var(--background))]',
    )}>
      <aside className="hidden w-full shrink-0 flex-col gap-6 lg:sticky lg:top-6 lg:flex lg:w-[280px] lg:self-start">
        <div>
          <div className={cn('mb-1', settingsCaptionClass)}>{eyebrow}</div>
          <h1 className="font-heading text-[42px] leading-none font-bold tracking-[-0.04em] text-foreground md:text-[48px]">
            {title}
          </h1>
          {meta ? <div className={cn('mt-2', settingsCaptionClass)}>{meta}</div> : null}
        </div>

        <p className={cn(settingsBodyClass, 'max-w-[32ch] leading-relaxed')}>{description}</p>

        <div className="flex flex-wrap items-center gap-1.5">
          {actions ? (
            <div className="hidden shrink-0 items-center gap-1.5 lg:flex lg:flex-nowrap">{actions}</div>
          ) : (
            <a
              className="group inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card py-1.5 pr-1.5 pl-4 text-[13px] font-medium text-foreground shadow-xs transition-colors hover:bg-muted"
              href={`#${panelsId}`}
            >
              {ctaLabel}
              <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <ArrowUpRightIcon className="size-3.5" />
              </span>
            </a>
          )}
        </div>
      </aside>

      <section className={cn('min-w-0 flex-1', (lead || phoneSheet) && 'max-lg:flex max-lg:flex-col')} aria-label={title} id={panelsId}>
        {lead ? <div className="lg:hidden">{lead}</div> : null}
        <div className={cn((lead || phoneSheet) && 'max-lg:relative max-lg:flex max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col', phoneSheet && 'max-lg:mt-5')}>
          {phoneSheet ? <PhoneSheetHandle /> : null}
          <ul
            className={cn(
              'group/sections flex flex-col',
              divided && 'divide-y divide-border/70',
              (lead || phoneSheet) && 'max-lg:relative max-lg:min-h-0 max-lg:flex-1 max-lg:-mx-3 max-lg:overflow-hidden max-lg:rounded-t-[22px] max-lg:bg-background max-lg:px-3 max-lg:pt-5 max-lg:pb-[calc(5rem+env(safe-area-inset-bottom))] max-lg:shadow-[0_-4px_14px_rgba(0,0,0,0.035)] sm:max-lg:-mx-6 sm:max-lg:px-6 md:max-lg:-mx-10 md:max-lg:px-10',
              lead && 'max-lg:-mt-6',
            )}
            data-plain={divided ? undefined : ''}
            data-profile-sheet={(lead || phoneSheet) ? '' : undefined}
          >
            {children}
          </ul>
        </div>
        {actions && !lead && !phoneSheet ? <div aria-hidden className="h-16 lg:hidden" /> : null}
      </section>
      {actions ? (
        <div
          className="fixed z-40 flex flex-wrap-reverse items-center gap-2 lg:hidden left-4 right-[4.75rem] bottom-[max(1rem,var(--app-safe-bottom,env(safe-area-inset-bottom)))]"
          data-settings-dock=""
        >
          {actions}
        </div>
      ) : null}
    </div>
  )
}

/** Gray pill above a phone settings sheet. Pull down to leave the section. */
function PhoneSheetHandle() {
  const navigate = useNavigate()
  const origin = useRef<number | null>(null)

  const shellOf = (event: ReactPointerEvent<HTMLButtonElement>) => event.currentTarget.parentElement

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    origin.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
    const shell = shellOf(event)
    if (shell) shell.style.transition = 'none'
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (origin.current == null) return
    const shell = shellOf(event)
    if (!shell) return
    const distance = Math.max(0, event.clientY - origin.current)
    shell.style.transform = `translateY(${distance}px)`
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (origin.current == null) return
    const distance = Math.max(0, event.clientY - origin.current)
    origin.current = null
    const shell = shellOf(event)
    if (distance > 160) {
      void navigate({ search: userGeneralSearch(), to: '/app/general' })
      return
    }
    if (shell) {
      shell.style.transition = 'transform 180ms ease'
      shell.style.transform = ''
    }
  }

  return (
    <button
      aria-label="Закрыть раздел"
      className="nora-sheet-handle absolute top-0 left-1/2 z-[3] hidden h-8 w-44 -translate-x-1/2 -translate-y-[calc(100%+10px)] cursor-grab touch-none items-end justify-center max-lg:flex"
      onPointerCancel={onPointerUp}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      type="button"
    >
      <span className="nora-sheet-pill" />
    </button>
  )
}

/** Один раздел настроек — как запись в списке версий. */
export function SettingsEntry({
  children,
  className,
  description,
  marker,
  title,
}: {
  children: ReactNode
  className?: string
  description: string
  marker?: ReactNode
  title: string
}) {
  return (
    <li className={cn('w-full py-6 first:pt-0 group-data-[plain]/sections:py-[15.6px] group-data-[plain]/sections:first:pt-0 lg:group-data-[plain]/sections:py-[20px] lg:group-data-[plain]/sections:first:pt-0 lg:ml-auto lg:w-lg lg:max-w-full', className)}>
      <div className="flex items-center justify-between gap-2 lg:gap-x-4">
        <h2 className="min-w-0 font-heading text-[18px] leading-tight font-bold tracking-[-0.02em] text-foreground lg:text-[24px]">
          {title}
        </h2>
        {marker}
      </div>
      <p className={cn('mt-1 max-w-[54ch]', settingsBodyClass, 'text-[var(--nora-text-tertiary)]')}>{description}</p>
      <div className={settingsControlsClass} data-settings-well="">
        {children}
      </div>
    </li>
  )
}

const readRowClass =
  'font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5'

export function SettingsFieldMark({
  icon: Icon,
}: {
  icon: LucideIcon
}) {
  return (
    <Icon
      aria-hidden
      className="size-4 shrink-0 text-[var(--nora-text-secondary)]"
      strokeWidth={1.75}
    />
  )
}

export function SettingsReadRows({
  rows,
}: {
  rows: Array<{ icon?: LucideIcon, label: string, value: string }>
}) {
  return (
    <div>
      {rows.map((row, index) => (
        <div
          className={cn(
            'grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 border-t border-[var(--nora-divider)] py-3.5',
            index === 0 && 'border-t-0 pt-0',
            index === rows.length - 1 && 'pb-0',
          )}
          key={row.label}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            {row.icon ? <SettingsFieldMark icon={row.icon} /> : null}
            <span className={cn(readRowClass, 'font-medium text-[var(--nora-text)]')}>{row.label}</span>
          </span>
          <span className={cn(readRowClass, 'min-w-0 break-words text-right font-light text-[color-mix(in_srgb,white_10%,color-mix(in_srgb,black_20%,color-mix(in_srgb,black_20%,var(--nora-text-secondary))))] dark:text-[var(--nora-text-secondary)]')}>
            {row.value || '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

type SettingsDraft = {
  id: string
  disabled: boolean
  pending: boolean
  save: () => Promise<boolean>
  reset: () => void
}

type SettingsMode = {
  editing: boolean
  managed: boolean
  register: (draft: SettingsDraft) => () => void
}

const SettingsModeContext = createContext<SettingsMode | null>(null)

export function useSettingsMode() {
  const mode = useContext(SettingsModeContext)
  if (!mode) {
    return {
      editing: true,
      managed: false,
      register: () => () => {},
    }
  }
  return mode
}

export function useSettingsDraft(draft: SettingsDraft) {
  const mode = useSettingsMode()
  const saveRef = useRef(draft.save)
  const resetRef = useRef(draft.reset)
  saveRef.current = draft.save
  resetRef.current = draft.reset

  useEffect(() => {
    if (!mode.managed) return
    return mode.register({
      id: draft.id,
      disabled: draft.disabled,
      pending: draft.pending,
      save: () => saveRef.current(),
      reset: () => resetRef.current(),
    })
  }, [draft.disabled, draft.id, draft.pending, mode])

  return mode
}

function SettingsBarButton({
  children,
  disabled,
  icon: Icon,
  onClick,
  tone = 'primary',
}: {
  children: ReactNode
  disabled?: boolean
  icon: LucideIcon
  onClick: () => void
  tone?: 'primary' | 'quiet'
}) {
  return (
    <button
      className="group inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card py-1.5 pr-1.5 pl-4 text-[13px] font-medium text-foreground shadow-xs transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden className="size-4 shrink-0 lg:hidden" strokeWidth={1.75} />
      {children}
      <span
        className={cn(
          'hidden size-7 items-center justify-center rounded-full transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 lg:flex',
          tone === 'primary'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground',
        )}
      >
        <Icon aria-hidden className="size-3.5" />
      </span>
    </button>
  )
}

function ManagedSettingsCanvas(
  props: Omit<Parameters<typeof SettingsCanvasView>[0], 'actions'>,
) {
  const [editing, setEditing] = useState(false)
  const [drafts, setDrafts] = useState<SettingsDraft[]>([])
  const draftsRef = useRef(drafts)
  draftsRef.current = drafts

  const register = useCallback((draft: SettingsDraft) => {
    setDrafts((current) => [...current.filter((item) => item.id !== draft.id), draft])
    return () => {
      setDrafts((current) => current.filter((item) => item.id !== draft.id))
    }
  }, [])

  const mode = useMemo<SettingsMode>(
    () => ({ editing, managed: true, register }),
    [editing, register],
  )

  const pending = drafts.some((draft) => draft.pending)
  const disabled = drafts.some((draft) => draft.disabled)

  const cancel = () => {
    for (const draft of draftsRef.current) draft.reset()
    setEditing(false)
  }

  const save = async () => {
    let ok = true
    for (const draft of draftsRef.current) {
      if (!(await draft.save())) ok = false
    }
    if (ok) setEditing(false)
  }

  const actions = editing ? (
    <>
      <SettingsBarButton disabled={pending} icon={XIcon} onClick={cancel} tone="quiet">
        Отмена
      </SettingsBarButton>
      <SettingsBarButton
        disabled={pending || disabled}
        icon={CheckIcon}
        onClick={() => {
          void save()
        }}
      >
        {pending ? 'Сохраняем…' : 'Сохранить'}
      </SettingsBarButton>
    </>
  ) : (
    <SettingsBarButton icon={PencilIcon} onClick={() => setEditing(true)}>
      Изменить
    </SettingsBarButton>
  )

  return (
    <SettingsModeContext.Provider value={mode}>
      <SettingsCanvasView {...props} actions={actions} />
    </SettingsModeContext.Provider>
  )
}

export function SettingsCanvas({
  editable = false,
  ...props
}: Parameters<typeof SettingsCanvasView>[0] & { editable?: boolean }) {
  if (editable) return <ManagedSettingsCanvas {...props} />
  return <SettingsCanvasView {...props} />
}
