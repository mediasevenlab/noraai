import * as React from 'react'
import {
  BookOpenIcon,
  BookmarkIcon,
  CalendarIcon,
  CalendarPlusIcon,
  CameraIcon,
  FileTextIcon,
  ChefHatIcon,
  CircleCheckIcon,
  CircleIcon,
  ClipboardListIcon,
  ImageIcon,
  LeafIcon,
  PlusIcon,
  Share2Icon,
  ShoppingBagIcon,
  TargetIcon,
  UtensilsCrossedIcon,
  ZapIcon,
  type LucideIcon,
} from '@/components/icons'

import { Dialog } from '@/components/ui/dialog'
import {
  AUTH_DEMO_CAPTIONS,
  AUTH_DEMO_FIRST_PLAN_INDEX,
  AUTH_DEMO_PLAN_DAILY_KCAL,
  AUTH_DEMO_SHOP_INDEX,
  AUTH_MEAL_CAROUSEL_INTERVAL_MS,
  AUTH_MEAL_EXPAND_MS,
  AUTH_MEAL_COVER_FADE_MS,
  AUTH_MEAL_INTRO,
  AUTH_MEAL_OPEN_SCALE,
  AUTH_MEAL_SIDE_SCALE,
  AUTH_MEAL_SIDE_X_REM,
  AUTH_MEAL_SLIDE_MS,
  AUTH_DEMO_RATION_SLOT_ID,
  AUTH_MEAL_SAVE_DEMO,
  AUTH_MEAL_SHARE_DEMO,
  AUTH_DEMO_SHARE_AUTHOR,
  AUTH_DEMO_SHARE_AUDIENCE,
  AUTH_DEMO_SHARE_LIKE_TO,
  AUTH_MEAL_CARD_WIDTH_REM,
  AUTH_PLAN_BALANCE_DEMO,
  AUTH_PLAN_DAY_DEMO,
  AUTH_SHOP_DEMO,
  AuthDayShoppingSheet,
  AuthDiaryDayBar,
  AuthPlanMealIdleSheet,
  MealAddDraftIdleSheet,
  MealCard,
  authDemoAttachItemsForMeal,
  authDemoCarouselItems,
  authDemoFormedMeal,
  authDemoShareMeal,
  authDemoMealShowsFeedChrome,
  authDemoPitchCaptionId,
  authDemoClear,
  authDemoCreatesAtIndex,
  authDemoElapsedMs,
  authDemoIsPaused,
  authDemoIsSeeking,
  authDemoSubscribe,
  authDemoCaptionTop,
  authDemoLeftCardInsetRem,
  authDemoPlanBalanceFromDelta,
  authDemoPlanDayHeading,
  authDemoPlanKcalTotal,
  authDemoOpensRationAtIndex,
  authDemoSheetPlayStartMs,
  authDemoSetPaused,
  authDemoTimeout,
  authSaveDemoDoneAtMs,
  authSaveDemoPressAtMs,
  authSaveDemoPressEndAtMs,
  authSaveDemoSlideAtMs,
  authSaveDemoToastAtMs,
  authShareDemoDoneAtMs,
  authShareDemoFeedAtMs,
  authShareDemoLikeCountAt,
  authShareDemoLikeCountAtMs,
  authShareDemoLikePressAtMs,
  authShareDemoMenuOpenAtMs,
  authShareDemoMenuPressAtMs,
  authShareDemoSharePressAtMs,
  authPreviewMeals,
  useAuthDemoRemountHold,
  useAuthDemoSeeking,
  isRationImportedMeal,
  prefetchMealPhoto,
  signedCarouselOffset,
  type AuthDemoCaptionId,
  type MealEntry,
} from '@/features/diary'
import { type AuthDemoSurface } from '../auth-demo-timeline'
import { AUTH_DEMO_MARQUEE } from '../auth-demo-feature-marquee'
import {
  AUTH_RATION_ADD_DEMO,
  AUTH_RATION_FILTER_FROM_GOAL,
  AUTH_RATION_FILTER_TO_GOAL,
  AuthMentorRationCreateSheet,
  AuthRationDayPickerSheet,
  AuthRationGoalBar,
  AuthRationIdleSheet,
  RationCard,
  authMentorCreateDraftRation,
  authMentorCreateExistingRation,
  authMentorCreateOpenAtMs,
  authMentorCreatePressAtMs,
  authMentorCreateSavedAtMs,
  authPreviewGainRation,
  authPreviewRation,
  authDemoPlanMeals,
  authDemoPlanRange,
  authRationAddOpenAtMs,
  authRationAddPlusPressAtMs,
  authRationSelectOpenAtMs,
  authRationSelectPressAtMs,
  AUTH_RATION_SELECT_DEMO,
  authRationFilterCloseAtMs,
  authRationFilterCommitAtMs,
  authRationFilterItemPressAtMs,
  authRationFilterMenuOpenAtMs,
  authRationFilterReadyAtMs,
  authRationFilterSelectAtMs,
  authRationFilterTriggerPressAtMs,
  rationMealImages,
  type RationGoal,
} from '@/features/mentor'
import { cn } from '@/lib/utils'
import { AuthFeedRationCard } from './AuthFeedRationCard'
import { AuthPlanStartSheet } from './AuthPlanStartSheet'

const noop = () => undefined
const MENTOR_DEMO_DAYS = 7
const MENTOR_SELECT_SETTLE_MS = 640
const MENTOR_SELECT_PRESS_MS = 280

function mentorDemoWeek<T extends { days: number }>(ration: T): T {
  return ration.days >= MENTOR_DEMO_DAYS ? ration : { ...ration, days: MENTOR_DEMO_DAYS }
}

/** Matches the desktop meal card min-height so the footer padding is not clipped. */
const CARD_FRAME_CLASS = 'h-[365px] w-[16.75rem]'
const OPEN_FRAME_CLASS = 'h-[min(44rem,calc(100svh-10rem))] w-[24.5rem]'
const OPEN_MENTOR_FRAME_CLASS = 'h-[min(47rem,calc(100svh-8rem))] w-[24.5rem]'
/** Phone embed: captions are hidden, so the sheet can use the frame height. */
const OPEN_FRAME_COMPACT_CLASS = 'h-[min(44rem,calc(100svh-2rem))] w-[24.5rem]'
const OPEN_MENTOR_FRAME_COMPACT_CLASS = 'h-[min(47rem,calc(100svh-2rem))] w-[24.5rem]'
const MENTOR_CREATE_CLASS = cn(
  'nora-press-grow ios-glass-glare inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border-0 px-3',
  'font-[family-name:var(--nora-font)] text-[13px] font-normal leading-none text-[var(--nora-text-secondary)]',
  'bg-[var(--nora-inset)] shadow-[var(--nora-shadow-modal)]',
)
const OPEN_DAY_PICKER_FRAME_CLASS = 'h-[min(34rem,calc(100svh-10rem))] w-[24.5rem]'
const OPEN_DAY_PICKER_FRAME_COMPACT_CLASS = 'h-[min(34rem,calc(100svh-2rem))] w-[24.5rem]'
/** Same width as the other demo sheets; tall enough for the seven plan days. */
const OPEN_PLAN_PICKER_FRAME_CLASS = 'h-[min(38rem,calc(100svh-10rem))] w-[24.5rem]'
const OPEN_PLAN_PICKER_FRAME_COMPACT_CLASS = 'h-[min(38rem,calc(100svh-2rem))] w-[24.5rem]'
const OPEN_PLAN_START_FRAME_CLASS = 'h-[min(26rem,calc(100svh-10rem))] w-[24.5rem]'
const OPEN_PLAN_START_FRAME_COMPACT_CLASS = 'h-[min(26rem,calc(100svh-2rem))] w-[24.5rem]'
/** Phone embed lays out a 720px-tall stage, then scales it with the cards. */
const OPEN_FRAME_FIT_CLASS = 'h-[43rem] w-[24.5rem]'
const OPEN_DAY_PICKER_FRAME_FIT_CLASS = 'h-[34rem] w-[24.5rem]'
const OPEN_PLAN_PICKER_FRAME_FIT_CLASS = 'h-[38rem] w-[24.5rem]'
const OPEN_PLAN_START_FRAME_FIT_CLASS = 'h-[26rem] w-[24.5rem]'
const PHONE_EMBED_STAGE_WIDTH = 440
const MOTION_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const PRESS_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'
const CAPTION_FADE_MS = 340

const AUTH_DEMO_CAPTION_ICONS = {
  diary: BookOpenIcon,
  add: PlusIcon,
  photos: CameraIcon,
  analyze: ZapIcon,
  ready: UtensilsCrossedIcon,
  nutrients: LeafIcon,
  saved: BookmarkIcon,
  share: Share2Icon,
  ration: ClipboardListIcon,
  rationFilter: TargetIcon,
  rationMeals: ImageIcon,
  rationCook: ChefHatIcon,
  rationShop: ShoppingBagIcon,
  rationAdd: CalendarPlusIcon,
  rationDay: CalendarIcon,
  planChosen: CircleCheckIcon,
  dayNorm: TargetIcon,
  planMeal: CircleIcon,
  shopping: ShoppingBagIcon,
  planDone: CircleCheckIcon,
  mentorCreate: PlusIcon,
  mentorEditor: FileTextIcon,
  mentorSaved: ClipboardListIcon,
} satisfies Record<AuthDemoCaptionId, LucideIcon>

