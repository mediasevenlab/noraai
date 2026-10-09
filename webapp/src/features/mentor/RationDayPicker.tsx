import * as React from 'react'
import {
  CheckIcon,
  Loader2Icon,
  UsersIcon,
  XIcon,
} from '@/components/icons'
import type { AdminUserSummary } from '@web-app-demo/contracts'

import { NoraSelect } from '@/components/nora/primitives'
import { ProductFeedEmpty, SectionLoading, productSheetOverlayChipClass } from '@/components/nora/product-sheet'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { mealsForWeekPlan } from '@/features/diary'
import { cn } from '@/lib/utils'

import { menteePickerLabel } from './authored-rations'
import {
  rationDayPlanState,
  rationPlanWeekDays,
  weekPlanOptions,
  type RationPlanWeekDay,
  type WeekPlanOption,
} from './ration-assignments'
import {
  GOAL_BADGE_CLASS,
  RATION_FROST_BADGE_CLASS,
  RATION_OVERLAY_CHIP_CLASS,
} from './ration-chrome'
import type { RationEntry } from './rations-catalog'

const RATION_DAY_PICKER_FRAME_CLASS = cn(
  'flex flex-col gap-0 overflow-hidden p-0',
  'inset-x-0 top-[var(--modal-sheet-inset)] bottom-0 h-[calc(100dvh-var(--modal-sheet-inset))] max-h-[calc(100dvh-var(--modal-sheet-inset))] w-full max-w-none translate-x-0 translate-y-0 rounded-t-[var(--modal-sheet-radius)] rounded-b-none',
  'md:inset-auto md:top-1/2 md:left-1/2 md:h-auto md:max-h-[min(720px,calc(100vh-2rem))] md:w-[min(100%-2rem,460px)] md:max-w-[460px] md:rounded-[22px]',
)

const RATION_DAY_ROW_CLASS = cn(
  'nora-press-grow ios-glass-glare-soft flex min-h-12 items-center gap-2.5 rounded-[14px] border-0 px-2.5 py-2 text-left',
  'bg-[var(--nora-inset)] text-[var(--nora-text-secondary)] outline-none',
  'hover:bg-[color-mix(in_srgb,var(--nora-inset)_82%,var(--nora-text)_8%)] hover:text-[var(--nora-text)]',
  'focus-visible:shadow-[var(--nora-shadow-focus)] disabled:opacity-60',
)

