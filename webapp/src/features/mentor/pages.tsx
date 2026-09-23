import type { UserDto } from '@web-app-demo/contracts'
import { useCallback, useState, type ReactNode } from 'react'
import {
  NoraPageHeader,
  PageContainer,
  noraPageDescriptionClass,
  noraPageTitleClass,
} from '@/components/PageLayout'
import { SettingsCanvas } from '@/components/settings-canvas'
import { NoraBadge, NoraSelect } from '@/components/nora/primitives'
import { productFeedPageClass, productToolbarSelectContentClass, productToolbarSelectItemClass } from '@/components/nora/product-sheet'
import { DiaryNewsPage } from '@/features/diary'
import {
  NicknamePanel,
  questionnaireDailyCalorieTarget,
  ReferralLinkPanel,
  TelegramUsernamePanel,
} from '@/features/users'
import {
  MentorMenteeQuestionnaireCards,
  useMentorMenteeQuestionnaireEditor,
} from './MentorMenteeQuestionnaire'
import { MentorUserDirectory } from './MentorUserDirectory'
import { useMarkMentorMealsViewedMutation, useMentorUserQuestionnaireQuery, useMentorUsersQuery } from './queries'

type MenteeView = 'diary' | 'questionnaire' | 'plan'

function MenteeViewSelect({
  value,
  onChange,
}: {
  value: MenteeView
  onChange: (value: MenteeView) => void
}) {
  return (
    <div className="w-[7.25rem] shrink-0">
      <NoraSelect
        className="w-full !rounded-full !border-0 !bg-transparent !shadow-none text-[13px] font-normal text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)]"
        contentClassName={productToolbarSelectContentClass}
        itemClassName={productToolbarSelectItemClass}
        itemIndicator="end"
        items={[
          { value: 'diary', label: 'Дневник' },
          { value: 'questionnaire', label: 'Анкета' },
          { value: 'plan', label: 'План' },
        ]}
        onValueChange={(next) => {
          if (next === 'diary' || next === 'questionnaire' || next === 'plan') {
            onChange(next)
          }
        }}
        value={value}
      />
    </div>
  )
}

export function MentorHome({ user }: { user: UserDto }) {
  return (
    <MentorHomeShell
      badge="Главная"
      description="Управляйте подключёнными пользователями и настройками наставника."
      title={`Добро пожаловать, ${user.displayName ?? user.email}`}
    />
  )
}

export function MentorUsers() {
  return (
    <PageContainer>
      <NoraPageHeader
        badge="Пользователи"
        description="Добавляйте обычных пользователей по никнейму или ID."
        title="Пользователи"
      />
      <MentorUserDirectory />
    </PageContainer>
  )
}

export function MentorMenteeDiary({
  userId,
  planView,
}: {
  userId: string
  planView?: ReactNode
}) {
  const [view, setView] = useState<MenteeView>('diary')
  const users = useMentorUsersQuery({
    page: 1,
    pageSize: 100,
  })
  const mentee = users.data?.items.find((item) => item.id === userId)
  const markViewed = useMarkMentorMealsViewedMutation()
  const onMealsViewed = useCallback(
    (mealIds: string[]) => {
      markViewed.mutate({ userId, mealIds })
    },
    [markViewed.mutate, userId],
  )
  const title = mentee?.displayName ?? mentee?.nickname ?? mentee?.email ?? 'Пользователь'
  const questionnaire = useMentorMenteeQuestionnaireEditor(
    userId,
    view === 'questionnaire',
  )
  const menteeQuestionnaire = useMentorUserQuestionnaireQuery(userId)
  const calorieTarget =
    questionnaireDailyCalorieTarget(menteeQuestionnaire.data?.answers) ?? undefined

  const viewDescription =
    view === 'questionnaire'
      ? 'Анкета подключённого пользователя.'
      : view === 'plan'
        ? 'Планы, отправленные этому пользователю.'
        : 'Дневник подключённого пользователя.'

  return (
    <DiaryNewsPage
      body={
        view === 'questionnaire' ? (
          <div className="grid gap-4">
            <MentorMenteeQuestionnaireCards
              editing={questionnaire.editing}
              isError={questionnaire.isError}
              isLoading={questionnaire.isLoading}
              onChange={questionnaire.onChange}
              saveError={questionnaire.saveError}
              userId={userId}
              values={questionnaire.values}
            />
            <p className="text-[11px] leading-relaxed text-[var(--nora-text-tertiary)]">
              Анкету могут редактировать пользователь и наставник. Пустые
              опциональные ответы скрыты до режима редактирования.
            </p>
          </div>
        ) : view === 'plan' ? (
          planView
        ) : undefined
      }
      heading={{
        badge:
          view === 'questionnaire'
            ? 'Профиль'
            : view === 'plan'
              ? 'План'
              : 'Дневник',
        title,
        description: viewDescription,
      }}
      periodStartIso={mentee?.createdAt}
      readOnly
      calorieTarget={calorieTarget}
      subjectEmail={mentee?.email}
      subjectUserId={userId}
      toolbarDisabled={view !== 'diary'}
      onMealsViewed={view === 'diary' && mentee ? onMealsViewed : undefined}
      toolbarEnd={
        view === 'questionnaire' ? questionnaire.actions : undefined
      }
      toolbarExtra={<MenteeViewSelect onChange={setView} value={view} />}
    />
  )
}

/** @deprecated Use MentorMenteeDiary */
export function MentorMenteePlaceholder({ userId }: { userId: string }) {
  return <MentorMenteeDiary userId={userId} />
}

export function MentorSettings({ user }: { user: UserDto }) {
  return (
    <SettingsCanvas
      description="Имя наставника и уведомления в Telegram, когда подопечный добавляет приём. Ниже ссылка, по которой пользователи подключаются к вам."
      eyebrow="Наставник"
      meta={user.email}
      title="Настройки"
    >
      <NicknamePanel user={user} />
      <TelegramUsernamePanel user={user} variant="notify" />
      <ReferralLinkPanel layout="entry" user={user} variant="mentor" />
    </SettingsCanvas>
  )
}

function MentorHomeShell({
  badge = 'Главная',
  description,
  title = 'Главная',
  children,
}: {
  badge?: string
  description: string
  title?: string
  children?: ReactNode
}) {
  return (
    <div className="news-page relative min-h-full">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(900px 420px at 12% -10%, color-mix(in srgb, var(--nora-tint) var(--dash-glow-tint), transparent), transparent 60%),
            radial-gradient(700px 380px at 90% 0%, color-mix(in srgb, var(--nora-component) var(--dash-glow-component), transparent), transparent 55%),
            linear-gradient(180deg, var(--nora-canvas) 0%, var(--dash-atmosphere-mid) 48%, var(--nora-canvas) 100%)
          `,
        }}
      />
      <div className={productFeedPageClass}>
        <header className="hidden md:block">
          <div className="mb-1.5 flex items-center gap-2">
            <h1 className={noraPageTitleClass}>{title}</h1>
            <NoraBadge variant="blue">{badge}</NoraBadge>
          </div>
          <p className={`mt-1.5 ${noraPageDescriptionClass}`}>{description}</p>
        </header>
        {children}
      </div>
    </div>
  )
}