export function AuthMealCarousel({
  fittedPhone = false,
  surface = 'login',
  plain = false,
}: {
  surface?: AuthDemoSurface
  /** Landing embed: pull side cards inward so the frame does not crop them. */
  plain?: boolean
  /** Short landing frame: sheets use the 720px stage height and scale with the cards. */
  fittedPhone?: boolean
}) {
  const [sideSpreadRem, setSideSpreadRem] = React.useState<number | null>(() =>
    plain && typeof window !== 'undefined'
      ? embedSideSpreadRem(fittedPhone ? PHONE_EMBED_STAGE_WIDTH : window.innerWidth)
      : null,
  )
  const [compactFrame, setCompactFrame] = React.useState(
    () => plain && typeof window !== 'undefined' && window.innerWidth <= 520,
  )

  React.useEffect(() => {
    if (!plain) return
    const update = () => {
      setSideSpreadRem(embedSideSpreadRem(fittedPhone ? PHONE_EMBED_STAGE_WIDTH : window.innerWidth))
      setCompactFrame(window.innerWidth <= 520)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [fittedPhone, plain])

  const meals = React.useMemo(() => authPreviewMeals().slice(0, 5), [])
  const lossRation = React.useMemo(() => authPreviewRation(), [])
  const gainRation = React.useMemo(() => authPreviewGainRation(), [])
  const [planMeals, setPlanMeals] = React.useState<MealEntry[]>([])
  const [completedIds, setCompletedIds] = React.useState(() => new Set<string>())
  const [balanceDelta, setBalanceDelta] = React.useState<number | null>(null)
  const existingMentorRation = React.useMemo(() => authMentorCreateExistingRation(), [])
  const createdMentorRation = React.useMemo(() => authMentorCreateDraftRation(), [])
  const items = React.useMemo(() => {
    if (surface === 'signup-mentor') {
      return [
        { kind: 'ration' as const, id: 'mentor-side-left', ration: mentorDemoWeek(authPreviewRation()) },
        { kind: 'ration' as const, id: 'mentor-front', ration: mentorDemoWeek(existingMentorRation) },
        { kind: 'ration' as const, id: 'mentor-side-right', ration: mentorDemoWeek(authPreviewGainRation()) },
      ]
    }
    return authDemoCarouselItems(meals, gainRation, planMeals, {
      includeRation: false,
    })
  }, [existingMentorRation, gainRation, meals, planMeals, surface])
  const [active, setActive] = React.useState(() =>
    surface === 'login' ? 0 : surface === 'signup-mentor' ? 1 : 2,
  )
  const [pressed, setPressed] = React.useState(false)
  const [openId, setOpenId] = React.useState<string | null>(null)
  const [openSheet, setOpenSheet] = React.useState<
    'draft' | 'ration' | 'day-picker' | 'plan-start' | 'plan-meal' | 'shopping' | 'mentor-create' | null
  >(null)
  const [frameOpen, setFrameOpen] = React.useState(false)
  const [introDone, setIntroDone] = React.useState(() => surface !== 'login')
  const [reduceMotion, setReduceMotion] = React.useState(false)
  const [detailEntered, setDetailEntered] = React.useState(false)
  const [collapseHandOff, setCollapseHandOff] = React.useState(false)
  const [draftOpenedAt, setDraftOpenedAt] = React.useState<string | null>(null)
  const seeking = useAuthDemoSeeking()
  const openedElapsedRef = React.useRef(0)
  const [sheetMs, setSheetMs] = React.useState(0)
  const [captionId, setCaptionId] = React.useState<AuthDemoCaptionId>(
    surface === 'signup-mentor'
      ? 'mentorCreate'
      : surface === 'signup-user'
        ? 'rationAdd'
        : 'diary',
  )
  const [rationShown, setRationShown] = React.useState(gainRation)
  const [rationGoal, setRationGoal] = React.useState<RationGoal>(AUTH_RATION_FILTER_FROM_GOAL)
  const [rationMenuOpen, setRationMenuOpen] = React.useState(false)
  const [rationTriggerPressed, setRationTriggerPressed] = React.useState(false)
  const [rationPressedGoal, setRationPressedGoal] = React.useState<RationGoal | null>(null)
  const [rationFilterPlaying, setRationFilterPlaying] = React.useState(false)
  const [rationActDone, setRationActDone] = React.useState(() => surface === 'signup-user')
  const [rationAddPlaying, setRationAddPlaying] = React.useState(false)
  const [addPressed, setAddPressed] = React.useState(false)
  const [planDayPlaying, setPlanDayPlaying] = React.useState(false)
  const [signupRationVisible, setSignupRationVisible] = React.useState(false)
  const [rationSelectPressed, setRationSelectPressed] = React.useState(false)
  const [rationSelectAdded, setRationSelectAdded] = React.useState(false)
  const [signupPlanHeld, setSignupPlanHeld] = React.useState(false)
  const [signupNormMet, setSignupNormMet] = React.useState(false)
  const [shoppingDone, setShoppingDone] = React.useState(false)
  const [planActDone, setPlanActDone] = React.useState(false)
  const [mentorCreatePending, setMentorCreatePending] = React.useState(
    () => surface === 'signup-mentor',
  )
  const [mentorCreateActive, setMentorCreateActive] = React.useState(false)
  const [mentorCreatePressed, setMentorCreatePressed] = React.useState(false)
  const [mentorCreatedVisible, setMentorCreatedVisible] = React.useState(false)
  const [mentorSelectPressed, setMentorSelectPressed] = React.useState(false)
  const [mentorSelectAdded, setMentorSelectAdded] = React.useState(false)
  const [boughtKeys, setBoughtKeys] = React.useState(() => new Set<string>())
  const [basketPressed, setBasketPressed] = React.useState(false)
  const [draftActDone, setDraftActDone] = React.useState(() => surface !== 'login')
  const [mealDoneVisible, setMealDoneVisible] = React.useState(false)
  const [savePlaying, setSavePlaying] = React.useState(false)
  const [saveDone, setSaveDone] = React.useState(() => surface !== 'login')
  const [savePressed, setSavePressed] = React.useState(false)
  const [saveToast, setSaveToast] = React.useState(false)
  const [toastLeaving, setToastLeaving] = React.useState(false)
  const [sharePlaying, setSharePlaying] = React.useState(false)
  const [shareDone, setShareDone] = React.useState(() => surface !== 'login')
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [menuPressed, setMenuPressed] = React.useState(false)
  const [sharePressed, setSharePressed] = React.useState(false)
  const [likePressed, setLikePressed] = React.useState(false)
  const [feedView, setFeedView] = React.useState(false)
  const [sharedMealId, setSharedMealId] = React.useState<string | null>(null)
  const [liked, setLiked] = React.useState(false)
  const [likeCount, setLikeCount] = React.useState(0)
  const [shareAudiencePulse, setShareAudiencePulse] = React.useState(false)
  const [shareAudienceVisible, setShareAudienceVisible] = React.useState(false)
  const [savedIds, setSavedIds] = React.useState(() => new Set<string>())
  const [demoFinished, setDemoFinished] = React.useState(false)
  const justClosedRef = React.useRef(false)
  const closeTimerRef = React.useRef<number | null>(null)
  const pendingPlanMealsRef = React.useRef<MealEntry[] | null>(null)
  const balanceTweenedRef = React.useRef(false)

  React.useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  React.useEffect(
    () =>
      authDemoSubscribe(() => {
        if (!authDemoIsSeeking()) return
        setSheetMs(Math.max(0, authDemoElapsedMs() - openedElapsedRef.current))
      }),
    [],
  )

  const finishDemo = React.useCallback(() => {
    setDemoFinished(true)
    setPlanDayPlaying(false)
    authDemoSetPaused(true)
  }, [])

  const openItemAt = React.useCallback(
    (index: number, sheet?: 'draft' | 'ration' | 'day-picker' | 'plan-start' | 'plan-meal' | 'shopping' | 'mentor-create') => {
      const target = items[index]
      if (!target) return
      const resolved =
        sheet ??
        (target.kind === 'ration'
          ? 'ration'
          : isRationImportedMeal(target.meal)
            ? 'plan-meal'
            : 'draft')
      setOpenSheet(resolved)
      setOpenId(target.id)
      setMentorCreatedVisible(false)
      if (resolved === 'mentor-create') {
        setMentorSelectPressed(false)
        setMentorSelectAdded(false)
      }
      setDraftOpenedAt(new Date().toISOString())
      setFrameOpen(true)
      setIntroDone(true)
      openedElapsedRef.current = authDemoElapsedMs()
      setSheetMs(0)
      if (authDemoIsSeeking()) {
        setPressed(false)
        setDetailEntered(true)
      }
    },
    [items],
  )
  const openItemAtRef = React.useRef(openItemAt)
  openItemAtRef.current = openItemAt

  React.useEffect(() => {
    if (surface !== 'login') return
    if (items.length < 2) {
      setIntroDone(true)
      return
    }
    if (reduceMotion) {
      setActive(1)
      setIntroDone(true)
      return
    }

    const timers = [
      authDemoTimeout(() => setActive(1), AUTH_MEAL_INTRO.firstPauseMs),
      authDemoTimeout(
        () => setPressed(true),
        AUTH_MEAL_INTRO.firstPauseMs + AUTH_MEAL_INTRO.slideMs + AUTH_MEAL_INTRO.clickDelayMs,
      ),
      authDemoTimeout(
        () => openItemAtRef.current(1),
        AUTH_MEAL_INTRO.firstPauseMs +
          AUTH_MEAL_INTRO.slideMs +
          AUTH_MEAL_INTRO.clickDelayMs +
          AUTH_MEAL_INTRO.pressMs,
      ),
    ]
    return () => {
      for (const id of timers) authDemoClear(id)
    }
    // Intro must not restart when planned meals are injected into the loop.
  }, [reduceMotion, surface])

  React.useEffect(() => {
    if (!openId) {
      setDetailEntered(false)
      setPressed(false)
      return
    }
    if (reduceMotion || seeking) {
      setPressed(false)
      setDetailEntered(true)
      return
    }
    const release = authDemoTimeout(() => setPressed(false), 40)
    const enter = authDemoTimeout(() => setDetailEntered(true), 80)
    return () => {
      authDemoClear(release)
      authDemoClear(enter)
    }
  }, [openId, reduceMotion, seeking])

  const closeOpenCard = React.useCallback(() => {
    const closedRation = openSheet === 'ration'
    if (closedRation) {
      justClosedRef.current = false
      setRationActDone(true)
      setCaptionId('rationAdd')
    } else if (openSheet === 'day-picker') {
      justClosedRef.current = false
      setCaptionId('rationAdd')
    } else if (openSheet === 'plan-start') {
      justClosedRef.current = false
      setCaptionId('rationDay')
    } else if (openSheet === 'shopping') {
      justClosedRef.current = false
      setShoppingDone(true)
      setCaptionId('planMeal')
    } else if (openSheet === 'plan-meal') {
      justClosedRef.current = false
      setCaptionId('planDone')
      setMentorCreatePending(true)
    } else if (openSheet === 'mentor-create') {
      justClosedRef.current = true
      setMentorCreateActive(false)
      setMentorCreatePressed(false)
      setMentorCreatedVisible(true)
      setCaptionId('mentorSaved')
    } else {
      justClosedRef.current = true
      setDraftActDone(true)
    }
    const startSaveDemo = openSheet === 'draft' || openSheet == null
    if (closedRation) {
      setRationAddPlaying(true)
    }
    if (closeTimerRef.current !== null) {
      authDemoClear(closeTimerRef.current)
      closeTimerRef.current = null
    }
    const closedDraft = openSheet === 'draft'
    const closedPlanStart = openSheet === 'plan-start'
    const finishClose = () => {
      setCollapseHandOff(false)
      setDetailEntered(false)
      setOpenId(null)
      setOpenSheet(null)
      setDraftOpenedAt(null)
      if (closedDraft) setMealDoneVisible(true)
      if (closedPlanStart) setRationSelectAdded(true)
    }
    if (reduceMotion || authDemoIsSeeking()) {
      finishClose()
      if (startSaveDemo) setSavePlaying(true)
      return
    }
    // Keep the sheet painted while the frame shrinks into the card.
    setFrameOpen(false)
    setSheetMs(0)
    closeTimerRef.current = authDemoTimeout(() => {
      closeTimerRef.current = null
      finishClose()
      if (startSaveDemo) setSavePlaying(true)
    }, AUTH_MEAL_EXPAND_MS + AUTH_MEAL_COVER_FADE_MS)
  }, [finishDemo, openSheet, reduceMotion])

  React.useEffect(() => {
    if (!openId || frameOpen) {
      setCollapseHandOff(false)
      return
    }
    const id = window.setTimeout(
      () => setCollapseHandOff(true),
      reduceMotion ? 0 : AUTH_MEAL_EXPAND_MS,
    )
    return () => window.clearTimeout(id)
  }, [frameOpen, openId, reduceMotion])

  React.useEffect(() => {
    if (!draftActDone || saveDone || savePlaying || openId || frameOpen) {
      return
    }
    if (surface !== 'login') return
    setSavePlaying(true)
  }, [draftActDone, frameOpen, openId, saveDone, savePlaying, surface])

  React.useEffect(() => {
    if (
      !rationActDone ||
      rationAddPlaying ||
      signupRationVisible ||
      signupPlanHeld ||
      planMeals.length > 0 ||
      openId ||
      frameOpen
    ) {
      return
    }
    if (surface !== 'signup-user') return
    setRationAddPlaying(true)
  }, [
    frameOpen,
    openId,
    planMeals.length,
    rationActDone,
    rationAddPlaying,
    signupPlanHeld,
    signupRationVisible,
    surface,
  ])

  React.useEffect(() => {
    if (items[active]?.kind === 'ration') return
    if (planMeals.length > 0) return
    setRationShown(gainRation)
    setRationGoal(AUTH_RATION_FILTER_FROM_GOAL)
    setRationMenuOpen(false)
    setRationTriggerPressed(false)
    setRationPressedGoal(null)
    setRationFilterPlaying(false)
  }, [active, gainRation, items, planMeals.length])

  React.useEffect(() => {
    if (openId) return
    if (surface === 'signup-user') {
      if (signupPlanHeld) {
        setCaptionId('dayNorm')
        return
      }
      if (rationSelectAdded && signupRationVisible) {
        setCaptionId('rationDay')
        return
      }
      if (signupRationVisible) {
        setCaptionId('ration')
        return
      }
      setCaptionId('rationAdd')
      return
    }
    // Keep the share pitch after the login feed act ends; signup surfaces
    // seek past share and must be free to show ration / mentor captions.
    if (sharePlaying || (saveDone && !shareDone)) {
      setCaptionId('share')
      return
    }
    if (surface === 'login' && shareDone) {
      setCaptionId('share')
      return
    }
    if (savePlaying || (draftActDone && !saveDone)) {
      setCaptionId('saved')
      return
    }
    if (mentorCreateActive || mentorCreatePending || mentorCreatedVisible) {
      setCaptionId(mentorCreatedVisible ? 'mentorSaved' : 'mentorCreate')
      return
    }
    if (signupRationVisible) {
      setCaptionId('ration')
      return
    }
    if (items[active]?.kind === 'ration') {
      if (rationAddPlaying) {
        setCaptionId('rationAdd')
        return
      }
      setCaptionId(
        rationGoal === AUTH_RATION_FILTER_TO_GOAL && !rationMenuOpen
          ? 'ration'
          : 'rationFilter',
      )
      return
    }
    if (items[active]?.kind === 'meal' && isRationImportedMeal(items[active].meal)) {
      setCaptionId(completedIds.size > 0 ? 'planDone' : 'planMeal')
      return
    }
    setCaptionId('diary')
  }, [
    active,
    completedIds,
    draftActDone,
    items,
    mentorCreateActive,
    mentorCreatePending,
    mentorCreatedVisible,
    openId,
    rationAddPlaying,
    rationGoal,
    rationMenuOpen,
    saveDone,
    savePlaying,
    shareDone,
    sharePlaying,
    signupPlanHeld,
    signupRationVisible,
    rationSelectAdded,
    surface,
  ])

  React.useEffect(() => {
    if (!savePlaying || openId || frameOpen) return
    const feedMeal = authDemoShareMeal()
    const feedIndex = items.findIndex((item) => item.id === feedMeal.id)
    const targetIndex =
      feedIndex >= 0 ? feedIndex : Math.min(items.length - 1, 2)
    const mealId = feedMeal.id

    if (reduceMotion) {
      setActive(targetIndex)
      setSavedIds((current) => new Set(current).add(mealId))
      if (!authDemoIsSeeking()) {
        setToastLeaving(false)
        setSaveToast(true)
      }
      setSavePlaying(false)
      setSaveDone(true)
      return
    }
    const timers = [
      // Show the formed salad first, then carousel to the feed card.
      authDemoTimeout(() => setActive(targetIndex), authSaveDemoSlideAtMs()),
      authDemoTimeout(() => setSavePressed(true), authSaveDemoPressAtMs()),
      authDemoTimeout(() => {
        setSavePressed(false)
        setSavedIds((current) => new Set(current).add(mealId))
      }, authSaveDemoPressEndAtMs()),
      authDemoTimeout(() => {
        if (!authDemoIsSeeking()) {
          setToastLeaving(false)
          setSaveToast(true)
        }
      }, authSaveDemoToastAtMs()),
      authDemoTimeout(() => {
        setSavePlaying(false)
        setSaveDone(true)
      }, authSaveDemoDoneAtMs()),
    ]
    return () => {
      for (const id of timers) authDemoClear(id)
    }
  }, [frameOpen, items, openId, reduceMotion, savePlaying])

  React.useEffect(() => {
    if (!saveToast || toastLeaving) return
    const id = authDemoTimeout(() => setToastLeaving(true), AUTH_MEAL_SAVE_DEMO.toastHoldMs)
    return () => authDemoClear(id)
  }, [saveToast, toastLeaving])

  React.useEffect(() => {
    if (!toastLeaving) return
    const id = authDemoTimeout(() => {
      setSaveToast(false)
      setToastLeaving(false)
    }, AUTH_MEAL_SAVE_DEMO.toastExitMs)
    return () => authDemoClear(id)
  }, [toastLeaving])

  React.useEffect(() => {
    if (!saveDone || sharePlaying || shareDone || openId || frameOpen) return
    setCaptionId('share')
    setSharePlaying(true)
  }, [frameOpen, openId, saveDone, shareDone, sharePlaying])

  React.useEffect(() => {
    if (!sharePlaying || openId || frameOpen) return
    const shareMeal = authDemoShareMeal()
    const shareIndex = items.findIndex((item) => item.id === shareMeal.id)
    const targetIndex =
      shareIndex >= 0 ? shareIndex : Math.min(items.length - 1, 2)

    // Stay on the same card as favorites (already centered after save).
    setActive(targetIndex)
    setSharedMealId(shareMeal.id)

    const finishShare = () => {
      setMenuOpen(false)
      setMenuPressed(false)
      setSharePressed(false)
      setLikePressed(false)
      setShareAudiencePulse(false)
      // Feed chrome is login-only; signup surfaces seek past share into ration/mentor.
      const keepFeed = surface === 'login'
      setShareAudienceVisible(keepFeed)
      setFeedView(keepFeed)
      setLiked(keepFeed)
      setLikeCount(keepFeed ? AUTH_DEMO_SHARE_LIKE_TO : 0)
      setSharePlaying(false)
      setShareDone(true)
      if (!keepFeed) setSharedMealId(null)
    }
    if (reduceMotion) {
      finishShare()
      return
    }
    let raf = 0
    const timers = [
      authDemoTimeout(() => setMenuPressed(true), authShareDemoMenuPressAtMs()),
      authDemoTimeout(() => {
        setMenuPressed(false)
        setMenuOpen(true)
      }, authShareDemoMenuOpenAtMs()),
      authDemoTimeout(() => setSharePressed(true), authShareDemoSharePressAtMs()),
      authDemoTimeout(
        () => setSharePressed(false),
        authShareDemoSharePressAtMs() + AUTH_MEAL_SHARE_DEMO.sharePressHoldMs,
      ),
      authDemoTimeout(() => {
        setMenuOpen(false)
        setFeedView(true)
      }, authShareDemoFeedAtMs()),
      authDemoTimeout(() => {
        setShareAudienceVisible(true)
        setLikePressed(true)
      }, authShareDemoLikePressAtMs()),
      authDemoTimeout(() => {
        setLikePressed(false)
        setLiked(true)
        setLikeCount(1)
      }, authShareDemoLikeCountAtMs() - AUTH_MEAL_SHARE_DEMO.afterLikePressMs),
      authDemoTimeout(() => {
        const origin = authDemoElapsedMs()
        const step = () => {
          const elapsed = authDemoElapsedMs() - origin
          setLikeCount(authShareDemoLikeCountAt(elapsed))
          if (elapsed >= AUTH_MEAL_SHARE_DEMO.likeCountMs) return
          raf = window.requestAnimationFrame(step)
        }
        raf = window.requestAnimationFrame(step)
      }, authShareDemoLikeCountAtMs()),
      authDemoTimeout(
        () => setShareAudiencePulse(true),
        authShareDemoLikePressAtMs() +
          AUTH_MEAL_SHARE_DEMO.audienceAvatarDelayMs +
          AUTH_DEMO_SHARE_AUDIENCE.length * AUTH_MEAL_SHARE_DEMO.audienceAvatarStaggerMs +
          AUTH_MEAL_SHARE_DEMO.audienceAvatarMs,
      ),
      authDemoTimeout(
        () => setShareAudiencePulse(false),
        authShareDemoLikePressAtMs() +
          AUTH_MEAL_SHARE_DEMO.audienceAvatarDelayMs +
          AUTH_DEMO_SHARE_AUDIENCE.length * AUTH_MEAL_SHARE_DEMO.audienceAvatarStaggerMs +
          AUTH_MEAL_SHARE_DEMO.audienceAvatarMs +
          AUTH_MEAL_SHARE_DEMO.audiencePulseMs,
      ),
      authDemoTimeout(finishShare, authShareDemoDoneAtMs()),
    ]
    return () => {
      window.cancelAnimationFrame(raf)
      for (const id of timers) authDemoClear(id)
    }
  }, [frameOpen, items, openId, reduceMotion, sharePlaying, surface])

  React.useEffect(() => {
    // After seeking past the login feed act, drop leftover share chrome on signup.
    if (surface === 'login') return
    if (!shareDone || sharePlaying) return
    setFeedView(false)
    setShareAudienceVisible(false)
    setSharedMealId(null)
    setLiked(false)
    setLikeCount(0)
  }, [shareDone, sharePlaying, surface])

  React.useEffect(() => {
    if (
      !introDone ||
      openId ||
      reduceMotion ||
      rationFilterPlaying ||
      rationAddPlaying ||
      planDayPlaying ||
      signupRationVisible ||
      signupPlanHeld ||
      surface === 'signup-mentor' ||
      savePlaying ||
      (draftActDone && !saveDone) ||
      sharePlaying ||
      (saveDone && !shareDone) ||
      demoFinished ||
      items.length < 2 ||
      (authDemoCreatesAtIndex(active) && !draftActDone) ||
      (authDemoOpensRationAtIndex(active) && planMeals.length === 0) ||
      (active === AUTH_DEMO_SHOP_INDEX && planMeals.length > 0 && !shoppingDone) ||
      (surface === 'login' && shareDone && !authDemoIsSeeking())
    ) {
      return
    }

    const id = authDemoTimeout(() => {
      setActive((current) => Math.min(current + 1, items.length - 1))
    }, AUTH_MEAL_CAROUSEL_INTERVAL_MS)
    return () => authDemoClear(id)
  }, [
    active,
    introDone,
    items.length,
    openId,
    planDayPlaying,
    planMeals.length,
    rationAddPlaying,
    rationFilterPlaying,
    reduceMotion,
    saveDone,
    savePlaying,
    shareDone,
    sharePlaying,
    shoppingDone,
    draftActDone,
    demoFinished,
    signupPlanHeld,
    signupRationVisible,
    surface,
  ])

  React.useEffect(() => {
    if (!pendingPlanMealsRef.current) return
    if (frameOpen) return
    const next = pendingPlanMealsRef.current
    pendingPlanMealsRef.current = null
    setPlanMeals(next)
    setRationShown(lossRation)
    setRationGoal(AUTH_RATION_FILTER_TO_GOAL)
    setRationAddPlaying(false)
    setAddPressed(false)
    setBoughtKeys(new Set())
    setShoppingDone(false)
    setPlanActDone(false)
    setPlanDayPlaying(true)
    setCompletedIds(new Set())
    setBalanceDelta(null)
    balanceTweenedRef.current = false
  }, [frameOpen, lossRation])

  React.useEffect(() => {
    if (!rationAddPlaying || openId || frameOpen || !introDone) return

    if (reduceMotion) {
      setSignupRationVisible(true)
      setRationAddPlaying(false)
      return
    }

    const timers = [
      authDemoTimeout(() => setAddPressed(true), authRationAddPlusPressAtMs()),
      authDemoTimeout(() => {
        setAddPressed(false)
        setRationAddPlaying(false)
        openItemAt(active, 'day-picker')
      }, authRationAddOpenAtMs()),
    ]
    return () => {
      for (const id of timers) authDemoClear(id)
    }
  }, [active, frameOpen, introDone, openId, openItemAt, rationAddPlaying, reduceMotion])

  React.useEffect(() => {
    if (
      surface !== 'signup-user' ||
      !signupRationVisible ||
      openId ||
      frameOpen ||
      signupPlanHeld ||
      rationSelectAdded
    ) {
      return
    }
    if (reduceMotion) {
      setRationSelectAdded(true)
      return
    }
    const timers = [
      authDemoTimeout(() => setRationSelectPressed(true), authRationSelectPressAtMs()),
      authDemoTimeout(() => {
        setRationSelectPressed(false)
        setCaptionId('rationDay')
        openItemAt(active, 'plan-start')
      }, authRationSelectOpenAtMs()),
    ]
    return () => {
      for (const id of timers) authDemoClear(id)
    }
  }, [
    active,
    frameOpen,
    openId,
    openItemAt,
    rationSelectAdded,
    reduceMotion,
    signupPlanHeld,
    signupRationVisible,
    surface,
  ])

  React.useEffect(() => {
    if (
      surface !== 'signup-user' ||
      !rationSelectAdded ||
      !signupRationVisible ||
      openId ||
      frameOpen ||
      signupPlanHeld
    ) {
      return
    }
    if (reduceMotion) {
      setSignupRationVisible(false)
      setSignupPlanHeld(true)
      setActive(AUTH_DEMO_SHOP_INDEX)
      return
    }
    const id = authDemoTimeout(() => {
      setSignupRationVisible(false)
      setSignupPlanHeld(true)
      setActive(AUTH_DEMO_SHOP_INDEX)
    }, AUTH_RATION_SELECT_DEMO.addedHoldMs)
    return () => authDemoClear(id)
  }, [
    frameOpen,
    openId,
    rationSelectAdded,
    reduceMotion,
    signupPlanHeld,
    signupRationVisible,
    surface,
  ])

  React.useEffect(() => {
    if (surface !== 'signup-user' || !signupPlanHeld || !rationSelectAdded) return
    if (planMeals.length === 0 || active === AUTH_DEMO_SHOP_INDEX) return
    if (openId || frameOpen) return
    if (reduceMotion) {
      setActive(AUTH_DEMO_SHOP_INDEX)
      return
    }
    const id = authDemoTimeout(
      () => setActive(AUTH_DEMO_SHOP_INDEX),
      AUTH_RATION_SELECT_DEMO.slideLeadMs,
    )
    return () => authDemoClear(id)
  }, [
    active,
    frameOpen,
    openId,
    planMeals.length,
    rationSelectAdded,
    reduceMotion,
    signupPlanHeld,
    surface,
  ])

  React.useEffect(() => {
    if (!planDayPlaying || openId || frameOpen || planActDone) return
    if (reduceMotion) {
      setActive(AUTH_DEMO_FIRST_PLAN_INDEX)
      return
    }
    const id = authDemoTimeout(
      () => setActive(AUTH_DEMO_FIRST_PLAN_INDEX),
      AUTH_RATION_ADD_DEMO.afterCloseMs,
    )
    return () => authDemoClear(id)
  }, [active, frameOpen, items, openId, planActDone, planDayPlaying, reduceMotion])

  React.useEffect(() => {
    if (!planDayPlaying || openId || planActDone) return
    if (active !== AUTH_DEMO_FIRST_PLAN_INDEX) return
    if (reduceMotion) {
      setActive(AUTH_DEMO_SHOP_INDEX)
      return
    }
    const id = authDemoTimeout(
      () => setActive(AUTH_DEMO_SHOP_INDEX),
      AUTH_PLAN_DAY_DEMO.firstHoldMs,
    )
    return () => authDemoClear(id)
  }, [active, openId, planActDone, planDayPlaying, reduceMotion])

  React.useEffect(() => {
    if (!planDayPlaying || planActDone || shoppingDone || openId) return
    if (active !== AUTH_DEMO_SHOP_INDEX) return
    if (reduceMotion) {
      openItemAt(active, 'shopping')
      return
    }
    const timers = [
      authDemoTimeout(() => setBasketPressed(true), AUTH_SHOP_DEMO.settleMs),
      authDemoTimeout(() => {
        setBasketPressed(false)
        openItemAt(active, 'shopping')
      }, AUTH_SHOP_DEMO.settleMs + AUTH_SHOP_DEMO.basketPressMs),
    ]
    return () => {
      for (const id of timers) authDemoClear(id)
    }
  }, [active, openId, openItemAt, planActDone, planDayPlaying, reduceMotion, shoppingDone])

  React.useEffect(() => {
    if (!shoppingDone || openId || frameOpen || planActDone) return
    if (active !== AUTH_DEMO_SHOP_INDEX) return
    if (reduceMotion) {
      setPlanActDone(true)
      openItemAt(active, 'plan-meal')
      return
    }
    const pressAt = AUTH_SHOP_DEMO.afterCloseMs
    const timers = [
      authDemoTimeout(() => setPressed(true), pressAt),
      authDemoTimeout(() => {
        setPlanActDone(true)
        openItemAt(active, 'plan-meal')
      }, pressAt + AUTH_MEAL_INTRO.pressMs),
    ]
    return () => {
      for (const id of timers) authDemoClear(id)
    }
  }, [active, frameOpen, openId, openItemAt, planActDone, reduceMotion, shoppingDone])

  React.useEffect(() => {
    if (
      !introDone ||
      openId ||
      reduceMotion ||
      rationAddPlaying ||
      planDayPlaying ||
      items.length < 2
    ) {
      return
    }
    if (justClosedRef.current) {
      justClosedRef.current = false
      return
    }
    if (authDemoCreatesAtIndex(active) && !draftActDone) {
      const pressAt = AUTH_MEAL_INTRO.clickDelayMs
      const timers = [
        authDemoTimeout(() => setPressed(true), pressAt),
        authDemoTimeout(() => openItemAt(active), pressAt + AUTH_MEAL_INTRO.pressMs),
      ]
      return () => {
        for (const id of timers) authDemoClear(id)
      }
    }
    if (!authDemoOpensRationAtIndex(active) || planMeals.length > 0) return
    if (surface === 'signup-mentor') return
    if (surface === 'login' && !authDemoIsSeeking()) return

    setRationFilterPlaying(true)
    setRationShown(gainRation)
    setRationGoal(AUTH_RATION_FILTER_FROM_GOAL)
    setRationMenuOpen(false)
    setRationTriggerPressed(false)
    setRationPressedGoal(null)

    const timers = [
      authDemoTimeout(() => setRationTriggerPressed(true), authRationFilterTriggerPressAtMs()),
      authDemoTimeout(() => {
        setRationTriggerPressed(false)
        setRationMenuOpen(true)
      }, authRationFilterMenuOpenAtMs()),
      authDemoTimeout(
        () => setRationPressedGoal(AUTH_RATION_FILTER_TO_GOAL),
        authRationFilterItemPressAtMs(),
      ),
      authDemoTimeout(() => {
        setRationPressedGoal(null)
        setRationGoal(AUTH_RATION_FILTER_TO_GOAL)
      }, authRationFilterCommitAtMs()),
      authDemoTimeout(() => setRationMenuOpen(false), authRationFilterCloseAtMs()),
      authDemoTimeout(() => setRationShown(lossRation), authRationFilterSelectAtMs()),
      authDemoTimeout(() => setPressed(true), authRationFilterReadyAtMs()),
      authDemoTimeout(() => {
        setRationFilterPlaying(false)
        openItemAt(active, 'ration')
      }, authRationFilterReadyAtMs() + AUTH_MEAL_INTRO.pressMs),
    ]
    return () => {
      for (const id of timers) authDemoClear(id)
    }
  }, [
    active,
    gainRation,
    introDone,
    items.length,
    lossRation,
    openId,
    openItemAt,
    planDayPlaying,
    planMeals.length,
    rationAddPlaying,
    reduceMotion,
    draftActDone,
    savePlaying,
    surface,
  ])

  React.useEffect(() => {
    if (!planDayPlaying || openId || frameOpen || !planActDone) return
    if (completedIds.size === 0 || balanceTweenedRef.current) return

    const from = AUTH_DEMO_PLAN_DAILY_KCAL - authDemoPlanKcalTotal(planMeals)
    if (reduceMotion || authDemoIsSeeking()) {
      balanceTweenedRef.current = true
      setBalanceDelta(0)
      return
    }

    let raf = 0
    let elapsed = 0
    let last = 0
    const startId = authDemoTimeout(() => {
      const step = (now: number) => {
        if (last === 0) last = now
        const dt = authDemoIsPaused() ? 0 : now - last
        last = now
        elapsed += dt
        const t = Math.min(1, elapsed / AUTH_PLAN_BALANCE_DEMO.tweenMs)
        const eased = 1 - (1 - t) ** 2
        setBalanceDelta(Math.round(from * (1 - eased)))
        if (t < 1) {
          raf = window.requestAnimationFrame(step)
          return
        }
        balanceTweenedRef.current = true
        setBalanceDelta(0)
      }
      raf = window.requestAnimationFrame(step)
    }, AUTH_PLAN_BALANCE_DEMO.afterCloseMs)

    return () => {
      authDemoClear(startId)
      window.cancelAnimationFrame(raf)
    }
  }, [completedIds, frameOpen, openId, planActDone, planDayPlaying, planMeals, reduceMotion])

  React.useEffect(() => {
    if (!mentorCreatePending || openId || frameOpen) return
    if (surface !== 'signup-mentor' && !authDemoIsSeeking()) return
    const id = authDemoTimeout(() => {
      setMentorCreatePending(false)
      setMentorCreateActive(true)
      setMentorCreatedVisible(false)
      setMentorCreatePressed(false)
      openedElapsedRef.current = authDemoElapsedMs()
      setSheetMs(0)
      setCaptionId('mentorCreate')
    }, AUTH_PLAN_BALANCE_DEMO.afterCloseMs)
    return () => authDemoClear(id)
  }, [frameOpen, mentorCreatePending, openId, surface])

  React.useEffect(() => {
    if (!mentorCreateActive || openId || frameOpen) return
    const origin = Math.max(
      0,
      authDemoIsSeeking() ? authDemoElapsedMs() - openedElapsedRef.current : 0,
    )
    const pressAt = authMentorCreatePressAtMs()
    const openAt = authMentorCreateOpenAtMs()
    const savedAt = authMentorCreateSavedAtMs()

    if (origin >= savedAt) {
      setMentorCreatedVisible(true)
      setMentorCreatePressed(false)
      setCaptionId('mentorSaved')
      return
    }
    if (origin >= openAt) {
      openItemAt(active, 'mentor-create')
      return
    }

    setMentorCreatePressed(origin >= pressAt)
    setCaptionId('mentorCreate')

    const timers: number[] = []
    if (pressAt > origin) {
      timers.push(authDemoTimeout(() => setMentorCreatePressed(true), pressAt - origin))
    }
    if (openAt > origin) {
      timers.push(
        authDemoTimeout(() => {
          setMentorCreatePressed(false)
          openItemAt(active, 'mentor-create')
        }, openAt - origin),
      )
    }
    return () => {
      for (const id of timers) authDemoClear(id)
    }
  }, [active, frameOpen, mentorCreateActive, openId, openItemAt])

  React.useEffect(() => {
    if (surface !== 'signup-mentor' || !mentorCreatedVisible || openId || frameOpen || mentorSelectAdded) {
      return
    }
    if (reduceMotion) {
      setMentorSelectAdded(true)
      finishDemo()
      return
    }
    const timers = [
      authDemoTimeout(() => setMentorSelectPressed(true), MENTOR_SELECT_SETTLE_MS),
      authDemoTimeout(() => {
        setMentorSelectPressed(false)
        setMentorSelectAdded(true)
        finishDemo()
      }, MENTOR_SELECT_SETTLE_MS + MENTOR_SELECT_PRESS_MS),
    ]
    return () => {
      for (const id of timers) authDemoClear(id)
    }
  }, [finishDemo, frameOpen, mentorCreatedVisible, mentorSelectAdded, openId, reduceMotion, surface])

  React.useEffect(() => {
    const next = items[(active + 1) % items.length]
    if (!next) return
    if (next.kind === 'meal') {
      prefetchMealPhoto(next.meal.image, 'card')
      return
    }
    prefetchMealPhoto(next.ration.image, 'card')
    for (const src of rationMealImages(next.ration)) prefetchMealPhoto(src, 'card')
  }, [active, items])

  React.useEffect(() => {
    for (const item of items) {
      if (item.kind === 'meal') {
        prefetchMealPhoto(item.meal.image, 'card')
        for (const photo of authDemoAttachItemsForMeal(item.meal)) {
          prefetchMealPhoto(photo.src, 'full')
        }
        continue
      }
      prefetchMealPhoto(item.ration.image, 'card')
      for (const src of rationMealImages(item.ration)) prefetchMealPhoto(src, 'full')
    }
    prefetchMealPhoto(lossRation.image, 'card')
    for (const src of rationMealImages(lossRation)) prefetchMealPhoto(src, 'full')
  }, [items, lossRation])

  React.useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) authDemoClear(closeTimerRef.current)
    }
  }, [])

  const openItem = items.find((item) => item.id === openId) ?? null
  const leftInsetRem = authDemoLeftCardInsetRem(frameOpen)
  const pitchCaptionId = authDemoPitchCaptionId(captionId)
  const showRationBar =
    items[active]?.kind === 'ration' &&
    !openId &&
    items[active]?.id === AUTH_DEMO_RATION_SLOT_ID &&
    !mentorCreateActive &&
    !mentorCreatePending &&
    !mentorCreatedVisible
  const frontItem = items[active]
  const signupMealFront =
    surface === 'signup-user' &&
    signupPlanHeld &&
    !signupRationVisible &&
    active === AUTH_DEMO_SHOP_INDEX &&
    frontItem?.kind === 'meal' &&
    !openId &&
    !frameOpen
  const barMeals =
    planMeals.length > 0 ? planMeals : signupMealFront ? authDemoPlanMeals(rationShown) : planMeals
  const showDayBar =
    !openId &&
    !frameOpen &&
    !mentorCreateActive &&
    !mentorCreatedVisible &&
    (signupMealFront ||
      (frontItem?.kind === 'meal' &&
        isRationImportedMeal(frontItem.meal) &&
        planMeals.length > 0 &&
        (surface !== 'signup-user' || active !== AUTH_DEMO_FIRST_PLAN_INDEX) &&
        (signupPlanHeld || !signupRationVisible)))
  const showMentorCreateBar = mentorCreateActive && !openId && !mentorCreatedVisible
  const showShareAudience = !openId && shareAudienceVisible
  const planDayHeading = authDemoPlanDayHeading(barMeals)
  const signupMealKcal =
    signupMealFront && frontItem?.kind === 'meal' ? frontItem.meal.kcal : null
  const planKcalDelta = AUTH_DEMO_PLAN_DAILY_KCAL - authDemoPlanKcalTotal(barMeals)
  const displayedBalanceDelta = signupMealFront
    ? signupNormMet
      ? 0
      : (signupMealKcal ?? 0)
    : (balanceDelta ?? planKcalDelta)
  const planBalanceLabel = authDemoPlanBalanceFromDelta(displayedBalanceDelta)

  React.useEffect(() => {
    if (!signupMealFront || signupNormMet) return
    if (reduceMotion) {
      setSignupNormMet(true)
      return
    }
    const id = authDemoTimeout(() => setSignupNormMet(true), 2800)
    return () => authDemoClear(id)
  }, [reduceMotion, signupMealFront, signupNormMet])

  const formedMealIndex = items.findIndex((entry) => entry.id === authDemoFormedMeal().id)

  if (items.length === 0) return null

  return (
    <div
      className="relative flex h-full min-h-[28rem] w-full max-w-[54rem] flex-col"
      data-slot="auth-meal-carousel"
    >
      <div
        className={cn(
          'pointer-events-none absolute z-[6] max-w-[26rem] pr-4',
          !reduceMotion && 'transition-[left,top,opacity] ease-[cubic-bezier(0.22,1,0.36,1)]',
        )}
        style={{
          left: `calc(50% - ${leftInsetRem}rem)`,
          top: authDemoCaptionTop(frameOpen && openSheet !== 'plan-start'),
          transitionDuration: reduceMotion
            ? '0ms'
            : `${frameOpen ? AUTH_MEAL_EXPAND_MS : AUTH_MEAL_SLIDE_MS}ms`,
        }}
      >
        <AuthDemoCaption captionId={pitchCaptionId} reduceMotion={reduceMotion} />
      </div>
      {compactFrame ? null : <div className="relative z-[6] h-[5.5rem] shrink-0" aria-hidden />}
      <div
        aria-hidden
        className="relative flex min-h-0 flex-1 items-center justify-center"
      >
      {showRationBar ? (
        <div
          className={cn(
            'pointer-events-none absolute z-[6]',
            !reduceMotion && 'transition-[opacity,transform] ease-[cubic-bezier(0.22,1,0.36,1)]',
          )}
          style={{
            left: `calc(50% - ${AUTH_MEAL_CARD_WIDTH_REM / 2}rem)`,
            top: 'calc(50% - 13.6rem)',
            transitionDuration: reduceMotion ? '0ms' : '280ms',
          }}
        >
          <AuthRationGoalBar
            goal={rationGoal}
            open={rationMenuOpen}
            pressedGoal={rationPressedGoal}
            triggerPressed={rationTriggerPressed}
          />
        </div>
      ) : null}
      {showDayBar ? (
        <div
          className={cn(
            'pointer-events-none absolute z-[6]',
            !reduceMotion && 'transition-[opacity,transform] ease-[cubic-bezier(0.22,1,0.36,1)]',
          )}
          style={{
            left: `calc(50% - ${AUTH_MEAL_CARD_WIDTH_REM / 2}rem)`,
            top: 'calc(50% - 13.6rem)',
            transitionDuration: reduceMotion ? '0ms' : '280ms',
          }}
        >
          <AuthDiaryDayBar
            balanceDelta={displayedBalanceDelta}
            balanceLabel={planBalanceLabel}
            basketPressed={basketPressed}
            heading={planDayHeading}
            shoppingComplete={shoppingDone}
          />
        </div>
      ) : null}
      {showMentorCreateBar ? (
        <div
          className="auth-mentor-create-in pointer-events-none absolute z-[6]"
          style={{
            left: `calc(50% - ${AUTH_MEAL_CARD_WIDTH_REM / 2}rem)`,
            top: 'calc(50% - 14.6rem)',
            width: `${AUTH_MEAL_CARD_WIDTH_REM}rem`,
          }}
        >
          <div className="flex w-full justify-end">
            <button
              aria-label="Создать"
              className={MENTOR_CREATE_CLASS}
              data-demo-pressed={mentorCreatePressed ? '' : undefined}
              style={
                plain
                  ? {
                      boxShadow:
                        'inset 0 1px 0 color-mix(in srgb, white 70%, transparent), 0 6px 16px rgba(0, 0, 0, 0.14)',
                    }
                  : undefined
              }
              type="button"
            >
              <PlusIcon aria-hidden className="size-4" />
              Создать
            </button>
          </div>
        </div>
      ) : null}
      {showShareAudience ? (
        <AuthShareAudienceHint
          outerRem={plain ? plainCarouselOuterRem(sideSpreadRem) : undefined}
          pulse={shareAudiencePulse}
          reduceMotion={reduceMotion}
        />
      ) : null}
      {items.map((item, index) => {
        const offset = signedCarouselOffset(index, active, items.length)
        const isFront = offset === 0
        const visible = Math.abs(offset) <= 1
        const side = offset === 0 ? 'front' : offset < 0 ? 'left' : 'right'
        const dimSide = visible && !isFront
        const showDetail = isFront && openItem?.id === item.id
        const expanded = showDetail && frameOpen
        const collapsing = showDetail && !frameOpen
        /** Keep the thumbnail painted under the shrinking sheet so the footer
         *  is already there instead of fading in after a blank gap. */
        const morphCollapse = collapsing
        const hideCard = expanded
        const frameMs = openId ? AUTH_MEAL_EXPAND_MS : AUTH_MEAL_SLIDE_MS
        const showFeedChrome =
          item.kind === 'meal' &&
          authDemoMealShowsFeedChrome(item.id, sharedMealId, feedView)
        const detailVisible = (detailEntered || collapsing) && !collapseHandOff
        const detailShellClass = cn(
          'absolute inset-0 flex min-h-0 flex-col overflow-hidden rounded-[22px]',
          morphCollapse
            ? 'bg-transparent shadow-none'
            : 'bg-[var(--nora-modal)] shadow-[var(--nora-shadow-modal)]',
          !reduceMotion && 'transition-[opacity,background-color,box-shadow] ease-[cubic-bezier(0.22,1,0.36,1)]',
        )
        const detailShellStyle = {
          opacity: detailVisible ? 1 : 0,
          transitionDuration: reduceMotion ? '0ms' : `${AUTH_MEAL_COVER_FADE_MS}ms`,
        } as const

        return (
          <div
            className={cn(
              'absolute top-1/2 left-1/2 origin-center',
              !reduceMotion &&
                'transition-[transform,opacity,filter] ease-[cubic-bezier(0.22,1,0.36,1)]',
            )}
            data-carousel-side={side}
            key={
              surface === 'signup-user' && index === AUTH_DEMO_FIRST_PLAN_INDEX
                ? 'signup-ration-card'
                : item.id
            }
            style={{
              filter: dimSide
                ? 'blur(3px) saturate(0.88) brightness(0.97)'
                : expanded
                  ? 'blur(0px) saturate(1) brightness(1) drop-shadow(0 23px 50px rgba(0,0,0,0.16)) drop-shadow(0 2px 9px rgba(0,0,0,0.07))'
                  : isFront
                    ? 'blur(0px) saturate(1) brightness(1) drop-shadow(0 19px 38px rgba(0,0,0,0.15)) drop-shadow(0 2px 8px rgba(0,0,0,0.07))'
                    : 'blur(0px) saturate(1) brightness(1)',
              opacity: visible ? 1 : 0,
              transform: carouselTransform(offset, expanded, plain ? sideSpreadRem : null),
              transitionDuration: reduceMotion ? '0ms' : `${frameMs}ms`,
              zIndex: showDetail ? 5 : isFront ? 3 : visible ? 2 : 1,
            }}
          >
            <div
              className={cn(
                'relative isolate overflow-hidden rounded-[var(--meal-card-radius)] bg-[var(--nora-panel)]',
                expanded && 'rounded-[22px]',
                expanded
                  ? openSheet === 'day-picker'
                    ? fittedPhone
                      ? OPEN_PLAN_PICKER_FRAME_FIT_CLASS
                      : compactFrame
                        ? OPEN_PLAN_PICKER_FRAME_COMPACT_CLASS
                        : OPEN_PLAN_PICKER_FRAME_CLASS
                    : openSheet === 'plan-start'
                      ? fittedPhone
                        ? OPEN_PLAN_START_FRAME_FIT_CLASS
                        : compactFrame
                          ? OPEN_PLAN_START_FRAME_COMPACT_CLASS
                          : OPEN_PLAN_START_FRAME_CLASS
                      : openSheet === 'shopping'
                      ? fittedPhone
                        ? OPEN_DAY_PICKER_FRAME_FIT_CLASS
                        : compactFrame
                          ? OPEN_DAY_PICKER_FRAME_COMPACT_CLASS
                          : OPEN_DAY_PICKER_FRAME_CLASS
                      : openSheet === 'mentor-create'
                        ? fittedPhone
                          ? OPEN_FRAME_FIT_CLASS
                          : compactFrame
                            ? OPEN_MENTOR_FRAME_COMPACT_CLASS
                            : OPEN_MENTOR_FRAME_CLASS
                        : fittedPhone
                          ? OPEN_FRAME_FIT_CLASS
                          : compactFrame
                            ? OPEN_FRAME_COMPACT_CLASS
                            : OPEN_FRAME_CLASS
                  : CARD_FRAME_CLASS,
                dimSide && 'pointer-events-none',
                'after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-[color-mix(in_srgb,var(--nora-canvas)_16%,transparent)] after:transition-opacity after:duration-700 after:ease-[cubic-bezier(0.22,1,0.36,1)]',
                dimSide ? 'after:opacity-100' : 'after:opacity-0',
              )}
              style={
                reduceMotion
                  ? undefined
                  : {
                      transitionDuration: `${openId || pressed ? AUTH_MEAL_EXPAND_MS : AUTH_MEAL_INTRO.pressMs}ms`,
                      transitionProperty: 'width, height, transform, border-radius',
                      transitionTimingFunction: pressed && !expanded ? PRESS_EASE : MOTION_EASE,
                      transform: isFront && pressed && !expanded ? 'scale(0.96)' : 'scale(1)',
                    }
              }
            >
              <div
                className={cn(
                  // Fill the shrinking frame so the painted sheet and the card
                  // share one box instead of stacking two sizes.
                  expanded || collapsing
                    ? 'absolute inset-0'
                    : 'absolute top-1/2 left-1/2 h-[365px] w-[16.75rem] -translate-x-1/2 -translate-y-1/2',
                  (expanded || collapsing) && 'pointer-events-none',
                  !reduceMotion && 'transition-opacity ease-[cubic-bezier(0.22,1,0.36,1)]',
                )}
                style={{
                  opacity: hideCard ? 0 : 1,
                  // Appear immediately on close so the footer is already in the
                  // shrinking box; fade out only when the sheet opens over it.
                  transitionDuration: reduceMotion
                    ? '0ms'
                    : hideCard
                      ? `${AUTH_MEAL_COVER_FADE_MS}ms`
                      : '0ms',
                }}
              >
                {surface === 'signup-mentor' && item.kind === 'ration' ? (
                  <AuthFeedRationCard
                    actionLabel="Отправить"
                    addedLabel="Отправлен"
                    ration={mentorDemoWeek(
                      item.id === 'mentor-front' && mentorCreatedVisible
                        ? createdMentorRation
                        : item.ration,
                    )}
                    selectAdded={item.id === 'mentor-front' && mentorSelectAdded}
                    selectPressed={item.id === 'mentor-front' && mentorSelectPressed && isFront}
                  />
                ) : surface === 'signup-user' &&
                  (signupRationVisible || signupPlanHeld) &&
                  index === AUTH_DEMO_FIRST_PLAN_INDEX ? (
                  <AuthFeedRationCard
                    activeRange={authDemoPlanRange().label}
                    ration={rationShown}
                    selectAdded={rationSelectAdded}
                    selectPressed={rationSelectPressed && isFront}
                  />
                ) : item.kind === 'meal' ? (
                  <MealCard
                    addPressed={addPressed && isFront && surface === 'signup-user'}
                    completedIds={completedIds}
                    doneBadgeEnter={
                      (surface === 'login' && mealDoneVisible) ||
                      (surface === 'signup-user' &&
                        signupPlanHeld &&
                        isFront &&
                        index === AUTH_DEMO_SHOP_INDEX &&
                        signupNormMet)
                    }
                    showPlanState={
                      surface === 'login'
                        ? mealDoneVisible && formedMealIndex >= 0 && index >= formedMealIndex
                        : surface === 'signup-user' &&
                            signupPlanHeld &&
                            isFront &&
                            index === AUTH_DEMO_SHOP_INDEX
                          ? signupNormMet
                          : !(signupPlanHeld && isFront && isRationImportedMeal(item.meal))
                    }
                    grayscale={
                      (surface === 'signup-user' &&
                        signupPlanHeld &&
                        isFront &&
                        index === AUTH_DEMO_SHOP_INDEX &&
                        !signupNormMet) ||
                      (item.id === authDemoFormedMeal().id && !draftActDone)
                    }
                    hideFooterShare={item.id !== authDemoShareMeal().id}
                    revealAuthor={showFeedChrome}
                    likePressed={likePressed && showFeedChrome}
                    meal={{
                      ...item.meal,
                      authorName: showFeedChrome
                        ? AUTH_DEMO_SHARE_AUTHOR
                        : item.meal.authorName,
                      likeCount: showFeedChrome ? likeCount : item.meal.likeCount,
                      liked: showFeedChrome ? liked : item.meal.liked,
                      shared: showFeedChrome || item.meal.shared,
                    }}
                    menuOpen={menuOpen && item.id === items[active]?.id}
                    menuPressed={menuPressed && item.id === items[active]?.id}
                    menuSide="bottom"
                    onDelete={noop}
                    onOpen={noop}
                    onAddToPlan={surface === 'signup-user' && isFront ? noop : undefined}
                    onShare={noop}
                    onToggleLike={noop}
                    onToggleSave={() => {
                      setSavedIds((current) => {
                        const next = new Set(current)
                        if (next.has(item.meal.id)) next.delete(item.meal.id)
                        else {
                          next.add(item.meal.id)
                          if (!authDemoIsSeeking()) {
                            setToastLeaving(false)
                            setSaveToast(true)
                          }
                        }
                        return next
                      })
                    }}
                    savePressed={savePressed && item.id === items[active]?.id}
                    saved={savedIds.has(item.meal.id)}
                    sharePressed={sharePressed && item.id === items[active]?.id}
                    variant={showFeedChrome ? 'feed' : 'diary'}
                  />
                ) : (
                  <RationCard
                    addPressed={addPressed}
                    adding={false}
                    hideAdd={rationGoal !== AUTH_RATION_FILTER_TO_GOAL || rationFilterPlaying}
                    key={rationShown.id}
                    onAdd={noop}
                    onOpen={noop}
                    onToggleSave={noop}
                    ration={rationShown}
                    saved={false}
                  />
                )}
              </div>

              {showDetail && draftOpenedAt && openSheet === 'draft' && openItem?.kind === 'meal' ? (
                <Dialog
                  disablePointerDismissal
                  modal={false}
                  onOpenChange={(open) => {
                    if (!open) closeOpenCard()
                  }}
                  open
                >
                  <div className={detailShellClass} style={detailShellStyle}>
                    <MealAddDraftIdleSheet
                      collapsing={collapsing}
                      key={draftOpenedAt}
                      meal={openItem.meal}
                      onCaptionId={setCaptionId}
                      onComplete={closeOpenCard}
                      openedAt={draftOpenedAt}
                      play={detailEntered || seeking}
                      startMs={authDemoSheetPlayStartMs(sheetMs, seeking)}
                    />
                  </div>
                </Dialog>
              ) : null}

              {showDetail && draftOpenedAt && openSheet === 'plan-meal' && openItem?.kind === 'meal' ? (
                <Dialog
                  disablePointerDismissal
                  modal={false}
                  onOpenChange={(open) => {
                    if (!open) closeOpenCard()
                  }}
                  open
                >
                  <div className={detailShellClass} style={detailShellStyle}>
                    <AuthPlanMealIdleSheet
                      collapsing={collapsing}
                      key={draftOpenedAt}
                      meal={openItem.meal}
                      onCaptionId={setCaptionId}
                      onComplete={closeOpenCard}
                      onMarkDone={(mealId) => {
                        setCompletedIds((current) => {
                          const next = new Set(current)
                          next.add(mealId)
                          return next
                        })
                        setCaptionId('planDone')
                      }}
                      play={detailEntered || seeking}
                    />
                  </div>
                </Dialog>
              ) : null}

              {showDetail && draftOpenedAt && openSheet === 'ration' && openItem?.kind === 'ration' ? (
                <Dialog
                  disablePointerDismissal
                  modal={false}
                  onOpenChange={(open) => {
                    if (!open) closeOpenCard()
                  }}
                  open
                >
                  <div className={detailShellClass} style={detailShellStyle}>
                    <AuthRationIdleSheet
                      collapsing={collapsing}
                      key={draftOpenedAt}
                      onCaptionId={setCaptionId}
                      onComplete={closeOpenCard}
                      play={detailEntered || seeking}
                      ration={rationShown}
                      startMs={authDemoSheetPlayStartMs(sheetMs, seeking)}
                    />
                  </div>
                </Dialog>
              ) : null}

              {showDetail && draftOpenedAt && openSheet === 'plan-start' ? (
                <Dialog
                  disablePointerDismissal
                  modal={false}
                  onOpenChange={(open) => {
                    if (!open) closeOpenCard()
                  }}
                  open
                >
                  <div className={detailShellClass} style={detailShellStyle}>
                    <AuthPlanStartSheet
                      collapsing={collapsing}
                      key={draftOpenedAt}
                      onComplete={closeOpenCard}
                      play={detailEntered || seeking}
                      startMs={authDemoSheetPlayStartMs(sheetMs, seeking)}
                    />
                  </div>
                </Dialog>
              ) : null}

              {showDetail && draftOpenedAt && openSheet === 'day-picker' ? (
                <Dialog
                  disablePointerDismissal
                  modal={false}
                  onOpenChange={(open) => {
                    if (!open) closeOpenCard()
                  }}
                  open
                >
                  <div className={detailShellClass} style={detailShellStyle}>
                    <AuthRationDayPickerSheet
                      collapsing={collapsing}
                      key={draftOpenedAt}
                      onCaptionId={setCaptionId}
                      onComplete={() => {
                        setSignupRationVisible(true)
                        closeOpenCard()
                      }}
                      play={detailEntered || seeking}
                      ration={rationShown}
                      startMs={authDemoSheetPlayStartMs(sheetMs, seeking)}
                    />
                  </div>
                </Dialog>
              ) : null}

              {showDetail && draftOpenedAt && openSheet === 'shopping' && openItem?.kind === 'meal' ? (
                <Dialog
                  disablePointerDismissal
                  modal={false}
                  onOpenChange={(open) => {
                    if (!open) closeOpenCard()
                  }}
                  open
                >
                  <div className={detailShellClass} style={detailShellStyle}>
                    <AuthDayShoppingSheet
                      bought={boughtKeys}
                      collapsing={collapsing}
                      heading={planDayHeading}
                      meals={planMeals}
                      onBoughtChange={setBoughtKeys}
                      onCaptionId={setCaptionId}
                      onComplete={closeOpenCard}
                      play={detailEntered || seeking}
                    />
                  </div>
                </Dialog>
              ) : null}

              {showDetail && draftOpenedAt && openSheet === 'mentor-create' ? (
                <Dialog
                  disablePointerDismissal
                  modal={false}
                  onOpenChange={(open) => {
                    if (!open) closeOpenCard()
                  }}
                  open
                >
                  <div className={detailShellClass} style={detailShellStyle}>
                    <AuthMentorRationCreateSheet
                      collapsing={collapsing}
                      key={draftOpenedAt}
                      onCaptionId={setCaptionId}
                      onComplete={closeOpenCard}
                      onRevealCreated={() => setMentorCreatedVisible(true)}
                      play={detailEntered || seeking}
                      startMs={Math.max(
                        authDemoSheetPlayStartMs(sheetMs, seeking),
                        authMentorCreateOpenAtMs(),
                      )}
                    />
                  </div>
                </Dialog>
              ) : null}
            </div>
          </div>
        )
      })}
      {saveToast ? (
        <div
          className="pointer-events-none absolute z-[8]"
          style={
            plain
              ? {
                  right: `calc(50% - ${plainCarouselOuterRem(sideSpreadRem)}rem)`,
                  top: 'calc(50% + 12.4rem)',
                }
              : {
                  left: 'calc(50% + 9.5rem)',
                  top: 'calc(50% + 12.4rem)',
                }
          }
        >
          <AuthDemoSaveToast leaving={toastLeaving} />
        </div>
      ) : null}
      </div>
    </div>
  )
}

