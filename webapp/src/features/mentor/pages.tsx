import type { UserDto } from '@web-app-demo/contracts'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  noraPageDescriptionClass,
  noraPageTitleClass,
} from '@/components/PageLayout'
import { SettingsCanvas, SettingsEntry, SettingsReadRows } from '@/components/settings-canvas'
import { ArrowLeftIcon, BookOpenIcon, CalendarDaysIcon, HashIcon, UserRoundIcon } from '@/components/icons'
import { NoraSelect } from '@/components/nora/primitives'
import { productFeedPageClass, productToolbarSelectContentClass, productToolbarSelectItemClass } from '@/components/nora/product-sheet'
import { DiaryNewsPage } from '@/features/diary'
import {
  NicknamePanel,
  ProfilePanel,
  ReferralLinkPanel,
  TelegramUsernamePanel,
} from '@/features/users'
import { MentorMenteeQuestionnaire } from './MentorMenteeQuestionnaire'
import { MentorUserDirectory } from './MentorUserDirectory'
import {
  useMarkMentorMealsViewedMutation,
  useMentorUserPlanLibraryQuery,
  useMentorUsersQuery,
} from './queries'

type MenteeView = 'diary' | 'questionnaire' | 'rations'

const MENTEE_VIEWS = [
  { value: 'diary', label: 'Дневник', icon: BookOpenIcon },
  { value: 'questionnaire', label: 'Профиль', icon: UserRoundIcon },
  { value: 'rations', label: 'Рационы', icon: CalendarDaysIcon },
] as const

function MenteeViewSelect({
  value,
  onChange,
}: {
  value: MenteeView
  onChange: (value: MenteeView) => void
}) {
  return (
    <NoraSelect
      className="!h-9 !max-h-9 !min-h-9 !w-max shrink-0 !gap-1.5 !rounded-full !border-0 !bg-transparent !px-1.5 !py-0 !shadow-none text-[13px] !font-normal leading-none text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)] data-[popup-open]:text-[var(--nora-text)] *:data-[slot=select-value]:!flex-none [&>svg]:!size-3.5 [&>svg]:!text-current [&>svg]:!opacity-100"
      contentClassName={productToolbarSelectContentClass}
      itemClassName={productToolbarSelectItemClass}
      itemIndicator="end"
      items={MENTEE_VIEWS.map((item) => ({
        value: item.value,
        label: item.label,
        icon: <item.icon aria-hidden className="size-3.5" strokeWidth={1.75} />,
      }))}
      onValueChange={(next) => {
        if (next === 'diary' || next === 'questionnaire' || next === 'rations') {
          onChange(next)
        }
      }}
      value={value}
    />
  )
}

export function MentorHome({ user }: { user: UserDto }) {
  return (
    <MentorHomeShell
      description="Управляйте подключёнными пользователями и настройками наставника."
      title={`Добро пожаловать, ${user.displayName ?? user.email}`}
    />
  )
}

export function MentorUsers({ user }: { user: UserDto }) {
  return (
    <SettingsCanvas
      description="Подключённые пользователи и бонус за каждого."
      eyebrow="Наставник"
      meta={user.email}
      phoneSheet
      showJumpLink={false}
      showMobileTitle
      title="Пользователи"
    >
      <MentorUserDirectory />
    </SettingsCanvas>
  )
}

export function MentorProfile({ user }: { user: UserDto }) {
  return (
    <SettingsCanvas
      ctaLabel="Профиль"
      description="Имя и никнейм в приложении."
      editable
      eyebrow="Аккаунт"
      meta={user.email}
      phoneSheet
      showMobileTitle
      title="Профиль"
    >
      <ProfilePanel user={user} />
      <SettingsEntry description="Роль и номер." title="Аккаунт">
        <SettingsReadRows
          rows={[
            { icon: UserRoundIcon, label: 'Роль', value: 'Наставник' },
            { icon: HashIcon, label: 'ID', value: String(user.publicId) },
          ]}
        />
      </SettingsEntry>
    </SettingsCanvas>
  )
}

export function MentorMenteeDiary({
  userId,
  planView,
  rationBack,
  view: viewProp,
  onViewChange,
}: {
  userId: string
  planView?: ReactNode
  /** Returns from an opened mentee ration. Shown as the toolbar back pill. */
  rationBack?: (() => void) | null
  view?: MenteeView
  onViewChange?: (view: MenteeView) => void
}) {
  const [localView, setLocalView] = useState<MenteeView>('diary')
  const view = viewProp ?? localView
  const setView = onViewChange ?? setLocalView
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
  const planLibrary = useMentorUserPlanLibraryQuery(userId)
  const subjectPlan = useMemo(() => {
    if (planLibrary.data) {
      return {
        selectedPlanIds: planLibrary.data.selectedPlanIds,
        planStarts: Object.fromEntries(
          planLibrary.data.planStarts.map((item) => [item.planId, item.dayKey]),
        ),
        planGenerations: Object.fromEntries(
          planLibrary.data.planStarts.flatMap((item) =>
            item.generation ? [[item.planId, item.generation] as const] : [],
          ),
        ),
      }
    }
    if (planLibrary.isError) return { selectedPlanIds: [], planStarts: {} }
    return undefined
  }, [planLibrary.data, planLibrary.isError])
  const viewDescription =
    view === 'questionnaire'
      ? 'Профиль подключённого пользователя.'
      : view === 'rations'
        ? 'Рационы подключённого пользователя.'
        : 'Дневник подключённого пользователя.'

  return (
    <DiaryNewsPage
      body={
        view === 'questionnaire' ? (
          <MentorMenteeQuestionnaire
            displayName={mentee?.displayName}
            email={mentee?.email}
            nickname={mentee?.nickname}
          />
        ) : view === 'rations' ? (
          planView
        ) : undefined
      }
      heading={{
        title,
        description: viewDescription,
      }}
      periodStartIso={mentee?.createdAt}
      readOnly
      subjectEmail={mentee?.email}
      subjectPlan={subjectPlan}
      subjectPlanPending={planLibrary.isPending}
      subjectUserId={userId}
      toolbarDisabled={view !== 'diary'}
      onMealsViewed={view === 'diary' && mentee ? onMealsViewed : undefined}
      toolbarStart={
        view === 'rations' && rationBack ? (
          <button
            aria-label="Назад"
            className="ios-float-pill nora-press-grow flex size-9 shrink-0 items-center justify-center p-0 text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)] [&>svg]:size-4"
            onClick={rationBack}
            type="button"
          >
            <ArrowLeftIcon aria-hidden />
          </button>
        ) : undefined
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
      editable
      eyebrow="Наставник"
      meta={user.email}
      phoneSheet
      showMobileTitle
      title="Настройки"
    >
      <NicknamePanel user={user} />
      <TelegramUsernamePanel user={user} variant="notify" />
      <ReferralLinkPanel layout="entry" user={user} variant="mentor" />
    </SettingsCanvas>
  )
}

function MentorHomeShell({
  description,
  title = 'Главная',
  children,
}: {
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
          </div>
          <p className={`mt-1.5 ${noraPageDescriptionClass}`}>{description}</p>
        </header>
        {children}
      </div>
    </div>
  )
}

