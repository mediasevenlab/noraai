import {
  emptyQuestionnaireAnswers,
  type QuestionnaireAnswers,
  type UserDto,
} from '@web-app-demo/contracts'
import { useEffect, useState } from 'react'

import { NoraButton } from '@/components/nora/primitives'
import { cn } from '@/lib/utils'
import { QuestionnaireFieldControl } from './QuestionnaireFieldControl'
import {
  PROFILE_SECTIONS,
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
        {field.layout === 'extended' ? (
          <span className="min-w-0 truncate text-right text-[12px] leading-5 font-normal text-[var(--nora-text-secondary)]">
            {value}
          </span>
        ) : (
          <span className="min-w-0 truncate text-right text-[12px] leading-5 font-normal text-[var(--nora-text-secondary)]">
            {value || '—'}
          </span>
        )}
      </div>
    </div>
  )
}

function EditFieldBlock({
  field,
  invalid,
  value,
  onChange,
}: {
  field: ProfileField
  invalid?: boolean
  value: string
  onChange: (key: FieldKey, value: string) => void
}) {
  return (
    <div className={cn('grid gap-1.5', !field.halfWidth && 'col-span-2')}>
      <span className="text-[12px] text-[var(--nora-text-secondary)]">
        {field.label}
        {field.optional ? (
          <span className="text-[var(--nora-text-tertiary)]"> · необязательно</span>
        ) : null}
      </span>
      <QuestionnaireFieldControl
        field={field}
        idPrefix="profile"
        invalid={invalid}
        onChange={onChange}
        value={value}
      />
    </div>
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
  const Icon = section.icon
  const iconTone = CARD_ICON_TONES[sectionIndex % CARD_ICON_TONES.length]!

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
        <span
          aria-hidden
          className={cn(
            'inline-flex size-7 shrink-0 items-center justify-center rounded-full',
            iconTone,
          )}
        >
          <Icon className="size-3.5" strokeWidth={2} />
        </span>
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

export function useClientProfileEditor() {
  const questionnaire = useQuestionnaireQuery()
  const saveMutation = usePutQuestionnaireMutation()
  const serverAnswers = questionnaire.data?.answers
  const [values, setValues] = useState<Record<FieldKey, string>>(
    () => serverAnswers ?? emptyQuestionnaireAnswers(),
  )
  const [draft, setDraft] = useState<Record<FieldKey, string>>(
    () => serverAnswers ?? emptyQuestionnaireAnswers(),
  )
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!serverAnswers || editing) return
    setValues(serverAnswers)
    setDraft(serverAnswers)
  }, [editing, serverAnswers])

  const startEdit = () => {
    setDraft(values)
    setEditing(true)
  }

  const cancelEdit = () => {
    setDraft(values)
    setEditing(false)
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
      setEditing(false)
    } catch {
      // Keep the editor open; saveError is shown from the mutation.
    }
  }

  const updateDraft = (key: FieldKey, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const actions = editing ? (
    <>
      <NoraButton
        disabled={saveMutation.isPending}
        onClick={cancelEdit}
        size="sm"
        variant="ghost"
      >
        Отмена
      </NoraButton>
      <NoraButton
        disabled={saveMutation.isPending}
        onClick={() => {
          void saveEdit()
        }}
        size="sm"
        variant="primary"
      >
        {saveMutation.isPending ? 'Сохраняем…' : 'Сохранить'}
      </NoraButton>
    </>
  ) : (
    <NoraButton
      disabled={questionnaire.isLoading || !serverAnswers}
      onClick={startEdit}
      size="sm"
      variant="default"
    >
      Редактировать
    </NoraButton>
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
  onChange,
  values,
}: {
  user: UserDto
  /** Desktop column count; mentor mentee view uses 3. */
  columns?: 2 | 3
  editing: boolean
  onChange: (key: FieldKey, value: string) => void
  values: Record<FieldKey, string>
}) {
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