function AuthDemoSaveToast({ leaving }: { leaving?: boolean }) {
  return (
    <div
      className="isolate flex h-10 w-max items-center gap-2 whitespace-nowrap rounded-full bg-[var(--nora-panel)] px-3 font-[family-name:var(--nora-font)] text-[12px] font-medium text-[var(--nora-text)] shadow-[0_8px_18px_rgba(0,0,0,0.1)]"
      data-auth-demo-save-toast=""
      role="status"
      style={{
        animation: leaving
          ? 'auth-demo-toast-out 520ms cubic-bezier(0.22,1,0.36,1) both'
          : 'auth-demo-toast-in 480ms cubic-bezier(0.22,1,0.36,1) both',
      }}
    >
      <span className="flex size-4 shrink-0 items-center justify-center text-[var(--nora-text-secondary)]" data-icon="">
        <CircleCheckIcon className="size-4" />
      </span>
      <span className="cn-toast-title">Добавлено в избранное</span>
    </div>
  )
}

function AuthShareAudienceHint({
  pulse,
  reduceMotion,
  outerRem,
}: {
  pulse: boolean
  reduceMotion: boolean
  /** Landing frame: keep the capsule inside the visible side-card edge. */
  outerRem?: number
}) {
  const edgeRem = outerRem ?? authDemoLeftCardInsetRem(false)
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-[8]"
      data-slot="auth-share-audience"
      style={{
        // Right edge flush with the blurred side card behind the front card.
        right: `calc(50% - ${edgeRem}rem)`,
        top: 'calc(50% + 12.4rem)',
        animation: reduceMotion
          ? undefined
          : `auth-demo-share-audience-in ${AUTH_MEAL_SHARE_DEMO.audienceInMs}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
      }}
    >
      <div
        className="isolate flex h-10 w-max items-center rounded-full bg-[var(--nora-panel)] px-2.5 shadow-[0_8px_18px_rgba(0,0,0,0.1)]"
        style={
          pulse && !reduceMotion
            ? {
                animation: `auth-demo-share-audience-pulse ${AUTH_MEAL_SHARE_DEMO.audiencePulseMs}ms ease-out`,
              }
            : undefined
        }
      >
        <span className="inline-flex items-center">
          {AUTH_DEMO_SHARE_AUDIENCE.map((person, index) => (
            <span
              className={cn(
                'relative inline-flex size-7 shrink-0 overflow-hidden rounded-full bg-[var(--nora-inset)]',
                index > 0 && '-ml-2',
              )}
              key={person.src}
              style={{
                animation: reduceMotion
                  ? undefined
                  : `auth-demo-share-avatar-in ${AUTH_MEAL_SHARE_DEMO.audienceAvatarMs}ms cubic-bezier(0.22, 1, 0.36, 1) ${AUTH_MEAL_SHARE_DEMO.audienceAvatarDelayMs + index * AUTH_MEAL_SHARE_DEMO.audienceAvatarStaggerMs}ms both`,
                zIndex: AUTH_DEMO_SHARE_AUDIENCE.length - index,
              }}
            >
              <img
                alt=""
                className="size-full object-cover"
                decoding="async"
                draggable={false}
                src={person.src}
              />
            </span>
          ))}
        </span>
      </div>
    </div>
  )
}

function AuthDemoCaption({
  captionId,
  reduceMotion,
}: {
  captionId: AuthDemoCaptionId
  reduceMotion: boolean
}) {
  const hostRef = React.useRef<HTMLDivElement>(null)
  const seeking = useAuthDemoSeeking()
  const remountHold = useAuthDemoRemountHold()
  const skipFade = reduceMotion || seeking || remountHold
  const skipFadeRef = React.useRef(skipFade)
  if (skipFade) skipFadeRef.current = true
  const [shownId, setShownId] = React.useState(captionId)
  const [visible, setVisible] = React.useState(true)
  const [revealReady, setRevealReady] = React.useState(true)
  const shown = AUTH_DEMO_CAPTIONS[shownId]
  const Icon = AUTH_DEMO_CAPTION_ICONS[shownId]
  const shownOnScreen = visible && revealReady

  React.useEffect(() => {
    if (reduceMotion) {
      setRevealReady(true)
      return
    }
    const reveal = hostRef.current?.closest('[data-auth-demo-diary-reveal]')
    if (!reveal) {
      setRevealReady(true)
      return
    }
    setRevealReady(false)
    // Wall clock: authDemoTimeout jobs are cleared by playFrom on handoff.
    const id = window.setTimeout(
      () => setRevealReady(true),
      AUTH_DEMO_MARQUEE.captionEnterDelayMs,
    )
    return () => window.clearTimeout(id)
  }, [reduceMotion])

  React.useEffect(() => {
    if (captionId === shownId) {
      if (!skipFade) skipFadeRef.current = false
      return
    }
    if (skipFade || skipFadeRef.current) {
      setShownId(captionId)
      setVisible(true)
      if (!skipFade) skipFadeRef.current = false
      return
    }
    setVisible(false)
    const swap = authDemoTimeout(() => {
      setShownId(captionId)
      setVisible(true)
    }, CAPTION_FADE_MS)
    return () => authDemoClear(swap)
  }, [captionId, skipFade, shownId])

  return (
    <div
      ref={hostRef}
      className={cn(
        'max-w-[26rem] py-1',
        !reduceMotion && 'transition-[opacity,transform] ease-[cubic-bezier(0.22,1,0.36,1)]',
        shownOnScreen ? 'translate-y-0 opacity-100' : '-translate-y-1.5 opacity-0',
      )}
      data-auth-demo-caption=""
      style={{ transitionDuration: reduceMotion ? '0ms' : `${CAPTION_FADE_MS}ms` }}
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white/16 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] backdrop-blur-sm"
        >
          <Icon className="size-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="font-heading text-[20px] leading-[1.3] font-semibold tracking-[-0.01em] text-white text-balance [text-shadow:0_1px_18px_rgba(0,0,0,0.4)]">
            {shown.title}
          </h2>
          <p className="mt-1.5 font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-white/78 text-pretty [text-shadow:0_1px_14px_rgba(0,0,0,0.35)]">
            {shown.body}
          </p>
        </div>
      </div>
    </div>
  )
}

/** Distance from the carousel center to the outer edge of a side card in the embed. */
function plainCarouselOuterRem(sideSpreadRem: number | null) {
  const spread =
    sideSpreadRem ?? (typeof window !== 'undefined' ? embedSideSpreadRem() : AUTH_MEAL_SIDE_X_REM.closed)
  const sideX = Math.min(AUTH_MEAL_SIDE_X_REM.closed, Math.max(2.75, spread))
  return sideX + (AUTH_MEAL_CARD_WIDTH_REM * AUTH_MEAL_SIDE_SCALE) / 2
}

/** How far side cards can sit before their outer edge meets the embed frame. */
function embedSideSpreadRem(viewportWidth = window.innerWidth) {
  const root = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const halfCard = (AUTH_MEAL_CARD_WIDTH_REM * AUTH_MEAL_SIDE_SCALE * root) / 2
  // Keep a sliver of the smoke between the side cards and the rounded frame.
  const inset = 20
  return (viewportWidth / 2 - inset - halfCard) / root
}

function carouselTransform(offset: number, expanded: boolean, sideSpreadRem: number | null = null) {
  if (offset === 0) {
    return expanded
      ? `translate(-50%, -50%) scale(${AUTH_MEAL_OPEN_SCALE})`
      : 'translate(-50%, -50%)'
  }
  const design = expanded ? AUTH_MEAL_SIDE_X_REM.open : AUTH_MEAL_SIDE_X_REM.closed
  const sideX =
    sideSpreadRem == null ? design : Math.min(design, Math.max(2.75, sideSpreadRem))
  const sideY = expanded ? 20 : 14
  if (offset === -1) {
    return `translate(-50%, -50%) translate(-${sideX}rem, ${sideY}px) scale(${AUTH_MEAL_SIDE_SCALE})`
  }
  if (offset === 1) {
    return `translate(-50%, -50%) translate(${sideX}rem, ${sideY}px) scale(${AUTH_MEAL_SIDE_SCALE})`
  }
  const direction = offset < 0 ? -1 : 1
  return `translate(-50%, -50%) translate(${direction * 19.5}rem, 22px) scale(0.78)`
}