export function RationDayPickerBody({
  addingDayKey,
  collapsing = false,
  demoPressedDayKey = null,
  hideClose = false,
  meals,
  onClose,
  onSelectDay,
  plans,
  planId: planIdProp,
  onPlanIdChange,
  ration,
  rations,
}: {
  addingDayKey: string | null
  collapsing?: boolean
  demoPressedDayKey?: string | null
  hideClose?: boolean
  meals: readonly { id: string; title: string; recordedAt: string; assumptions: string[] }[]
  onClose?: () => void
  onSelectDay: (day: RationPlanWeekDay, planId: string) => void
  plans?: readonly WeekPlanOption[]
  planId?: string
  onPlanIdChange?: (planId: string) => void
  ration: RationEntry
  rations: readonly RationEntry[]
}) {
  const planOptions = plans && plans.length > 0 ? plans : weekPlanOptions()
  const fallbackPlanId = planOptions[0]?.id ?? ''
  const [localPlanId, setLocalPlanId] = React.useState(planIdProp ?? fallbackPlanId)
  const planId = planIdProp ?? localPlanId
  const planMeals = mealsForWeekPlan(meals, planId, fallbackPlanId)
  const days = rationPlanWeekDays()
  const planItems = planOptions.map((plan) => ({ value: plan.id, label: plan.title }))

  React.useEffect(() => {
    if (planIdProp) setLocalPlanId(planIdProp)
  }, [planIdProp])

  function setPlanId(next: string) {
    setLocalPlanId(next)
    onPlanIdChange?.(next)
  }

  return (
    <>
      <DialogHeader
        className={cn(
          'min-w-0 shrink-0 gap-1 px-3 pt-3 text-left transition-opacity ease-out sm:px-4 sm:pt-3.5',
          collapsing
            ? 'pointer-events-none bg-transparent opacity-0'
            : 'bg-[var(--nora-modal)]',
        )}
        style={{ transitionDuration: collapsing ? '180ms' : '300ms' }}
      >
        <div className="flex items-start justify-between gap-3">
          <DialogTitle className="font-[family-name:var(--nora-font)] !text-[15px] !font-medium !leading-6 tracking-normal text-[var(--nora-text)]">
            Выберите день
          </DialogTitle>
          {hideClose ? null : (
            <DialogClose
              aria-label="Закрыть"
              className={cn(
                RATION_OVERLAY_CHIP_CLASS,
                'nora-press-grow size-8 shrink-0 sm:size-6',
                'hover:text-[var(--nora-text)] focus-visible:shadow-[var(--nora-shadow-focus)]',
              )}
              onClick={onClose}
            >
              <XIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
            </DialogClose>
          )}
        </div>
        <DialogDescription className="font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]">
          {ration.title}. Можно добавить в несколько дней или заменить уже составленный день.
        </DialogDescription>
        <div className="pt-1.5">
          <span className={cn(RATION_FROST_BADGE_CLASS, GOAL_BADGE_CLASS[ration.goal])}>
            {ration.goal}
          </span>
        </div>
        <div className="pt-2" data-ration-plan-select="">
          <NoraSelect
            disabled={Boolean(addingDayKey)}
            items={planItems}
            onValueChange={(value) => {
              if (value) setPlanId(value)
            }}
            placeholder="План"
            value={planId}
          />
        </div>
        <div aria-hidden className="mt-1.5 border-t border-[var(--nora-divider)]" />
      </DialogHeader>
      <div
        className={cn(
          'flex flex-col gap-1.5 px-3 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] transition-opacity ease-out sm:px-4 sm:pb-3.5',
          collapsing && 'pointer-events-none min-h-0 flex-none opacity-0',
        )}
        style={{ transitionDuration: collapsing ? '220ms' : '300ms' }}
      >
        {days.map((day) => {
          const state = rationDayPlanState(rations, planMeals, day.date, ration.id)
          const busy = addingDayKey === day.dayKey
          const hint =
            state.kind === 'same'
              ? 'уже в плане'
              : state.kind === 'replace'
                ? 'заменить'
                : 'свободен'
          return (
            <button
              className={RATION_DAY_ROW_CLASS}
              data-demo-pressed={demoPressedDayKey === day.dayKey ? '' : undefined}
              data-plan-state={state.kind}
              data-ration-day={day.dayKey}
              disabled={busy || Boolean(addingDayKey)}
              key={day.dayKey}
              onClick={() => onSelectDay(day, planId)}
              type="button"
            >
              <span
                className={cn(
                  RATION_FROST_BADGE_CLASS,
                  'w-8 justify-center self-center bg-[var(--nora-panel)]/80 px-0 text-[var(--nora-text)]',
                )}
              >
                {day.short}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-baseline gap-1.5 font-[family-name:var(--nora-font)] text-[13px] font-normal text-[var(--nora-text)]">
                  <span className="truncate">{day.label}</span>
                </span>
                {state.kind !== 'free' ? (
                  <span className="mt-0.5 block font-[family-name:var(--nora-font)] text-[12px] font-light leading-4 text-[var(--nora-text-tertiary)]">
                    {state.title}
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  RATION_FROST_BADGE_CLASS,
                  'shrink-0 self-center whitespace-nowrap font-normal',
                  state.kind === 'same' &&
                    'bg-[var(--nora-badge-green-bg)] text-[var(--nora-badge-green-text)]',
                  state.kind === 'replace' &&
                    'bg-[var(--nora-badge-yellow-bg)] text-[var(--nora-badge-yellow-text)]',
                  state.kind === 'free' && 'bg-[var(--nora-panel)]/80',
                )}
              >
                {busy ? 'добавляем…' : hint}
              </span>
              {busy ? (
                <Loader2Icon className="size-4 shrink-0 animate-spin text-[var(--nora-text-tertiary)]" />
              ) : state.kind === 'same' ? (
                <CheckIcon className="size-3.5 shrink-0 text-[var(--nora-badge-green-text)]" />
              ) : null}
            </button>
          )
        })}
      </div>
    </>
  )
}

