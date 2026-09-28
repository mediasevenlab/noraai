import {
  emptyQuestionnaireAnswers,
  type QuestionnaireAnswers,
  type UserDto,
} from '@web-app-demo/contracts'
import { CheckIcon, PencilIcon, XIcon, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { SettingsEntry, SettingsFieldMark, useSettingsDraft, useSettingsMode } from '@/components/settings-canvas'
import { cn } from '@/lib/utils'
import { QuestionnaireFieldControl } from './QuestionnaireFieldControl'
import {
  PROFILE_SECTIONS,
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

function isFilled(value: string) {
  return value.trim().length > 0
}

function visibleFields(
  values: Record<FieldKey, string>,
  fields: ReadonlyArray<ProfileField>,
  editing: boolean,
) {
  return fields.filter(
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
  return (
    <div
      className={cn(
        'grid min-w-0 grid-cols-2 items-center gap-3 border-t border-[var(--nora-divider)] py-2.5',
        isFirst && 'border-t-0 pt-0',
      )}
    >
      <span className="min-w-0 truncate text-[12px] leading-5 text-[var(--nora-text-tertiary)]">
        {field.label}
      </span>
      <div className="flex h-5 min-w-0 items-center justify-end">
        <span className="min-w-0 truncate text-right text-[12px] leading-5 font-normal text-[var(--nora-text-secondary)]">
          {value || '—'}
        </span>
      </div>
    </div>
  )
}

function EditFieldBlock({
  field,
  invalid,
  value,
  onChange,
  variant = 'card',
}: {
  field: ProfileField
  invalid?: boolean
  value: string
  onChange: (key: FieldKey, value: string) => void
  variant?: 'card' | 'entry'
}) {
  const entry = variant === 'entry'
  const inline =
    entry && field.layout !== 'extended' && field.control == null
  const labelText = (
    <span
      className={
        entry
          ? 'min-w-0 font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]'
          : 'text-[12px] text-[var(--nora-text-secondary)]'
      }
    >
      {entry && field.unit ? measureLabel(field) : field.label}
      {field.optional ? (
        <span className="font-normal text-[12px] text-[var(--nora-text-tertiary)]">
          {' '}
          · необязательно
        </span>
      ) : null}
    </span>
  )
  const label = entry ? (
    <span className="flex min-w-0 items-center gap-2.5">
      <SettingsFieldMark icon={field.icon} />
      {labelText}
    </span>
  ) : labelText
  const control = (
    <QuestionnaireFieldControl
      field={field}
      idPrefix="profile"
      invalid={invalid}
      onChange={onChange}
      value={value}
      variant={variant}
    />
  )

  if (inline) {
    return (
      <div className="grid grid-cols-2 items-center gap-2">
        {label}
        {control}
      </div>
    )
  }

  return (
    <div className={cn(entry ? 'grid gap-2' : 'grid gap-1.5', !entry && !field.halfWidth && 'col-span-2')}>
      {label}
      {control}
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
            <EditFieldBlock
              field={field}
              invalid={!field.optional && !isFilled(values[field.key])}
              key={field.key}
              onChange={onChange}
              value={values[field.key]}
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

  return (
    <SettingsEntry
      className={className}
      description={section.description}
      title={section.title}
    >
      {editing ? (
        <div>
          {rows.map((field, index) => (
            <div
              className={cn(
                'border-t border-[var(--nora-divider)] py-3.5',
                index === 0 && 'border-t-0 pt-0',
                index === rows.length - 1 && 'pb-0',
              )}
              key={field.key}
            >
              <EditFieldBlock
                field={field}
                invalid={!field.optional && !isFilled(values[field.key])}
                onChange={onChange}
                value={values[field.key]}
                variant="entry"
              />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="font-[family-name:var(--nora-font)] text-[13px] font-light leading-5 text-[var(--nora-text-tertiary)]">
          Пока ничего не указано.
        </p>
      ) : (
        <div>
          {rows.map((field, index) => {
            const extended = field.layout === 'extended'
            return (
              <div
                className={cn(
                  'min-w-0 border-t border-[var(--nora-divider)] py-3.5',
                  index === 0 && 'border-t-0 pt-0',
                  index === rows.length - 1 && 'pb-0',
                  extended
                    ? 'grid gap-2'
                    : 'grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4',
                )}
                key={field.key}
              >
                <span className="flex min-w-0 items-center gap-2.5 font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]">
                  <SettingsFieldMark icon={field.icon} />
                  {field.unit ? measureLabel(field) : field.label}
                </span>
                <span
                  className={cn(
                    'min-w-0 font-[family-name:var(--nora-font)] text-[13px] font-light leading-5 break-words text-[color-mix(in_srgb,white_10%,color-mix(in_srgb,black_20%,color-mix(in_srgb,black_20%,var(--nora-text-secondary))))]',
                    extended ? 'whitespace-pre-wrap' : 'text-right',
                  )}
                >
                  {measureInputValue(values[field.key], field.unit) || '—'}
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
    () => serverAnswers ?? emptyQuestionnaireAnswers(),
  )
  const [draft, setDraft] = useState<Record<FieldKey, string>>(
    () => serverAnswers ?? emptyQuestionnaireAnswers(),
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
    setValues(serverAnswers)
    setDraft(serverAnswers)
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
        answers: draft as QuestionnaireAnswers,
      })
      if (response.answers) {
        setValues(response.answers)
        setDraft(response.answers)
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
    setDraft((current) => ({ ...current, [key]: value }))
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
    values: editing ? draft : values,
  }
}

/** One profile card per onboarding step — equal height within each row. */
export function ClientProfileCard({
  columns = 2,
  editing,
  layout = 'card',
  onChange,
  sectionClassName,
  values,
}: {
  user: UserDto
  /** Desktop column count; mentor mentee view uses 3. */
  columns?: 2 | 3
  editing: boolean
  layout?: 'card' | 'entry'
  onChange: (key: FieldKey, value: string) => void
  sectionClassName?: string
  values: Record<FieldKey, string>
}) {
  if (layout === 'entry') {
    return (
      <>
        {PROFILE_SECTIONS.map((section, sectionIndex) => (
          <ProfileSectionEntry
            className={cn(sectionClassName, sectionIndex === 0 && 'max-lg:!pt-0')}
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
      {PROFILE_SECTIONS.map((section, sectionIndex) => (
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
