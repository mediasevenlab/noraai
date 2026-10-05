import {
  emptyQuestionnaireAnswers,
  type QuestionnaireAnswers,
  type UserDto,
} from '@web-app-demo/contracts'
import { CheckIcon, PencilIcon, XIcon, type LucideIcon } from '@/components/icons'
import { useEffect, useRef, useState, createContext, useContext, type ReactNode } from 'react'
import { SettingsEntry, SettingsFieldMark, useSettingsDraft, useSettingsMode } from '@/components/settings-canvas'
import { cn } from '@/lib/utils'
import { QuestionnaireEditStack, QuestionnaireFieldBlock } from './QuestionnaireFieldControl'
import { goalUsesPace } from './questionnaire-calorie-target'
import {
  fieldsForAnswers,
  PROFILE_SECTIONS,
  canonicalGoal,
  measureInputValue,
  measureLabel,
  type FieldKey,
  type ProfileField,
  type ProfileSection,
} from './questionnaire-sections'
import { usePutQuestionnaireMutation, useQuestionnaireQuery } from './queries'

const CARD_ICON_TONES = [
  'bg-[var(--nora-tint-dimmed)] text-[var(--nora-tint)]',
  'bg-[var(--nora-badge-purple-bg)] text-[var(--nora-badge-purple-text)]',
  'bg-[var(--nora-badge-green-bg)] text-[var(--nora-badge-green-text)]',
  'bg-[var(--nora-badge-yellow-bg)] text-[var(--nora-badge-yellow-text)]',
  'bg-[var(--nora-badge-red-bg)] text-[var(--nora-badge-red-text)]',
  'bg-[var(--nora-badge-neutral-bg)] text-[var(--nora-badge-neutral-text)]',
] as const

function presentAnswers(answers: Record<FieldKey, string>): Record<FieldKey, string> {
  return {
    ...answers,
    goal: canonicalGoal(answers.goal),
    goalPace: answers.goalPace || 'Умеренно',
  }
}

function isFilled(value: string) {
  return value.trim().length > 0
}

function visibleFields(
  values: Record<FieldKey, string>,
  fields: ReadonlyArray<ProfileField>,
  editing: boolean,
) {
  return fieldsForAnswers(fields, values).filter(
    (field) => editing || !field.optional || isFilled(values[field.key]),
  )
}

function ViewFieldRow({
  field,
  value,
  isFirst,
}: {
  field: ProfileField
  value: string
  isFirst: boolean
}) {
  const extended = field.layout === 'extended'
  return (
    <div
      className={cn(
        'min-w-0 gap-3 border-t border-[var(--nora-divider)] py-2.5',
        extended ? 'grid' : 'grid grid-cols-2 items-center',
        isFirst && 'border-t-0 pt-0',
      )}
    >
      <span className="min-w-0 truncate text-[12px] leading-5 text-[var(--nora-text-tertiary)]">
        {field.label}
      </span>
      <div className={cn('flex min-w-0 items-center', !extended && 'h-5 justify-end')}>
        <span
          className={cn(
            'min-w-0 text-[12px] leading-5 font-normal text-[var(--nora-text-secondary)]',
            extended ? 'whitespace-pre-wrap break-words' : 'truncate text-right',
          )}
        >
          {value || '—'}
        </span>
      </div>
    </div>
  )
}

function ProfileSectionMarker({
  section,
  sectionIndex,
}: {
  section: ProfileSection
  sectionIndex: number
}) {
  const Icon = section.icon
  const iconTone = CARD_ICON_TONES[sectionIndex % CARD_ICON_TONES.length]!

  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-full',
        iconTone,
      )}
    >
      <Icon className="size-4.5" strokeWidth={2} />
    </span>
  )
}
function ProfileSectionCard({
  section,
  sectionIndex,
  values,
  editing,
  onChange,
}: {
  section: ProfileSection
  sectionIndex: number
  values: Record<FieldKey, string>
  editing: boolean
  onChange: (key: FieldKey, value: string) => void
}) {
  const rows = visibleFields(values, section.fields, editing)
  if (!editing && rows.length === 0) return null

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-[var(--nora-radius-lg)] bg-[var(--dash-card-bg,var(--nora-panel))] shadow-[inset_0_0_0_1px_var(--dash-card-ring,var(--nora-border))]">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--nora-divider)] p-3.5">
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-semibold text-[var(--nora-text)]">
            {section.title}
          </h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--nora-text-tertiary)]">
            {section.description}
          </p>
        </div>
        <ProfileSectionMarker section={section} sectionIndex={sectionIndex} />
      </div>
      {editing ? (
        <div className="grid min-w-0 flex-1 grid-cols-2 content-start gap-x-3 gap-y-4 p-3.5">
          {rows.map((field) => (
            <QuestionnaireFieldBlock
              field={field}
              idPrefix="profile"
              invalid={!field.optional && !isFilled(values[field.key])}
              key={field.key}
              onChange={onChange}
              value={values[field.key]}
              variant="card"
            />
          ))}
        </div>
      ) : (
        <div className="grid flex-1 content-start p-3.5">
          {rows.map((field, index) => (
            <ViewFieldRow
              field={field}
              isFirst={index === 0}
              key={field.key}
              value={values[field.key]}
            />
          ))}
        </div>
      )}
    </article>
  )
}

