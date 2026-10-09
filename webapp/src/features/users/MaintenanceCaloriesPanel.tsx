import { useId, useState } from 'react'

import { SettingsEntry, SettingsFieldMark, SettingsReadRows, useSettingsDraft } from '@/components/settings-canvas'
import { FlameIcon, SparklesIcon, TargetIcon, ZapIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

import {
  parseCustomCalorieKcal,
  profileCalorieValue,
  useCaloriePreference,
  writeCaloriePreference,
} from './calorie-preference'
import { useQuestionnaireEditor } from './ClientProfileCard'
import { QuestionnaireFieldControl } from './QuestionnaireFieldControl'
import {
  canonicalGoalPace,
  goalUsesPace,
  questionnaireDailyCalorieTarget,
  questionnaireMaintenanceCalories,
} from './questionnaire-calorie-target'
import { fieldGoal, fieldGoalPace, type FieldKey } from './questionnaire-sections'

const CALORIE_ROW_LABEL = 'Текущая / Цель'

export function MaintenanceCaloriesPanel({
  className,
  userId,
}: {
  className?: string
  userId: string
}) {
  const switchId = useId()
  const inputId = useId()
  const errorId = useId()
  const editor = useQuestionnaireEditor()
  const saved = useCaloriePreference(userId)
  const answers = editor.values
  const maintenance = questionnaireMaintenanceCalories(answers)
  const goalTarget = questionnaireDailyCalorieTarget(answers)
  const [useRecommendation, setUseRecommendation] = useState(saved.useRecommendation)
  const [customKcal, setCustomKcal] = useState(
    saved.customKcal == null ? '' : String(saved.customKcal),
  )
  const parsedCustom = parseCustomCalorieKcal(customKcal)
  const customInvalid = !useRecommendation && parsedCustom == null

  const mode = useSettingsDraft({
    id: 'profile-calories',
    disabled: customInvalid,
    pending: false,
    save: async () => {
      const nextCustom = parseCustomCalorieKcal(customKcal)
      if (!useRecommendation && nextCustom == null) return false
      writeCaloriePreference(userId, {
        useRecommendation,
        customKcal: nextCustom,
      })
      return true
    },
    reset: () => {
      setUseRecommendation(saved.useRecommendation)
      setCustomKcal(saved.customKcal == null ? '' : String(saved.customKcal))
    },
  })
  const editing = mode.managed && mode.editing
  const preview = profileCalorieValue({
    maintenance,
    goalTarget,
    preference: {
      useRecommendation,
      customKcal: parsedCustom,
    },
  })
  const shown = profileCalorieValue({
    maintenance,
    goalTarget,
    preference: saved,
  })
  const paceApplies = goalUsesPace(answers.goal)

  return (
    <SettingsEntry
      className={cn(className, 'max-lg:!pt-0')}
      description="Текущая норма и цель."
      title="Калорийность"
    >
      {editor.isLoading ? (
        <p className="font-[family-name:var(--nora-font)] text-[13px] font-light leading-5 text-[var(--nora-text-tertiary)]">
          Считаем калорийность…
        </p>
      ) : editor.isError ? (
        <p className="font-[family-name:var(--nora-font)] text-[13px] leading-5 text-[var(--nora-error)]">
          Не удалось прочитать анкету.
        </p>
      ) : editing ? (
        <div>
          <div className="grid min-w-0 grid-cols-2 items-center gap-2 pb-3.5">
            <span className="flex min-w-0 items-center gap-2.5">
              <SettingsFieldMark icon={FlameIcon} />
              <span className="font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]">
                {CALORIE_ROW_LABEL}
              </span>
            </span>
            {useRecommendation ? (
              <span className="min-w-0 break-words text-right font-[family-name:var(--nora-font)] text-[13px] font-light leading-5 text-[var(--nora-text-secondary)]">
                {preview ?? '—'}
              </span>
            ) : (
              <Field className="min-w-0" data-invalid={customInvalid}>
                <FieldLabel className="sr-only" htmlFor={inputId}>
                  Своё значение, ккал
                </FieldLabel>
                <Input
                  aria-describedby={customInvalid ? errorId : undefined}
                  aria-invalid={customInvalid}
                  className="font-normal"
                  id={inputId}
                  inputMode="numeric"
                  onChange={(event) => setCustomKcal(event.target.value)}
                  value={customKcal}
                />
              </Field>
            )}
          </div>
          {!useRecommendation && customInvalid ? (
            <FieldError className="pb-3.5" id={errorId}>
              Введите целое число от 500 до 8 000.
            </FieldError>
          ) : null}
          <GoalPaceEditor
            goal={answers.goal}
            inactive={!useRecommendation}
            onChange={editor.onChange}
            pace={answers.goalPace}
            showPace={paceApplies}
          />
          <div className="flex items-center gap-2.5 border-t border-[var(--nora-divider)] pt-3.5">
            <label
              className="flex cursor-pointer items-center gap-2.5 font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]"
              htmlFor={switchId}
            >
              <SettingsFieldMark icon={SparklesIcon} />
              Использовать рекомендации
            </label>
            <Switch
              aria-label="Использовать рекомендации"
              checked={useRecommendation}
              className="ml-auto"
              id={switchId}
              onCheckedChange={(checked) => {
                setUseRecommendation(checked)
                if (!checked && customKcal.trim() === '' && goalTarget != null) {
                  setCustomKcal(String(goalTarget))
                }
              }}
              size="lg"
            />
          </div>
        </div>
      ) : shown ? (
        <SettingsReadRows
          rows={[
            { icon: FlameIcon, label: CALORIE_ROW_LABEL, value: shown },
            ...(saved.useRecommendation
              ? [
                  { icon: TargetIcon, label: 'Цель', value: answers.goal || '—' },
                  ...(paceApplies
                    ? [{ icon: ZapIcon, label: 'Темп', value: canonicalGoalPace(answers.goalPace) }]
                    : []),
                ]
              : []),
          ]}
        />
      ) : (
        <p className="font-[family-name:var(--nora-font)] text-[13px] font-light leading-5 text-[var(--nora-text-tertiary)]">
          Укажите в анкете пол, возраст, рост, вес и активность — тогда здесь появится число.
        </p>
      )}
    </SettingsEntry>
  )
}

function GoalPaceEditor({
  goal,
  inactive = false,
  onChange,
  pace,
  showPace,
}: {
  goal: string
  inactive?: boolean
  onChange: (key: FieldKey, value: string) => void
  pace: string
  showPace: boolean
}) {
  const change = inactive ? () => {} : onChange
  return (
    <div className={cn(inactive && 'pointer-events-none opacity-40')} aria-disabled={inactive || undefined}>
      <div className="border-t border-[var(--nora-divider)] py-3.5">
        <span className="mb-3.5 flex min-w-0 items-center gap-2.5">
          <SettingsFieldMark icon={TargetIcon} />
          <span className="font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]">
            Цель
          </span>
        </span>
        <QuestionnaireFieldControl
          field={fieldGoal}
          idPrefix="calorie-goal"
          onChange={change}
          value={goal}
          variant="entry"
        />
      </div>
      {showPace ? (
        <div className="border-t border-[var(--nora-divider)] py-3.5">
          <span className="mb-3.5 flex min-w-0 items-center gap-2.5">
            <SettingsFieldMark icon={ZapIcon} />
            <span className="font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]">
              Темп
            </span>
          </span>
          <QuestionnaireFieldControl
            field={fieldGoalPace}
            idPrefix="calorie-pace"
            onChange={change}
            value={pace || 'Умеренно'}
            variant="entry"
          />
        </div>
      ) : null}
    </div>
  )
}

