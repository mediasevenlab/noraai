import {
  emptyQuestionnaireAnswers,
  isQuestionnaireAnswersComplete,
  questionnaireAnswersSchema,
} from '@web-app-demo/contracts'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from '@/components/icons'
import { useState } from 'react'

import { NoraBadge, NoraButton } from '@/components/nora/primitives'
import { userGeneralSearch } from '@/features/navigation'
import { cn } from '@/lib/utils'
import { QuestionnaireFieldControl } from './QuestionnaireFieldControl'
import { QuestionnaireLivePreview } from './QuestionnaireLivePreview'
import {
  fieldsForAnswers,
  ONBOARDING_STEPS,
  measureLabel,
  type FieldKey,
} from './questionnaire-sections'
import { goalUsesPace } from './questionnaire-calorie-target'
import { usePutQuestionnaireMutation } from './queries'

export function QuestionnaireOnboarding() {
  const navigate = useNavigate()
  const saveMutation = usePutQuestionnaireMutation()
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState(emptyQuestionnaireAnswers)
  const [formError, setFormError] = useState<string | null>(null)
  const [showFieldErrors, setShowFieldErrors] = useState(false)

  const step = ONBOARDING_STEPS[stepIndex]!
  const isLast = stepIndex === ONBOARDING_STEPS.length - 1
  const stepFields = fieldsForAnswers(step.fields, answers)

  const incompleteRequiredKeys = new Set(
    stepFields
      .filter((field) => !field.optional && answers[field.key].trim().length === 0)
      .map((field) => field.key),
  )

  const update = (key: FieldKey, value: string) => {
    setAnswers((current) => {
      const next = { ...current, [key]: value }
      if (key === 'goal' && !goalUsesPace(value)) next.goalPace = 'Умеренно'
      return next
    })
    setFormError(null)
  }

  const stepComplete = incompleteRequiredKeys.size === 0

  const goNext = () => {
    if (!stepComplete) {
      setShowFieldErrors(true)
      setFormError('Заполните обязательные поля этого шага.')
      return
    }
    setShowFieldErrors(false)
    setFormError(null)
    setStepIndex((current) => Math.min(current + 1, ONBOARDING_STEPS.length - 1))
  }

  const goBack = () => {
    setShowFieldErrors(false)
    setFormError(null)
    setStepIndex((current) => Math.max(current - 1, 0))
  }

  const finish = async () => {
    if (!stepComplete || !isQuestionnaireAnswersComplete(answers)) {
      setShowFieldErrors(true)
      setFormError('Заполните обязательные поля анкеты.')
      return
    }
    const parsed = questionnaireAnswersSchema.safeParse(answers)
    if (!parsed.success) {
      setFormError('Проверьте ответы анкеты и попробуйте снова.')
      return
    }
    try {
      await saveMutation.mutateAsync({ answers: parsed.data })
      await navigate({ search: userGeneralSearch(), to: '/app/general' })
    } catch {
      setFormError('Не удалось сохранить анкету. Попробуйте ещё раз.')
    }
  }

  return (
    <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-2">
      <section className="flex min-h-0 flex-col overflow-hidden p-6 md:p-10">
        <div className="my-auto flex w-full justify-center py-6 md:py-8">
          <div className="grid w-full max-w-[30rem] font-[family-name:var(--nora-font)]">
            <header className="grid gap-2">
              <div className="flex items-center gap-2.5">
                <NoraBadge variant="blue">
                  Шаг {stepIndex + 1} из {ONBOARDING_STEPS.length}
                </NoraBadge>
              </div>
              <div className="grid gap-1.5">
                <h1 className="font-heading text-[24px] leading-tight font-bold tracking-[-0.02em] text-[var(--nora-text)]">
                  {step.heading}
                </h1>
                <p className="text-[13px] font-[250] leading-5 text-[var(--nora-text-tertiary)]">
                  {step.summary}
                </p>
              </div>
            </header>

            <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-5 lg:mt-6" data-onboarding-form="">
              {stepFields.map((field) => {
                const fieldInvalid =
                  showFieldErrors && incompleteRequiredKeys.has(field.key)
                return (
                  <div
                    className={cn('grid gap-2', !field.halfWidth && 'col-span-2')}
                    key={field.key}
                  >
                    {field.hideLabel ? null : (
                      <span className="min-w-0 font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]">
                        {measureLabel(field)}
                        {fieldInvalid ? (
                          <span className="text-[var(--nora-error)]"> *</span>
                        ) : null}
                        {field.optional ? (
                          <span className="font-normal text-[12px] text-[var(--nora-text-tertiary)]">
                            {' '}
                            · необязательно
                          </span>
                        ) : null}
                      </span>
                    )}
                    <QuestionnaireFieldControl
                      field={field}
                      idPrefix="onboarding"
                      onChange={update}
                      value={answers[field.key]}
                    />
                  </div>
                )
              })}

              {formError ? (
                <p className="col-span-2 text-[13px] leading-5 text-[var(--nora-error)]">{formError}</p>
              ) : null}
            </div>

            <div className="mt-8 flex justify-end gap-2">
              <NoraButton
                aria-label="Назад"
                className="size-10 rounded-full bg-[var(--settings-field-bg,var(--nora-panel))] p-0 text-[var(--nora-text)] shadow-[inset_0_0_0_1px_var(--settings-well-stroke,var(--nora-border))] hover:bg-[color-mix(in_srgb,var(--nora-text)_6%,var(--settings-field-bg,var(--nora-panel)))] hover:text-[var(--nora-text)] disabled:bg-[var(--nora-surface)] disabled:text-[var(--nora-text-dimmed)] [&_svg]:size-4"
                disabled={stepIndex === 0 || saveMutation.isPending}
                onClick={goBack}
                variant="ghost"
              >
                <ArrowLeftIcon aria-hidden />
              </NoraButton>
              {isLast ? (
                <NoraButton
                  aria-label={saveMutation.isPending ? 'Сохраняем…' : 'Завершить'}
                  className="size-10 rounded-full p-0 [&_svg]:size-4"
                  disabled={saveMutation.isPending}
                  onClick={() => {
                    void finish()
                  }}
                  variant="primary"
                >
                  <CheckIcon aria-hidden />
                </NoraButton>
              ) : (
                <NoraButton
                  aria-label="Далее"
                  className="size-10 rounded-full p-0 [&_svg]:size-4"
                  onClick={goNext}
                  variant="primary"
                >
                  <ArrowRightIcon aria-hidden />
                </NoraButton>
              )}
            </div>

            <p
              className="mt-8 text-[12px] font-normal leading-5 text-[var(--nora-text-tertiary)] lg:mt-6"
              role="status"
            >
              * Чтобы получить доступ к функциям приложения, пройдите первичную анкету. После завершения ответы можно будет изменить в разделе «Профиль».
            </p>
          </div>
        </div>
      </section>

      <section className="relative hidden min-h-0 overflow-hidden bg-muted lg:block">
        <img
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          src="/auth-cover.svg"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,color-mix(in_srgb,var(--nora-panel)_55%,transparent)_0%,color-mix(in_srgb,var(--nora-canvas)_35%,transparent)_45%,transparent_100%)]"
        />
        <div className="relative z-[1] flex h-full min-h-0 flex-col overflow-hidden p-6 md:p-10">
          <aside
            aria-label="Предпросмотр анкеты"
            className="mx-auto flex h-full w-full max-w-[24rem] min-h-0 flex-col overflow-hidden py-6 md:py-10"
          >
            <QuestionnaireLivePreview stepIndex={stepIndex} values={answers} />
          </aside>
        </div>
      </section>
    </div>
  )
}