function ProfileSectionEntry({
  className,
  editing,
  onChange,
  section,
  values,
}: {
  className?: string
  editing: boolean
  onChange: (key: FieldKey, value: string) => void
  section: ProfileSection
  values: Record<FieldKey, string>
}) {
  const rows = visibleFields(values, section.fields, editing)
  if (!editing && rows.length === 0) return null

  return (
    <SettingsEntry
      className={className}
      description={section.description}
      title={section.title}
    >
      {editing ? (
        <QuestionnaireEditStack
          fields={rows}
          idPrefix="profile"
          invalidKeys={new Set(
            rows
              .filter((field) => !field.optional && !isFilled(values[field.key]))
              .map((field) => field.key),
          )}
          onChange={onChange}
          values={values}
        />
      ) : (
        <div>
          {rows.map((field, index) => {
            const extended = field.layout === 'extended'
            const shown = measureInputValue(values[field.key], field.unit) || '—'
            if (extended) {
              return (
                <div
                  className={cn(
                    'grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2.5 border-t border-[var(--nora-divider)] py-3.5',
                    index === 0 && 'border-t-0 pt-0',
                    index === rows.length - 1 && 'pb-0',
                  )}
                  key={field.key}
                >
                  <span className="flex h-5 items-center">
                    <SettingsFieldMark icon={field.icon} />
                  </span>
                  <div className="grid min-w-0 gap-1">
                    <span className="font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]">
                      {field.unit ? measureLabel(field) : field.label}
                    </span>
                    <span className="min-w-0 font-[family-name:var(--nora-font)] text-[13px] font-light leading-5 break-words whitespace-pre-wrap text-[color-mix(in_srgb,white_10%,color-mix(in_srgb,black_20%,color-mix(in_srgb,black_20%,var(--nora-text-secondary))))] dark:text-[var(--nora-text-secondary)]">
                      {shown}
                    </span>
                  </div>
                </div>
              )
            }
            return (
              <div
                className={cn(
                  'grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 border-t border-[var(--nora-divider)] py-3.5',
                  index === 0 && 'border-t-0 pt-0',
                  index === rows.length - 1 && 'pb-0',
                )}
                key={field.key}
              >
                <span className="flex min-w-0 items-center gap-2.5 font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]">
                  <SettingsFieldMark icon={field.icon} />
                  {field.unit ? measureLabel(field) : field.label}
                </span>
                <span className="min-w-0 text-right font-[family-name:var(--nora-font)] text-[13px] font-light leading-5 break-words text-[color-mix(in_srgb,white_10%,color-mix(in_srgb,black_20%,color-mix(in_srgb,black_20%,var(--nora-text-secondary))))] dark:text-[var(--nora-text-secondary)]">
                  {shown}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </SettingsEntry>
  )
}

function ProfileBarButton({
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

export function useClientProfileEditor() {
  const mode = useSettingsMode()
  const questionnaire = useQuestionnaireQuery()
  const saveMutation = usePutQuestionnaireMutation()
  const serverAnswers = questionnaire.data?.answers
  const [values, setValues] = useState<Record<FieldKey, string>>(
    () => presentAnswers(serverAnswers ?? emptyQuestionnaireAnswers()),
  )
  const [draft, setDraft] = useState<Record<FieldKey, string>>(
    () => presentAnswers(serverAnswers ?? emptyQuestionnaireAnswers()),
  )
  const [localEditing, setLocalEditing] = useState(false)
  const editing = mode.managed ? mode.editing : localEditing
  const valuesRef = useRef(values)
  valuesRef.current = values
  const wasEditingRef = useRef(false)

  useEffect(() => {
    if (editing && !wasEditingRef.current) setDraft(valuesRef.current)
    wasEditingRef.current = editing
  }, [editing])

  useEffect(() => {
    if (!serverAnswers || editing) return
    setValues(presentAnswers(serverAnswers))
    setDraft(presentAnswers(serverAnswers))
  }, [editing, serverAnswers])

  const startEdit = () => {
    setDraft(values)
    setLocalEditing(true)
  }

  const cancelEdit = () => {
    setDraft(valuesRef.current)
    if (!mode.managed) setLocalEditing(false)
  }

  const saveEdit = async () => {
    try {
      const response = await saveMutation.mutateAsync({
        answers: presentAnswers(draft) as QuestionnaireAnswers,
      })
      if (response.answers) {
        const next = presentAnswers(response.answers)
        setValues(next)
        setDraft(next)
      }
      if (!mode.managed) setLocalEditing(false)
      return true
    } catch {
      return false
    }
  }

  useSettingsDraft({
    id: 'profile-questionnaire',
    disabled: false,
    pending: saveMutation.isPending,
    save: async () => {
      if (!serverAnswers) return !questionnaire.isLoading
      return saveEdit()
    },
    reset: cancelEdit,
  })

  const updateDraft = (key: FieldKey, value: string) => {
    setDraft((current) => {
      const next = { ...current, [key]: value }
      if (key === 'goal' && !goalUsesPace(value)) next.goalPace = 'Умеренно'
      return next
    })
  }

  const actions = editing ? (
    <>
      <ProfileBarButton
        disabled={saveMutation.isPending}
        icon={XIcon}
        onClick={cancelEdit}
        tone="quiet"
      >
        Отмена
      </ProfileBarButton>
      <ProfileBarButton
        disabled={saveMutation.isPending}
        icon={CheckIcon}
        onClick={() => {
          void saveEdit()
        }}
      >
        {saveMutation.isPending ? 'Сохраняем…' : 'Сохранить'}
      </ProfileBarButton>
    </>
  ) : (
    <ProfileBarButton
      disabled={questionnaire.isLoading || !serverAnswers}
      icon={PencilIcon}
      onClick={startEdit}
    >
      Изменить
    </ProfileBarButton>
  )

  return {
    actions,
    editing,
    isError: questionnaire.isError,
    isLoading: questionnaire.isLoading,
    onChange: updateDraft,
    saveError: saveMutation.isError
      ? (saveMutation.error instanceof Error
        ? saveMutation.error.message
        : 'Не удалось сохранить анкету.')
      : null,
    values: presentAnswers(editing ? draft : values),
  }
}

const QuestionnaireEditorContext = createContext<ReturnType<typeof useClientProfileEditor> | null>(null)

export function QuestionnaireEditorProvider({ children }: { children: ReactNode }) {
  const editor = useClientProfileEditor()
  return (
    <QuestionnaireEditorContext.Provider value={editor}>
      {children}
    </QuestionnaireEditorContext.Provider>
  )
}

export function useQuestionnaireEditor() {
  const editor = useContext(QuestionnaireEditorContext)
  if (!editor) {
    throw new Error('Questionnaire editor is missing')
  }
  return editor
}

/** One profile card per onboarding step — equal height within each row. */
export function ClientProfileCard({
  columns = 2,
  editing,
  layout = 'card',
  omitTitles = [],
  onChange,
  sectionClassName,
  values,
}: {
  user: UserDto
  /** Desktop column count; mentor mentee view uses 3. */
  columns?: 2 | 3
  editing: boolean
  layout?: 'card' | 'entry'
  /** Headings already edited in another block on the same page. */
  omitTitles?: ReadonlyArray<string>
  onChange: (key: FieldKey, value: string) => void
  sectionClassName?: string
  values: Record<FieldKey, string>
}) {
  const sections = PROFILE_SECTIONS.filter((section) => !omitTitles.includes(section.title))

  if (layout === 'entry') {
    return (
      <>
        {sections.map((section) => (
          <ProfileSectionEntry
            className={sectionClassName}
            editing={editing}
            key={section.title}
            onChange={onChange}
            section={section}
            values={values}
          />
        ))}
      </>
    )
  }

  return (
    <div
      className={cn(
        'grid min-w-0 w-full items-stretch gap-4',
        columns === 3 ? 'md:grid-cols-2 xl:grid-cols-3' : 'lg:grid-cols-2',
      )}
    >
      {sections.map((section, sectionIndex) => (
        <ProfileSectionCard
          editing={editing}
          key={section.title}
          onChange={onChange}
          section={section}
          sectionIndex={sectionIndex}
          values={values}
        />
      ))}
    </div>
  )
}
