import type { QuestionnaireAnswers, UserDto } from '@web-app-demo/contracts'

import { AtSignIcon, FlameIcon, MailIcon, TargetIcon, UserRoundIcon, ZapIcon } from '@/components/icons'
import { NoraButton } from '@/components/nora/primitives'
import { ProductFeedEmpty, SectionLoading } from '@/components/nora/product-sheet'
import { SettingsCanvas, SettingsEntry, SettingsReadRows } from '@/components/settings-canvas'
import {
  ClientProfileCard,
  canonicalGoalPace,
  goalUsesPace,
  profileCalorieValue,
  questionnaireDailyCalorieTarget,
  questionnaireMaintenanceCalories,
  useCaloriePreference,
} from '@/features/users'

import { useMentorUserQuestionnaireQuery } from './queries'

function MenteeCalorieEntry({
  userId,
  values,
}: {
  userId: string
  values: QuestionnaireAnswers
}) {
  const saved = useCaloriePreference(userId)
  const maintenance = questionnaireMaintenanceCalories(values)
  const goalTarget = questionnaireDailyCalorieTarget(values)
  const shown = profileCalorieValue({
    maintenance,
    goalTarget,
    preference: saved,
  })
  const paceApplies = goalUsesPace(values.goal)

  return (
    <SettingsEntry
      description="Текущая норма и цель."
      title="Калорийность"
    >
      {shown ? (
        <SettingsReadRows
          rows={[
            { icon: FlameIcon, label: 'Текущая / Цель', value: shown },
            ...(saved.useRecommendation
              ? [
                  { icon: TargetIcon, label: 'Цель', value: values.goal || '—' },
                  ...(paceApplies
                    ? [{ icon: ZapIcon, label: 'Темп', value: canonicalGoalPace(values.goalPace) }]
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

const placeholderUser = (userId: string): UserDto => ({
  id: userId,
  publicId: 0,
  email: '',
  displayName: null,
  nickname: null,
  telegramUsername: null,
  telegramPhone: null,
  role: 'user',
  questionnaireCompleted: true,
  createdAt: new Date(0).toISOString(),
})

export function MentorMenteeQuestionnaire({
  displayName,
  email,
  nickname,
  userId,
}: {
  displayName?: string | null
  email?: string | null
  nickname?: string | null
  userId: string
}) {
  const questionnaire = useMentorUserQuestionnaireQuery(userId)
  const answers = questionnaire.data?.answers

  return (
    <div className="-mx-3 sm:-mx-6 md:-mx-10 lg:-mx-12">
      <SettingsCanvas
        className="md:pt-2 md:pb-8"
        description="Имя и никнейм, затем анкета с калорийностью."
        eyebrow="Аккаунт"
        meta={email ?? undefined}
        panelsId="mentee-questionnaire"
        showJumpLink={false}
        title="Профиль"
      >
        <SettingsEntry
          description="Имя и никнейм."
          title="Данные профиля"
        >
          <SettingsReadRows
            rows={[
              { icon: UserRoundIcon, label: 'Отображаемое имя', value: displayName?.trim() || email || '—' },
              { icon: MailIcon, label: 'Email', value: email || '—' },
              { icon: AtSignIcon, label: 'Ваш никнейм', value: nickname || '—' },
            ]}
          />
        </SettingsEntry>
        {questionnaire.isLoading ? (
          <li className="list-none lg:ml-auto lg:w-lg">
            <SectionLoading label="Загрузка анкеты" />
          </li>
        ) : questionnaire.isError ? (
          <li className="list-none lg:ml-auto lg:w-lg">
            <ProductFeedEmpty
              action={
                <NoraButton onClick={() => void questionnaire.refetch()} variant="tinted">
                  Повторить
                </NoraButton>
              }
              description="Проверьте соединение и попробуйте ещё раз."
              title="Не удалось загрузить анкету"
            />
          </li>
        ) : !answers ? (
          <li className="list-none lg:ml-auto lg:w-lg">
            <ProductFeedEmpty
              description="Пользователь ещё не заполнил анкету."
              title="Анкета пока пустая"
            />
          </li>
        ) : (
          <>
            <MenteeCalorieEntry userId={userId} values={answers} />
            <ClientProfileCard
              editing={false}
              layout="entry"
              omitTitles={['Цель']}
              onChange={() => {}}
              user={placeholderUser(userId)}
              values={answers}
            />
          </>
        )}
      </SettingsCanvas>
    </div>
  )
}
