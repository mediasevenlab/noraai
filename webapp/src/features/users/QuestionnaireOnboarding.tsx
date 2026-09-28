import {
  emptyQuestionnaireAnswers,
  isQuestionnaireAnswersComplete,
  questionnaireAnswersSchema,
} from '@web-app-demo/contracts'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from 'lucide-react'
import { useState } from 'react'

import { NoraBadge, NoraButton } from '@/components/nora/primitives'
import { userGeneralSearch } from '@/features/navigation'
import { cn } from '@/lib/utils'
import { QuestionnaireFieldControl } from './QuestionnaireFieldControl'
import { QuestionnaireLivePreview } from './QuestionnaireLivePreview'
import { ONBOARDING_STEPS, type FieldKey } from './questionnaire-sections'
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

  const incompleteRequiredKeys = new Set(
    step.fields
      .filter((field) => !field.optional && answers[field.key].trim().length === 0)
      .map((field) => field.key),
  )

  const update = (key: FieldKey, value: string) => {
    setAnswers((current) => ({ ...current, [key]: value }))
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
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0 grid gap-1.5">
                  <h1 className="font-heading text-[28px] leading-[1.15] font-bold tracking-[-0.03em] text-[var(--nora-text)]">
                    {step.heading}
                  </h1>
                  <p className="text-[13px] font-light leading-relaxed text-[var(--nora-text-tertiary)]">
                    {step.summary}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 pb-0.5">
                  <NoraButton
                    aria-label="Назад"
                    className="size-9 rounded-full bg-[var(--questionnaire-back,var(--nora-panel))] p-0 text-[var(--nora-text)] shadow-none hover:bg-[color-mix(in_srgb,var(--nora-text)_6%,var(--questionnaire-back,var(--nora-panel)))] hover:text-[var(--nora-text)] disabled:bg-[var(--nora-surface)] disabled:text-[var(--nora-text-dimmed)] [&_svg]:size-4"
                    disabled={stepIndex === 0 || saveMutation.isPending}
                    onClick={goBack}
                    variant="ghost"
                  >
                    <ArrowLeftIcon aria-hidden />
                  </NoraButton>
                  {isLast ? (
                    <NoraButton
                      aria-label={saveMutation.isPending ? 'Сохраняем…' : 'Завершить'}
                      className="size-9 rounded-full p-0 [&_svg]:size-4"
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
                      className="size-9 rounded-full p-0 [&_svg]:size-4"
                      onClick={goNext}
                      variant="primary"
                    >
                      <ArrowRightIcon aria-hidden />
                    </NoraButton>
                  )}
                </div>
              </div>
            </header>

            <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-5">
              {step.fields.map((field) => {
                const fieldInvalid =
                  showFieldErrors && incompleteRequiredKeys.has(field.key)
                return (
                  <div
                    className={cn('grid gap-2', !field.halfWidth && 'col-span-2')}
                    key={field.key}
                  >
                    {field.hideLabel ? null : (
                      <span className="min-w-0 font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]">
                        {field.label}
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
                <p className="col-span-2 text-[12px] text-[var(--nora-error)]">{formError}</p>
              ) : null}
            </div>

            <p
              className="mt-8 flex gap-1.5 text-[11px] leading-relaxed text-[var(--nora-text-tertiary)]"
              role="status"
            >
              <span className="shrink-0">*</span>
              <span>
                Чтобы получить доступ к функциям приложения, пройдите первичную анкету.
                <br />
                После завершения ответы можно будет изменить в разделе «Профиль».
              </span>
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