export function RationDayPicker({
  addingDayKey,
  meals,
  onOpenChange,
  onSelectDay,
  open,
  planId,
  plans,
  onPlanIdChange,
  ration,
  rations,
}: {
  addingDayKey: string | null
  meals: readonly { id: string; title: string; recordedAt: string; assumptions: string[] }[]
  onOpenChange: (open: boolean) => void
  onSelectDay: (day: RationPlanWeekDay, planId: string) => void
  open: boolean
  planId?: string
  plans?: readonly WeekPlanOption[]
  onPlanIdChange?: (planId: string) => void
  ration: RationEntry | null
  rations: readonly RationEntry[]
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={RATION_DAY_PICKER_FRAME_CLASS}
        data-modal-frame="meal"
        data-ration-day-picker=""
        showCloseButton={false}
      >
        {ration ? (
          <RationDayPickerBody
            addingDayKey={addingDayKey}
            meals={meals}
            onPlanIdChange={onPlanIdChange}
            onSelectDay={onSelectDay}
            planId={planId}
            plans={plans}
            ration={ration}
            rations={rations}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

const USER_PICKER_FRAME_CLASS = cn(
  '!flex flex-col gap-0 overflow-hidden bg-[var(--nora-modal)] p-0',
  'inset-x-0 bottom-0 top-auto h-auto max-h-[calc(100dvh-var(--modal-sheet-inset))] w-full max-w-none translate-x-0 translate-y-0 rounded-t-[var(--modal-sheet-radius)] rounded-b-none',
  'md:inset-auto md:top-1/2 md:left-1/2 md:bottom-auto md:h-auto md:max-h-[min(760px,calc(100vh-2rem))] md:w-[min(100%-2rem,480px)] md:max-w-[480px] md:rounded-[24px]',
)

const USER_PICKER_ROW_CLASS = cn(
  'nora-press-grow ios-glass-glare-soft flex min-h-12 items-center gap-3 rounded-[14px] border-0 px-3.5 py-2.5 text-left',
  'bg-[var(--nora-inset)] text-[var(--nora-text-secondary)] outline-none',
  'hover:bg-[color-mix(in_srgb,var(--nora-inset)_88%,var(--nora-text)_6%)] hover:text-[var(--nora-text)]',
  'focus-visible:shadow-[var(--nora-shadow-focus)] disabled:cursor-default disabled:opacity-70',
)

export function RationUserPicker({
  assigningUserId,
  assignedUserIds,
  emptyText = 'Пока нет подключённых пользователей',
  onOpenChange,
  onSelectUser,
  open,
  pending = false,
  ration,
  users,
}: {
  assigningUserId: string | null
  assignedUserIds: ReadonlySet<string>
  emptyText?: string
  onOpenChange: (open: boolean) => void
  onSelectUser: (userId: string) => void
  open: boolean
  pending?: boolean
  ration: RationEntry | null
  users: readonly AdminUserSummary[]
}) {
  const failedLoad = emptyText.startsWith('Не удалось')
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={USER_PICKER_FRAME_CLASS}
        data-modal-frame="meal"
        data-phone-fit=""
        data-ration-user-picker=""
        showCloseButton={false}
      >
        {ration ? (
          <>
            <div className="flex shrink-0 flex-col gap-2 px-2 pt-2">
              <DialogHeader className="min-w-0 gap-1 rounded-[16px] bg-[var(--nora-inset)] p-2.5 text-left">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--nora-text)] text-[var(--nora-modal)]">
                      <UsersIcon aria-hidden className="size-4" strokeWidth={1.7} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <DialogTitle className="truncate font-[family-name:var(--nora-font)] !text-[15px] !font-medium !leading-6 tracking-normal text-[var(--nora-text)]">
                        Выберите пользователя
                      </DialogTitle>
                      <DialogDescription className="truncate font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]">
                        {ration.title}. Можно отправить нескольким пользователям.
                      </DialogDescription>
                    </div>
                  </div>
                  <DialogClose
                    aria-label="Закрыть"
                    className={cn(
                      productSheetOverlayChipClass,
                      'nora-press-grow size-8 shrink-0 bg-[var(--nora-panel)]/80 sm:size-8',
                      'hover:text-[var(--nora-text)] focus-visible:shadow-[var(--nora-shadow-focus)]',
                    )}
                  >
                    <XIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
                  </DialogClose>
                </div>
              </DialogHeader>
            </div>
            <div className="flex min-h-0 flex-col gap-2.5 overflow-y-auto px-3.5 pt-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:pb-3.5">
              {pending ? (
                <SectionLoading label="Загрузка пользователей" />
              ) : users.length === 0 ? (
                <ProductFeedEmpty
                  description={
                    failedLoad
                      ? 'Проверьте соединение и попробуйте ещё раз.'
                      : 'Подключённые пользователи появятся в этом списке.'
                  }
                  title={emptyText}
                />
              ) : (
                users.map((user) => {
                  const label = menteePickerLabel(user)
                  const subtitle = user.displayName?.trim()
                    ? user.nickname?.trim() || user.email
                    : user.nickname?.trim()
                      ? user.email
                      : null
                  const already = assignedUserIds.has(user.id)
                  const busy = assigningUserId === user.id
                  const hint = already ? 'уже есть' : 'свободен'
                  return (
                    <button
                      className={USER_PICKER_ROW_CLASS}
                      data-plan-state={already ? 'same' : 'free'}
                      data-ration-user={user.id}
                      disabled={busy || Boolean(assigningUserId)}
                      key={user.id}
                      onClick={() => onSelectUser(user.id)}
                      type="button"
                    >
                      <span
                        className={cn(
                          'flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                          already
                            ? 'border-[var(--nora-success)] bg-[var(--nora-panel)]'
                            : busy
                              ? 'border-[var(--nora-success)] bg-[var(--nora-success-dimmed)] text-[var(--nora-success)]'
                              : 'border-[var(--nora-border-strong)] bg-[var(--nora-panel)]',
                        )}
                      >
                        {busy ? (
                          <Loader2Icon className="size-3 animate-spin" />
                        ) : already ? (
                          <span aria-hidden className="size-2 rounded-full bg-[var(--nora-success)]" />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text)]">
                          {label}
                        </span>
                        {subtitle && subtitle !== label ? (
                          <span className="mt-0.5 block truncate font-[family-name:var(--nora-font)] text-[12px] font-light leading-4 text-[var(--nora-text-tertiary)]">
                            {subtitle}
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          'shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 font-[family-name:var(--nora-font)] text-[11px] leading-none',
                          already
                            ? 'bg-[var(--nora-success)] font-medium text-white'
                            : 'bg-[var(--nora-panel)]/80 text-[var(--nora-text-tertiary)]',
                        )}
                      >
                        {busy ? 'отправляем…' : hint}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
