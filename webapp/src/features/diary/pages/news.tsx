/**
 * User-role nutrition diary feed.
 */
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CirclePlusIcon,
  BookmarkIcon,
  CalendarIcon,
  ChartNoAxesCombinedIcon,
  FlameIcon,
  LayersIcon,
  LayoutGridIcon,
  Rows2Icon,
  SearchIcon,
  ShoppingBagIcon,
  UtensilsIcon,
  ZapIcon,
} from "@/components/icons";
import { createPortal } from "react-dom";
import { toast } from "@/components/ui/toast";

import {
  noraPageDescriptionClass,
  noraPageTitleClass,
} from "@/components/PageLayout";
import {
  ProductFeedEmpty,
  SectionLoading,
  productFeedPageClass,
  productFeedToolbarRowClass,
  productToolbarSearchCollapseClass,
} from "@/components/nora/product-sheet";
import { ProductToolbarSearch } from "@/components/nora/toolbar-search";
import {
  NoraButton,
} from "@/components/nora/primitives";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/features/auth";
import { questionnaireDailyCalorieTarget, useQuestionnaireQuery } from "@/features/users";
import { GenerationSpendBadge } from "../GenerationSpendBadge";
import { putUserFavorites } from "@/platform/account-favorites";
import { snapshotFromPlanLibrary } from "@/platform/account-plan-library";
import {
  readAssignedPlans,
} from "@/platform/authored-plans";
import { notifyHybridFavoriteAdded } from "@/platform/hybrid-notifications";
import { readPlanLibrarySnapshot, withAuthoredPlan } from "@/platform/plan-library-local";
import { readPlanMealLayout } from "@/platform/plan-meal-layout";
import { mergeFavoriteIds, type SavedAccountScope } from "@/platform/saved-ids";
import { cn } from "@/lib/utils";

import {
  createMyMeal,
  deleteMyMeal,
  setMyMealPlanDone,
  shareMyMeal,
} from "../api";
import {
  DIARY_MOBILE_DOCK_MOVE_ID,
  registerAddMealOpener,
} from "../add-meal-request";
import {
  DiaryPeriodPicker,
  diaryToolbarChipClass,
  diaryToolbarIconButtonClass,
  diaryToolbarPairDividerClass,
  diaryToolbarPillClass,
  isMealInLocalDayRange,
  type DiaryPeriodFilter,
} from "../DiaryPeriodPicker";
import { DayActivityDialog } from "../DayActivityDialog";
import { DayShoppingDialog } from "../DayShoppingDialog";
import {
  dayShoppingItems,
  isDayShoppingComplete,
  readBoughtShoppingKeys,
  shoppingDayKey,
} from "../day-shopping";
import { mealsInMondayWeek, sumDiaryDayStats } from "../day-activity-rings";
import {
  diaryFeedGridClass,
  readDiaryCardLayout,
  writeDiaryCardLayout,
  type DiaryCardLayout,
} from "../diary-card-layout";
import {
  readCompletedRationMealIds,
  readDiaryPlanAtById,
  writeCompletedRationMealIds,
  writeDiaryPlanAtById,
} from "../ration-done";
import { DiaryPlanDayPicker } from "../DiaryPlanDayPicker";
import {
  diaryCreatePlanFromMeals,
  diaryDefaultPlanId,
  diaryMealCanCopyToPlan,
  diaryMealCreatePlanDraft,
  diaryMealOnPlanDay,
  diaryMealsFreshForPlanDay,
  diaryMealStampOnDay,
  diaryPlanCopiesOnDay,
  diaryPlanSourceId,
  diaryWeekPlanOptions,
} from "../diary-plan-import";
import type { FeedPlanWeekDay } from "../feed-import";
import { mealImageFromUrl } from "../meal-image-pick";
import { preferredMealPhotoSrc } from "../meal-cover";
import {
  keepsWeeklyPlanOnDiaryDelete,
  diaryPlanIdForMeal,
  diaryPlanStartForMeal,
  mealListAfterPlanDone,
  orderDiaryDayByPlanLayout,
  planLayoutSlotIndex,
  planOccurrenceDiaryAtWithLayout,
  readSkippedPlanMealIds,
  writeSkippedPlanMealIds,
} from "../plan-occurrence";
import {
  currentWeekPlanStampId,
  isDiaryFeedMealVisible,
  isDiaryMealOnCurrentDay,
  isDiaryMealOnFutureDay,
  isRationPlanDone,
  isRationPlanPending,
  mealCanShareToFeed,
  mealShareBlockedMessage,
  mealCardOrigin,
} from "../ration-import";
import {
  ensureDiaryState,
  filterDiaryMeals,
  readSavedMealIds,
  removeDemoMealFromDiary,
  writeSavedMealIds,
  type DiaryFeedState,
} from "../diary-assignments";
import { diaryPeriodStartOverrideForEmail } from "../diary-period-start";
import type { MealEntry } from "../meals-catalog";
import { mealDtoToEntry } from "../merge-meals";
import {
  mealsQueryKeys,
  useMealsQuery,
  usePlanLibraryQuery,
  useUserFavoritesQuery,
  favoritesQueryKeys,
} from "../queries";
import { useSyncedPlanLibrary } from "../use-plan-library";
import {
  formatCount,
  feedDayHeading,
  groupMealsByDay,
  isApiMealId,
  favoriteMealIdsForSync,
  localCalendarDayKey,
  localDayKey,
  mealsCountLabel,
  reconcileLocalFavoriteIds,
} from "../diary-feed";
import {
  closestOverflowRoot,
  intersectingMealIds,
  rememberViewedMealIds,
} from "../meal-viewport";
import {
  Cover,
  MealCard,
  MealMacrosPlaque,
  commitMealVersionExtras,
  imagesForDiaryMeal,
} from "../MealCard";
import { MealAddDraftDialog } from "../MealAddDraftDialog";
import { MealOpenDetail } from "../MealOpenDetail";
import {
  MEAL_DIALOG_COVER_CLASS,
  MEAL_DIALOG_FRAME_CLASS,
  MealDialogHero,
  RATION_PENDING_COVER_CLASS,
  useMealDialogDismissLocked,
} from "../meal-sheet";
import { DeleteCardDialog } from "../DeleteCardDialog";
import { mealCardDeletePrompt } from "../delete-card-prompt";
import type { MealMacrosRevealState } from "../meal-card-reveal";

type FeedTab = "Все" | "Избранное";
const SHOW_DIARY_WEEK_ACTIVITY = false;
const DAY_STAT_CHIP_CLASS =
  "ios-glass-glare inline-flex h-7 min-h-7 max-h-7 shrink-0 items-center gap-1 rounded-full border-0 bg-[var(--nora-input-bg)] py-0 pr-2.5 pl-2 font-[family-name:var(--nora-font)] text-[12px] font-normal leading-none tabular-nums text-[var(--nora-text-secondary)]";
const DAY_DATE_CHIP_CLASS =
  "ios-glass-glare inline-flex h-7 min-h-7 max-h-7 shrink-0 items-center gap-1 rounded-full border-0 bg-[var(--nora-text)] py-0 pr-2.5 pl-2 text-[12px] font-normal leading-none text-white dark:bg-[#2C2C2E]";
const DAY_PLAN_CHIP_CLASS =
  "ios-glass-glare inline-flex h-7 min-h-7 max-h-7 shrink-0 items-center gap-1 rounded-full border-0 bg-[var(--nora-tint)] py-0 pr-2.5 pl-2 text-[12px] font-normal leading-none text-white";
const DAY_CHIPS_ROW_CLASS =
  "relative z-[1] flex w-full min-w-0 items-center gap-2 overflow-x-auto overscroll-x-contain select-none max-md:-mx-2 max-md:px-2 py-3 -my-3 no-scrollbar md:overflow-visible";
const FAVORITES_PICK_KEY = "favorites";
const DIARY_MOVE_PILL_CLASS =
  "ios-float-pill inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-normal leading-none text-[var(--nora-text)] outline-none transition-[transform,opacity] active:scale-95 focus-visible:shadow-[var(--nora-shadow-focus)] disabled:pointer-events-none disabled:opacity-100 disabled:!text-[var(--nora-text-tertiary)]";

function FeedAddToPlanChip({
  pickedCount,
  onMove,
}: {
  pickedCount: number;
  onMove: () => void;
}) {
  return (
    <button
      className={cn(
        pickedCount === 0 ? DAY_STAT_CHIP_CLASS : DAY_PLAN_CHIP_CLASS,
        "nora-press-grow hidden md:inline-flex disabled:pointer-events-none disabled:opacity-100 disabled:!text-[var(--nora-text-tertiary)]",
      )}
      disabled={pickedCount === 0}
      onClick={onMove}
      type="button"
    >
      <CirclePlusIcon
        aria-hidden
        className={cn(
          "size-[14px]",
          pickedCount === 0
            ? "text-[var(--nora-text-tertiary)]"
            : "text-white",
        )}
        strokeWidth={1.75}
      />
      В рацион
    </button>
  );
}

function FeedFavoritesPickBar({
  mealCount,
  picking,
  pickedCount,
  onMove,
  onPick,
}: {
  mealCount: number;
  picking: boolean;
  pickedCount: number;
  onMove: () => void;
  onPick: () => void;
}) {
  return (
    <div className={DAY_CHIPS_ROW_CLASS}>
      <div className="flex w-max shrink-0 items-center gap-2">
        <button
          aria-label="Выбрать избранные приёмы"
          aria-pressed={picking}
          className={cn(
            DAY_STAT_CHIP_CLASS,
            "nora-press-grow",
            picking && "ring-1 ring-[var(--nora-tint)]",
          )}
          data-diary-favorites-pick=""
          onClick={onPick}
          type="button"
        >
          <UtensilsIcon
            aria-hidden
            className="size-[13px]"
            strokeWidth={1.75}
          />
          {mealsCountLabel(mealCount)}
        </button>
        {picking ? (
          <FeedAddToPlanChip onMove={onMove} pickedCount={pickedCount} />
        ) : null}
      </div>
    </div>
  );
}

function FeedDayStats({
  dayIso,
  dailyCalories,
  meals,
  onMove,
  onPickDay,
  picking = false,
  pickable = false,
  pickedCount = 0,
  planMode = false,
  readOnly = false,
  savedScope,
  totals,
}: {
  dayIso: string;
  dailyCalories: number;
  meals: readonly MealEntry[];
  onMove?: () => void;
  onPickDay?: () => void;
  picking?: boolean;
  pickable?: boolean;
  pickedCount?: number;
  planMode?: boolean;
  readOnly?: boolean;
  savedScope: SavedAccountScope;
  totals: {
    kcal: number;
    protein: number;
    fat: number;
    carbs: number;
    count: number;
  };
}) {
  const [shoppingOpen, setShoppingOpen] = React.useState(false);
  const dayKey = shoppingDayKey(dayIso);
  const shoppingItems = dayShoppingItems(meals);
  const [bought, setBought] = React.useState(() =>
    readBoughtShoppingKeys(savedScope, dayKey),
  );
  const shoppingIdentity = `${dayKey}:${savedScope.userId}:${savedScope.email}`;
  const [loadedShoppingIdentity, setLoadedShoppingIdentity] =
    React.useState(shoppingIdentity);
  if (loadedShoppingIdentity !== shoppingIdentity) {
    setLoadedShoppingIdentity(shoppingIdentity);
    setBought(readBoughtShoppingKeys(savedScope, dayKey));
  }
  const shoppingComplete = isDayShoppingComplete(shoppingItems, bought);
  const heading = feedDayHeading(dayIso);
  const stampKey = localDayKey(dayIso);
  const todayKey = localCalendarDayKey(new Date());
  const dateChipClass =
    planMode && stampKey <= todayKey ? DAY_PLAN_CHIP_CLASS : DAY_DATE_CHIP_CLASS;
  const calorieDelta = dailyCalories - totals.kcal;
  const balanceLabel =
    calorieDelta > 0
      ? `Недобор −${formatCount(calorieDelta)}`
      : calorieDelta < 0
        ? `Перебор +${formatCount(-calorieDelta)}`
        : "Норма";
  const balanceTone =
    calorieDelta > 0 ? "yellow" : calorieDelta < 0 ? "red" : "green";
  const dateChip = (
    <>
      <CalendarIcon
        aria-hidden
        className="size-[13px] text-white"
        strokeWidth={1.75}
      />
      {heading}
    </>
  );

  return (
    <div className={DAY_CHIPS_ROW_CLASS}>
      <div className="flex w-max shrink-0 items-center gap-2">
        {pickable && onPickDay ? (
          <button
            aria-label={`Выбрать приёмы за ${heading}`}
            aria-pressed={picking}
            className={cn(
              dateChipClass,
              "nora-press-grow",
              picking && "ring-1 ring-[var(--nora-tint)]",
            )}
            data-diary-day-pick=""
            data-diary-day-plan={planMode && stampKey <= todayKey ? "" : undefined}
            onClick={onPickDay}
            type="button"
          >
            {dateChip}
          </button>
        ) : (
          <div
            className={dateChipClass}
            data-diary-day-plan={planMode && stampKey <= todayKey ? "" : undefined}
          >
            {dateChip}
          </div>
        )}
        {picking && onMove ? (
          <FeedAddToPlanChip onMove={onMove} pickedCount={pickedCount} />
        ) : null}
        <button
          aria-label="Список покупок"
          className={cn(
            DAY_STAT_CHIP_CLASS,
            "nora-press-grow hidden size-7 justify-center px-0",
            shoppingComplete
              ? "bg-[var(--nora-badge-green-bg)] text-[var(--nora-badge-green-text)]"
              : "bg-[var(--nora-tint-dimmed)] text-[var(--nora-tint)]",
          )}
          onClick={() => setShoppingOpen(true)}
          type="button"
        >
          <ShoppingBagIcon
            aria-hidden
            className="size-[13px]"
            strokeWidth={1.75}
          />
        </button>
        <DayShoppingDialog
          dayIso={dayIso}
          heading={heading}
          meals={meals}
          onBoughtChange={setBought}
          onOpenChange={setShoppingOpen}
          open={shoppingOpen}
          readOnly={readOnly}
          savedScope={savedScope}
        />
        <div className={DAY_STAT_CHIP_CLASS}>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <FlameIcon aria-hidden className="size-[13px]" strokeWidth={1.75} />
            {formatCount(totals.kcal)}
          </span>
          <span aria-hidden>/</span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <FlameIcon aria-hidden className="size-[13px]" strokeWidth={1.75} />
            {formatCount(dailyCalories)} ккал
          </span>
        </div>
        <div
          className={cn(
            DAY_STAT_CHIP_CLASS,
            balanceTone === "yellow" &&
              "bg-[var(--nora-badge-yellow-bg)] text-[var(--nora-badge-yellow-text)]",
            balanceTone === "red" &&
              "bg-[var(--nora-badge-red-bg)] text-[var(--nora-badge-red-text)]",
            balanceTone === "green" &&
              "bg-[var(--nora-badge-green-bg)] text-[var(--nora-badge-green-text)]",
          )}
        >
          <ZapIcon aria-hidden className="size-[13px]" strokeWidth={1.75} />
          {balanceLabel}
        </div>
      </div>
      <div className="ml-auto flex w-max shrink-0 items-center gap-2">
        <div className={cn(DAY_STAT_CHIP_CLASS, "gap-2 px-3")}>
          <span
            aria-label={`Белки ${formatCount(totals.protein)}`}
            className="inline-flex items-center gap-1 tabular-nums"
          >
            <span aria-hidden>Б:</span>
            {formatCount(totals.protein)}
          </span>
          <span
            aria-label={`Жиры ${formatCount(totals.fat)}`}
            className="inline-flex items-center gap-1 tabular-nums"
          >
            <span aria-hidden>Ж:</span>
            {formatCount(totals.fat)}
          </span>
          <span
            aria-label={`Углеводы ${formatCount(totals.carbs)}`}
            className="inline-flex items-center gap-1 tabular-nums"
          >
            <span aria-hidden>У:</span>
            {formatCount(totals.carbs)}
          </span>
        </div>
        <div className={cn(DAY_STAT_CHIP_CLASS, "px-3")}>
          <UtensilsIcon
            aria-hidden
            className="size-[13px]"
            strokeWidth={1.75}
          />
          {mealsCountLabel(totals.count)}
        </div>
      </div>
    </div>
  );
}

/**
 * Лента дневника питания пользователя.
 */
export function NewsPage({
  subjectUserId,
  subjectEmail,
  periodStartIso,
  readOnly = false,
  heading,
  toolbarExtra,
  toolbarStart,
  toolbarEnd,
  toolbarDisabled = false,
  calorieTarget,
  body,
  onMealsViewed,
}: {
  /** When set (mentor view), load this user's diary instead of the session user. */
  subjectUserId?: string;
  /** Used for rare per-user calendar start overrides (mentor may pass mentee email). */
  subjectEmail?: string;
  /** Registration/start day for the period picker label (mentor may pass mentee createdAt). */
  periodStartIso?: string;
  readOnly?: boolean;
  heading?: {
    title: string;
    description?: string;
  };
  /** Optional control at the start of the toolbar (e.g. mentee view switch). */
  toolbarExtra?: React.ReactNode;
  /** Optional leading toolbar slot, rendered as-is (e.g. diary/plan switcher). */
  toolbarStart?: React.ReactNode;
  /** Optional control at the far right of the toolbar (e.g. questionnaire edit). */
  toolbarEnd?: React.ReactNode;
  /** Greys out diary-only toolbar/stats controls while keeping the chrome. */
  toolbarDisabled?: boolean;
  /** Daily calorie goal from the subject's questionnaire; otherwise loaded for the session user. */
  calorieTarget?: number;
  /** When set, replaces the meal feed (e.g. mentee questionnaire). */
  body?: React.ReactNode;
  /** Mentor diary: report meal cards that entered the visible viewport. */
  onMealsViewed?: (mealIds: string[]) => void;
} = {}) {
  const auth = useAuth();
  const mealDialogDismissLocked = useMealDialogDismissLocked();
  const { user } = auth;
  const queryClient = useQueryClient();
  const subjectId =
    subjectUserId ?? (user?.role === "user" ? user.id : undefined);
  const savedScope = {
    userId: subjectId ?? "guest",
    email:
      subjectEmail ??
      (user && subjectId && user.id === subjectId ? user.email : undefined),
  };
  const isOwnAccount = Boolean(user && subjectId && user.id === subjectId);
  const mealsQuery = useMealsQuery(subjectId);
  const favoritesQuery = useUserFavoritesQuery(isOwnAccount);
  const planLibraryQuery = usePlanLibraryQuery(isOwnAccount);
  const { persist: persistPlanLibrary, snapshot: ownPlanLibrary } =
    useSyncedPlanLibrary(isOwnAccount);
  const planLibrary = planLibraryQuery.data
    ? snapshotFromPlanLibrary(planLibraryQuery.data)
    : readPlanLibrarySnapshot(savedScope);
  const selectedPlanIds = React.useMemo(
    () => new Set(planLibrary.selectedPlanIds),
    [planLibrary.selectedPlanIds],
  );
  const selectedPlanId = planLibrary.selectedPlanIds[0] ?? null;
  const questionnaireQuery = useQuestionnaireQuery(isOwnAccount);
  const [tab, setTab] = React.useState<FeedTab>("Все");
  const [query, setQuery] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [saved, setSaved] = React.useState<Set<string>>(() => new Set());
  const [completedIds, setCompletedIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [diaryAtById, setDiaryAtById] = React.useState<Record<string, string>>(
    {},
  );
  const [skippedIds, setSkippedIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<MealEntry | null>(null);
  const [deletingCard, setDeletingCard] = React.useState(false);
  const [openMacrosReveal, setOpenMacrosReveal] =
    React.useState<MealMacrosRevealState>({
      rolling: false,
    });
  const [addMealOpen, setAddMealOpen] = React.useState(false);
  const [addFormedId, setAddFormedId] = React.useState<string | null>(null);
  const [mealGalleries, setMealGalleries] = React.useState<
    Record<string, Record<string, string[]>>
  >({});
  const [diaryState, setDiaryState] = React.useState<DiaryFeedState | null>(
    null,
  );
  const [periodFilter, setPeriodFilter] =
    React.useState<DiaryPeriodFilter | null>(null);
  const [showWholePlan, setShowWholePlan] = React.useState(false);
  const [cardLayout, setCardLayout] = React.useState<DiaryCardLayout>(
    readDiaryCardLayout,
  );
  const [planMeals, setPlanMeals] = React.useState<MealEntry[]>([]);
  const [pickerPlanId, setPickerPlanId] = React.useState("");
  const [addingPlanDayKey, setAddingPlanDayKey] = React.useState<string | null>(
    null,
  );
  const [pickingDayKey, setPickingDayKey] = React.useState<string | null>(null);
  const [pickedIds, setPickedIds] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [dockMove, setDockMove] = React.useState<HTMLElement | null>(null);
  const [weekStatsOpen, setWeekStatsOpen] = React.useState(false);
  const feedRootRef = React.useRef<HTMLDivElement>(null);
  const onMealsViewedRef = React.useRef(onMealsViewed);
  onMealsViewedRef.current = onMealsViewed;
  const [viewedMealIds, setViewedMealIds] = React.useState(
    () => new Set<string>(),
  );
  const reportMealsViewed = React.useCallback((mealIds: string[]) => {
    setViewedMealIds((current) => rememberViewedMealIds(current, mealIds));
    onMealsViewedRef.current?.(mealIds);
  }, []);
  const reportMealsViewedRef = React.useRef(reportMealsViewed);
  reportMealsViewedRef.current = reportMealsViewed;
  const planDoneInFlightRef = React.useRef(new Set<string>());

  React.useEffect(() => {
    if (readOnly || user?.role !== "user") return;
    return registerAddMealOpener(() => {
      setOpenId(null);
      setAddMealOpen(true);
    });
  }, [readOnly, user?.role]);

  React.useLayoutEffect(() => {
    setDockMove(document.getElementById(DIARY_MOBILE_DOCK_MOVE_ID));
  }, []);

  React.useEffect(() => {
    if (pickingDayKey) document.documentElement.dataset.diaryPicking = "";
    else delete document.documentElement.dataset.diaryPicking;
    return () => {
      delete document.documentElement.dataset.diaryPicking;
    };
  }, [pickingDayKey]);

  React.useEffect(() => {
    if (!pickingDayKey) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setPickingDayKey(null);
      setPickedIds(new Set());
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pickingDayKey]);

  React.useEffect(() => {
    if (!subjectId) {
      setDiaryState(null);
      setSaved(new Set());
      setCompletedIds(new Set());
      setDiaryAtById({});
      setSkippedIds(new Set());
      return;
    }
    const scope = {
      userId: subjectId,
      email:
        subjectEmail ??
        (user && user.id === subjectId ? user.email : undefined),
    };
    setDiaryState(ensureDiaryState(subjectId));
    setSaved(readSavedMealIds(scope));
    setCompletedIds(readCompletedRationMealIds(scope));
    setDiaryAtById(readDiaryPlanAtById(scope));
    setSkippedIds(readSkippedPlanMealIds(scope));
    setTab("Все");
    setQuery("");
    setSearchOpen(false);
    setOpenId(null);
    setAddMealOpen(false);
    setAddFormedId(null);
    setPlanMeals([]);
    setAddingPlanDayKey(null);
    setPickingDayKey(null);
    setPickedIds(new Set());
    setPeriodFilter(null);
    setShowWholePlan(false);
    setMealGalleries({});
    setViewedMealIds(new Set());
  }, [subjectEmail, subjectId, user]);

  const selectedPlanKey = [...selectedPlanIds].sort().join("|");
  React.useEffect(() => {
    if (!subjectId) return;
    setSkippedIds(
      readSkippedPlanMealIds({
        userId: subjectId,
        email: savedScope.email,
      }),
    );
  }, [savedScope.email, selectedPlanKey, subjectId]);

  React.useEffect(() => {
    if (selectedPlanIds.size === 0) setShowWholePlan(false);
  }, [selectedPlanIds.size]);

  React.useEffect(() => {
    if (!isOwnAccount || !subjectId || !user || !favoritesQuery.data) return;
    const local = readSavedMealIds({ userId: subjectId, email: user.email });
    const merged = mergeFavoriteIds(favoritesQuery.data.mealIds, local);
    const next = new Set(merged);
    setSaved(next);
    writeSavedMealIds({ userId: subjectId, email: user.email }, next);
    const remoteSet = new Set(favoritesQuery.data.mealIds);
    const localApi = favoriteMealIdsForSync(merged);
    if (localApi.some((id) => !remoteSet.has(id))) {
      void putUserFavorites(auth.transport, { mealIds: localApi })
        .then((remote) => {
          queryClient.setQueryData(
            favoritesQueryKeys.forUser(subjectId),
            remote,
          );
          const reconciled = reconcileLocalFavoriteIds(merged, remote.mealIds);
          setSaved(reconciled);
          writeSavedMealIds(
            { userId: subjectId, email: user.email },
            reconciled,
          );
        })
        .catch(() => {
          // Keep local bookmarks; a later visit retries quietly.
        });
    }
  }, [
    auth.transport,
    favoritesQuery.data,
    isOwnAccount,
    queryClient,
    subjectId,
    user,
  ]);

  React.useEffect(() => {
    if (!searchOpen) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-diary-search]")) return;
      if (query.trim()) return;
      setSearchOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [query, searchOpen]);

  const userMeals = React.useMemo(
    () => (mealsQuery.data?.items ?? []).map(mealDtoToEntry),
    [mealsQuery.data?.items],
  );
  React.useEffect(() => {
    if (!isOwnAccount) return;
    setCompletedIds((current) => {
      const inFlight = planDoneInFlightRef.current;
      let changed = false;
      const next = new Set(current);
      for (const meal of userMeals) {
        if (!meal.id || inFlight.has(meal.id)) continue;
        if (!isRationPlanPending(meal, new Set()) && !isRationPlanDone(meal, new Set())) {
          continue;
        }
        const serverDone = isRationPlanDone(meal, new Set());
        if (serverDone && !next.has(meal.id)) {
          next.add(meal.id);
          changed = true;
        } else if (!serverDone && next.has(meal.id)) {
          next.delete(meal.id);
          changed = true;
        }
      }
      if (!changed) return current;
      writeCompletedRationMealIds(savedScope, next);
      return next;
    });
  }, [isOwnAccount, savedScope.email, savedScope.userId, userMeals]);
  const dailyCalories =
    calorieTarget ??
    questionnaireDailyCalorieTarget(questionnaireQuery.data?.answers) ??
    diaryState?.dailyCalories ??
    2200;
  const weekMeals = React.useMemo(
    () => mealsInMondayWeek(userMeals),
    [userMeals],
  );

  const periodStart = React.useMemo(() => {
    const emailForOverride =
      subjectEmail ??
      (user && subjectId && user.id === subjectId ? user.email : undefined);
    const override = diaryPeriodStartOverrideForEmail(emailForOverride);
    if (override) return override;
    if (periodStartIso) return periodStartIso;
    if (user && subjectId && user.id === subjectId) return user.createdAt;
    if (userMeals.length > 0) {
      return userMeals.reduce(
        (earliest, meal) => (meal.at < earliest ? meal.at : earliest),
        userMeals[0]!.at,
      );
    }
    return new Date().toISOString();
  }, [periodStartIso, subjectEmail, user, subjectId, userMeals]);

  const openMealSource = userMeals.find((m) => m.id === openId) ?? null;
  const openMeal = openMealSource
    ? { ...openMealSource, at: diaryAtForMeal(openMealSource) }
    : null;
  const openMealPending = openMeal
    ? isRationPlanPending(openMeal, completedIds)
    : false;
  const openMealImages = openMeal
    ? imagesForDiaryMeal(openMeal, mealGalleries)
    : [];

  async function persistFavoriteIds(next: Set<string>) {
    setSaved(next);
    writeSavedMealIds(savedScope, next);
    if (!isOwnAccount) return true;
    try {
      const remote = await putUserFavorites(auth.transport, {
        mealIds: favoriteMealIdsForSync(next),
      });
      queryClient.setQueryData(favoritesQueryKeys.forUser(subjectId), remote);
      const reconciled = reconcileLocalFavoriteIds(next, remote.mealIds);
      setSaved(reconciled);
      writeSavedMealIds(savedScope, reconciled);
      return true;
    } catch {
      toast.error("Не удалось сохранить избранное", {
        id: "favorites-save-failed",
      });
      return false;
    }
  }

  async function toggleSave(id: string, title?: string) {
    if (readOnly || !subjectId) return;
    const next = new Set(saved);
    const willSave = !next.has(id);
    if (willSave) next.add(id);
    else next.delete(id);
    const ok = await persistFavoriteIds(next);
    if (!ok) return;
    if (willSave) {
      toast.success("Добавлено в избранное", { id: "favorite-added" });
      void notifyHybridFavoriteAdded(title ?? "Приём");
    } else toast("Убрано из избранного", { id: "favorite-removed" });
  }

  function diaryPlanSlotIndex(meal: MealEntry) {
    if (!isRationPlanPending(meal, completedIds)) return null;
    const planId = diaryPlanIdForMeal(meal, selectedPlanIds);
    if (!planId) return null;
    return planLayoutSlotIndex(meal.id, readPlanMealLayout(savedScope, planId));
  }

  function diaryAtForMeal(meal: MealEntry, now = new Date()) {
    const planId = diaryPlanIdForMeal(meal, selectedPlanIds, now);
    const planMeals = planId
      ? userMeals.filter(
          (item) => diaryPlanIdForMeal(item, selectedPlanIds, now) === planId,
        )
      : [];
    return planOccurrenceDiaryAtWithLayout(meal, {
      frozenAt: diaryAtById[meal.id],
      completedIds,
      now,
      planStart: diaryPlanStartForMeal(meal, savedScope, selectedPlanIds, now),
      layout: planId ? readPlanMealLayout(savedScope, planId) : null,
      planMeals,
    });
  }

  function toggleRationMealDone(id: string) {
    if (readOnly || !subjectId) return;
    const meal = userMeals.find((item) => item.id === id);
    if (!meal) return;
    const shownAt = diaryAtForMeal(meal);
    if (!isDiaryMealOnCurrentDay({ at: shownAt })) return;
    planDoneInFlightRef.current.add(id);
    const previous = new Set(completedIds);
    const previousDiaryAt = diaryAtById;
    const next = new Set(completedIds);
    const willComplete = !isRationPlanDone(meal, completedIds);
    if (willComplete) next.add(id);
    else next.delete(id);
    const stayAt = shownAt;
    const previousMeals = queryClient.getQueryData<{
      items: Array<{ id: string; recordedAt: string; assumptions?: string[] }>;
    }>(mealsQueryKeys.forSubject(subjectId));
    if (meal && (meal.fromApi || isApiMealId(meal.id))) {
      queryClient.setQueryData<{
        items: Array<{
          id: string;
          recordedAt: string;
          assumptions?: string[];
        }>;
      }>(mealsQueryKeys.forSubject(subjectId), (current) => {
        if (!current) return current;
        return {
          ...current,
          items: mealListAfterPlanDone(current.items, id, {
            done: willComplete,
            ...(stayAt ? { recordedAt: stayAt } : {}),
          }),
        };
      });
    }
    setCompletedIds(next);
    writeCompletedRationMealIds(savedScope, next);
    if (stayAt) {
      const nextAt = { ...diaryAtById };
      if (willComplete) nextAt[id] = stayAt;
      else delete nextAt[id];
      setDiaryAtById(nextAt);
      writeDiaryPlanAtById(savedScope, nextAt);
    }
    if (willComplete) toast.success("Приём отмечен как выполненный");
    else toast("Приём снова в плане");
    if (!meal || !(meal.fromApi || isApiMealId(meal.id))) {
      planDoneInFlightRef.current.delete(id);
      return;
    }
    void setMyMealPlanDone(auth.transport, id, {
      done: willComplete,
      ...(stayAt ? { recordedAt: stayAt } : {}),
    })
      .then((result) => {
        planDoneInFlightRef.current.delete(id);
        const pinned = stayAt
          ? { ...result.meal, recordedAt: stayAt }
          : result.meal;
        queryClient.setQueryData<{ items: Array<{ id: string }> }>(
          mealsQueryKeys.forSubject(subjectId),
          (current) => {
            if (!current) return { items: [pinned] };
            return {
              ...current,
              items: current.items.map((item) =>
                item.id === pinned.id ? pinned : item,
              ),
            };
          },
        );
      })
      .catch(() => {
        planDoneInFlightRef.current.delete(id);
        setCompletedIds(previous);
        setDiaryAtById(previousDiaryAt);
        writeDiaryPlanAtById(savedScope, previousDiaryAt);
        writeCompletedRationMealIds(savedScope, previous);
        if (previousMeals) {
          queryClient.setQueryData(
            mealsQueryKeys.forSubject(subjectId),
            previousMeals,
          );
        }
        toast.error("Не удалось сохранить выполнение");
      });
  }

  async function deleteMeal(meal: MealEntry) {
    if (readOnly || !subjectId || !user) return;
    if (keepsWeeklyPlanOnDiaryDelete(meal)) {
      if (isRationPlanDone(meal, completedIds)) {
        const nextCompleted = new Set(completedIds);
        nextCompleted.delete(meal.id);
        setCompletedIds(nextCompleted);
        writeCompletedRationMealIds(savedScope, nextCompleted);
        if (meal.fromApi || isApiMealId(meal.id)) {
          void setMyMealPlanDone(auth.transport, meal.id, {
            done: false,
          }).catch(() => {
            toast.error("Не удалось вернуть приём в план");
          });
        }
      }
      const nextSkipped = new Set(skippedIds);
      nextSkipped.add(meal.id);
      setSkippedIds(nextSkipped);
      writeSkippedPlanMealIds(savedScope, nextSkipped);
      if (openId === meal.id) setOpenId(null);
      toast.success("Убрано из дневника");
      return;
    }
    const isApiMeal = Boolean(meal.fromApi || isApiMealId(meal.id));
    try {
      if (isApiMeal) {
        if (user.id !== subjectId) {
          toast.error("Удалять можно только свои записи");
          return;
        }
        await deleteMyMeal(auth.transport, meal.id);
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: mealsQueryKeys.forSubject(subjectId),
          }),
          queryClient.invalidateQueries({ queryKey: mealsQueryKeys.shared() }),
        ]);
      } else {
        setDiaryState(removeDemoMealFromDiary(subjectId, meal.id));
      }
      if (openId === meal.id) setOpenId(null);
      setSaved((prev) => {
        if (!prev.has(meal.id)) return prev;
        const next = new Set(prev);
        next.delete(meal.id);
        if (subjectId) writeSavedMealIds(savedScope, next);
        return next;
      });
      toast.success("Карточка удалена");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось удалить карточку",
      );
    }
  }

  async function shareMeal(meal: MealEntry) {
    if (readOnly || !subjectId || !user) return;
    const isApiMeal = Boolean(meal.fromApi || isApiMealId(meal.id));
    if (!isApiMeal) {
      toast.error("Опубликовать можно только сохранённый приём");
      return;
    }
    if (user.id !== subjectId) {
      toast.error("Публиковать можно только свои записи");
      return;
    }
    if (!mealCanShareToFeed(meal) && !meal.shared) {
      toast.error(mealShareBlockedMessage(meal));
      return;
    }
    const nextShared = !meal.shared;
    try {
      await shareMyMeal(auth.transport, meal.id, { shared: nextShared });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: mealsQueryKeys.forSubject(subjectId),
        }),
        queryClient.invalidateQueries({ queryKey: mealsQueryKeys.shared() }),
      ]);
      toast.success(
        nextShared ? "Приём опубликован в ленте" : "Приём скрыт из ленты",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось изменить публикацию",
      );
    }
  }

  const canAddToPlan = isOwnAccount && !readOnly;
  const planOptions = diaryWeekPlanOptions([
    ...planLibrary.authoredPlans,
    ...readAssignedPlans(savedScope),
  ]);
  const weekPlanFallbackId = currentWeekPlanStampId();

  function openPlanPicker(meal: MealEntry) {
    if (!canAddToPlan || addingPlanDayKey) return;
    if (!diaryMealCanCopyToPlan(meal, completedIds)) {
      toast("Невыполненные приёмы нельзя добавить в план");
      return;
    }
    setPickerPlanId(
      diaryDefaultPlanId(planOptions, selectedPlanId),
    );
    setOpenId(null);
    setPlanMeals([meal]);
  }

  function togglePickDay(dayKey: string) {
    if (!canAddToPlan) return;
    setOpenId(null);
    setPickingDayKey((current) => {
      if (current === dayKey) {
        setPickedIds(new Set());
        return null;
      }
      setPickedIds(new Set());
      return dayKey;
    });
  }

  function togglePickedMeal(mealId: string) {
    const pool =
      pickingDayKey === FAVORITES_PICK_KEY
        ? filtered
        : (dayGroups.find((item) => item.dayKey === pickingDayKey)?.meals ??
          []);
    const meal =
      pool.find((item) => item.id === mealId) ??
      userMeals.find((item) => item.id === mealId);
    if (meal && !diaryMealCanCopyToPlan(meal, completedIds)) return;
    setPickedIds((current) => {
      const next = new Set(current);
      if (next.has(mealId)) next.delete(mealId);
      else next.add(mealId);
      return next;
    });
  }

  function openBulkPlanPicker() {
    if (!pickingDayKey) return;
    const pool =
      pickingDayKey === FAVORITES_PICK_KEY
        ? filtered
        : (dayGroups.find((item) => item.dayKey === pickingDayKey)?.meals ??
          []);
    const selected = pool.filter(
      (meal) =>
        pickedIds.has(meal.id) && diaryMealCanCopyToPlan(meal, completedIds),
    );
    if (selected.length === 0) {
      toast("Выберите приёмы");
      return;
    }
    setPickerPlanId(
      diaryDefaultPlanId(planOptions, selectedPlanId),
    );
    setOpenId(null);
    setPlanMeals(selected);
  }

  async function addMealsToPlan(
    selected: readonly MealEntry[],
    day: FeedPlanWeekDay,
    planId: string,
  ) {
    if (!canAddToPlan || !user || addingPlanDayKey || selected.length === 0)
      return;
    const fresh = diaryMealsFreshForPlanDay(
      selected,
      userMeals,
      day.date,
      planId,
      weekPlanFallbackId,
      completedIds,
    );
    if (fresh.length === 0) {
      const copyIds = [
        ...new Set(
          selected.flatMap((meal) =>
            diaryPlanCopiesOnDay(
              userMeals,
              diaryPlanSourceId(meal),
              day.date,
              planId,
              weekPlanFallbackId,
            ).map((copy) => copy.id),
          ),
        ),
      ];
      if (copyIds.length === 0) {
        toast("Эти приёмы уже в этом плане");
        return;
      }
      setAddingPlanDayKey(day.dayKey);
      try {
        for (const mealId of copyIds) {
          await deleteMyMeal(auth.transport, mealId);
        }
        queryClient.setQueryData<{ items: Array<{ id: string }> }>(
          mealsQueryKeys.forSubject(user.id),
          (current) =>
            current
              ? {
                  ...current,
                  items: current.items.filter((item) => !copyIds.includes(item.id)),
                }
              : current,
        );
        await queryClient.invalidateQueries({
          queryKey: mealsQueryKeys.forSubject(user.id),
        });
        toast.success("Убрано из плана");
        setPickingDayKey(null);
        setPickedIds(new Set());
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Не удалось убрать приём из плана",
        );
      } finally {
        setAddingPlanDayKey(null);
      }
      return;
    }
    setAddingPlanDayKey(day.dayKey);
    try {
      let stamps: Array<{
        id?: string;
        recordedAt?: string;
        at?: string;
        assumptions?: readonly string[];
      }> = userMeals;
      let added = 0;
      for (const meal of fresh) {
        if (
          diaryMealOnPlanDay(
            stamps,
            diaryPlanSourceId(meal),
            day.date,
            planId,
            weekPlanFallbackId,
          )
        ) {
          continue;
        }
        const photoSrc = preferredMealPhotoSrc(meal);
        const image = photoSrc ? await mealImageFromUrl(photoSrc) : null;
        const recorded = diaryMealStampOnDay(day.date, meal.at);
        const draft = diaryMealCreatePlanDraft(meal, planId, recorded);
        await createMyMeal(auth.transport, {
          ...draft,
          ...(image
            ? { imageBase64: image.base64, imageMime: image.mime }
            : {}),
        });
        stamps = [
          ...stamps,
          {
            recordedAt: recorded.toISOString(),
            assumptions: draft.assumptions,
          },
        ];
        added += 1;
      }
      await queryClient.invalidateQueries({
        queryKey: mealsQueryKeys.forSubject(user.id),
      });
      if (added === 0) {
        toast("Эти приёмы уже в этом плане");
      } else if (added === selected.length) {
        toast.success(`Добавлено в ${day.label.toLowerCase()}`);
      } else {
        toast.success(`Добавлено ${added} из ${selected.length}`);
      }
      setPickingDayKey(null);
      setPickedIds(new Set());
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось добавить приём в план",
      );
    } finally {
      setAddingPlanDayKey(null);
    }
  }

  const filtered = React.useMemo(() => {
    let list = filterDiaryMeals(userMeals, {
      tab,
      savedIds: saved,
      query,
      completedIds,
    });
    if (isOwnAccount && !readOnly) {
      const selectedIds = selectedPlanIds;
      list = list
        .filter((meal) => !skippedIds.has(meal.id))
        .map((meal) => ({
          ...meal,
          at: diaryAtForMeal(meal),
        }));
      if (tab !== "Избранное") {
        list = list.filter((meal) =>
          isDiaryFeedMealVisible(
            meal,
            selectedIds,
            completedIds,
            undefined,
            showWholePlan && selectedIds.size > 0,
          ),
        );
      }
    }
    if (periodFilter) {
      list = list.filter((meal) =>
        isMealInLocalDayRange(meal.at, periodFilter.from, periodFilter.to),
      );
    }
    list.sort((a, b) => b.at.localeCompare(a.at));
    return list;
  }, [
    userMeals,
    tab,
    query,
    periodFilter,
    showWholePlan,
    saved,
    completedIds,
    diaryAtById,
    skippedIds,
    isOwnAccount,
    readOnly,
    savedScope.userId,
    savedScope.email,
    selectedPlanKey,
  ]);

  const dayGroups = React.useMemo(
    () =>
      tab === "Избранное"
        ? []
        : groupMealsByDay(filtered).map((group) => ({
            ...group,
            meals: orderDiaryDayByPlanLayout(group.meals, diaryPlanSlotIndex),
            totals: sumDiaryDayStats(group.meals, completedIds),
          })),
    [
      completedIds,
      diaryAtById,
      filtered,
      savedScope.email,
      savedScope.userId,
      selectedPlanKey,
      tab,
    ],
  );
  const feedFiltersActive =
    tab !== "Все" || Boolean(query.trim()) || periodFilter != null;
  const showPlanChip = Boolean(
    isOwnAccount && !readOnly && selectedPlanIds.size > 0,
  );
  const visibleMealKey = filtered.map((meal) => meal.id).join("|");

  React.useEffect(() => {
    if (!pickingDayKey) return;
    if (tab === "Избранное") {
      if (pickingDayKey !== FAVORITES_PICK_KEY) {
        setPickingDayKey(null);
        setPickedIds(new Set());
      }
      return;
    }
    if (
      pickingDayKey === FAVORITES_PICK_KEY ||
      !dayGroups.some((group) => group.dayKey === pickingDayKey)
    ) {
      setPickingDayKey(null);
      setPickedIds(new Set());
    }
  }, [dayGroups, pickingDayKey, tab]);

  React.useEffect(() => {
    if (!onMealsViewed || body) return;
    if (typeof IntersectionObserver === "undefined") return;
    const rootEl = feedRootRef.current;
    if (!rootEl) return;
    const pending = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      timer = undefined;
      const ids = [...pending];
      pending.clear();
      if (ids.length) reportMealsViewedRef.current(ids);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const id of intersectingMealIds(entries)) pending.add(id);
        if (pending.size === 0) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(flush, 200);
      },
      {
        root: closestOverflowRoot(rootEl),
        rootMargin: "-8% 0px",
        threshold: 0.4,
      },
    );
    rootEl
      .querySelectorAll('[data-slot="meal-card"][data-meal-id]')
      .forEach((card) => {
        observer.observe(card);
      });
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [body, onMealsViewed, visibleMealKey]);

  React.useEffect(() => {
    if (!onMealsViewed || !openId || !isApiMealId(openId)) return;
    reportMealsViewed([openId]);
  }, [onMealsViewed, openId, reportMealsViewed]);

  function diaryMealCard(meal: MealEntry, dayKey?: string) {
    const pickLocked =
      Boolean(pickingDayKey) &&
      pickingDayKey === dayKey &&
      !diaryMealCanCopyToPlan(meal, completedIds);
    return (
      <MealCard
        key={meal.id}
        meal={meal}
        images={imagesForDiaryMeal(meal, mealGalleries)}
        saved={saved.has(meal.id)}
        completedIds={completedIds}
        readOnly={readOnly}
        showPlanState={tab !== "Избранное"}
        layout={cardLayout}
        picking={Boolean(pickingDayKey)}
        unread={Boolean(
          onMealsViewed &&
          meal.unread &&
          !isRationPlanPending(meal, completedIds) &&
          !viewedMealIds.has(meal.id),
        )}
        addingToPlan={
          Boolean(addingPlanDayKey) &&
          planMeals.some((item) => item.id === meal.id)
        }
        onAddToPlan={
          canAddToPlan &&
          !pickingDayKey &&
          diaryMealCanCopyToPlan(meal, completedIds)
            ? () => openPlanPicker(meal)
            : undefined
        }
        onOpen={() => setOpenId(meal.id)}
        selected={Boolean(pickingDayKey && pickedIds.has(meal.id))}
        className={pickLocked ? "opacity-45" : undefined}
        onToggleSave={() => {
          void toggleSave(meal.id, meal.title);
        }}
        onShare={() => {
          void shareMeal(meal);
        }}
        onDelete={
          isDiaryMealOnFutureDay(meal) ? undefined : () => setDeleteTarget(meal)
        }
      />
    );
  }

  const deletePrompt = deleteTarget
    ? mealCardDeletePrompt(deleteTarget, keepsWeeklyPlanOnDiaryDelete(deleteTarget))
    : null;

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
            <h1 className={noraPageTitleClass}>
              {heading?.title ?? "Мой дневник"}
            </h1>
            <GenerationSpendBadge spend={mealsQuery.data?.generationSpend} />
          </div>
          <p className={cn("mt-1.5", noraPageDescriptionClass)}>
            {heading?.description ?? "Записи о питании, привычках и прогрессе."}
          </p>
        </header>

        <div className="flex flex-col gap-5 max-md:mb-2.5">
          <section className="flex flex-col">
            <div className="relative z-10 flex w-full min-w-0 items-center pt-1">
              <div className={productFeedToolbarRowClass}>
                {toolbarStart}
                {toolbarExtra ? (
                  <div className={cn(diaryToolbarPillClass, "shrink-0 px-1.5")}>
                    {toolbarExtra}
                  </div>
                ) : null}
                {toolbarDisabled ? null : (
                  <div className="diary-toolbar-press flex min-w-0 flex-1 items-center gap-2">
                    {isOwnAccount && !readOnly && selectedPlanIds.size > 0 ? (
                      <button
                        aria-pressed={tab !== "Избранное" && showWholePlan}
                        className={cn(
                          diaryToolbarPillClass,
                          "nora-press-grow shrink-0 gap-1 px-3 text-[13px] font-normal leading-none text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)] data-active:text-[var(--nora-text)] [&>svg]:size-3.5",
                          "disabled:pointer-events-none disabled:text-[var(--nora-text-tertiary)] disabled:hover:text-[var(--nora-text-tertiary)]",
                        )}
                        data-active={tab !== "Избранное" && showWholePlan ? "" : undefined}
                        data-diary-whole-plan=""
                        disabled={tab === "Избранное"}
                        onClick={() => setShowWholePlan((current) => !current)}
                        type="button"
                      >
                        <LayersIcon
                          aria-hidden
                          className={cn(tab !== "Избранное" && showWholePlan && "fill-current")}
                          strokeWidth={1.75}
                        />
                        План
                      </button>
                    ) : null}
                    <button
                      aria-pressed={tab === "Избранное"}
                      className={cn(
                        diaryToolbarPillClass,
                        "nora-press-grow shrink-0 gap-1 px-3 text-[13px] font-normal leading-none text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)] data-active:text-[var(--nora-text)] [&>svg]:size-3.5",
                        searchOpen && showPlanChip && productToolbarSearchCollapseClass,
                      )}
                      data-active={tab === "Избранное" || undefined}
                      onClick={() => {
                        setTab(tab === "Избранное" ? "Все" : "Избранное");
                      }}
                      type="button"
                    >
                      <BookmarkIcon
                        aria-hidden
                        className={cn(tab === "Избранное" && "fill-current")}
                        strokeWidth={1.75}
                      />
                      Избранное
                    </button>
                    {SHOW_DIARY_WEEK_ACTIVITY ? (
                      <div
                        className={cn(diaryToolbarPillClass, "size-9 justify-center p-0")}
                      >
                        <button
                          aria-label="Статистика"
                          className={cn(
                            diaryToolbarIconButtonClass,
                            diaryToolbarChipClass,
                          )}
                          data-week-activity=""
                          onClick={() => setWeekStatsOpen(true)}
                          type="button"
                        >
                          <ChartNoAxesCombinedIcon
                            aria-hidden
                            className="size-4"
                            strokeWidth={1.75}
                          />
                        </button>
                      </div>
                    ) : null}
                    <DayActivityDialog
                      completedIds={completedIds}
                      dailyCalories={dailyCalories}
                      meals={weekMeals}
                      onOpenChange={setWeekStatsOpen}
                      open={weekStatsOpen}
                    />
                    <div
                      className={cn(
                        diaryToolbarPillClass,
                        searchOpen
                          ? "ml-auto min-w-0 flex-1 shrink px-1 md:flex-none md:w-[16rem] md:shrink-0"
                          : "ml-auto px-1",
                      )}
                      data-diary-search=""
                      data-search-open={searchOpen ? "" : undefined}
                    >
                      <div
                        className={cn(
                          "overflow-hidden transition-[width,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                          searchOpen
                            ? "max-md:w-0 max-md:opacity-0 w-9"
                            : "w-9",
                        )}
                      >
                        <DiaryPeriodPicker
                          disabled={searchOpen}
                          onFilterChange={setPeriodFilter}
                          periodStart={periodStart}
                          subjectKey={subjectId}
                        />
                      </div>
                      <span
                        aria-hidden
                        className={cn(
                          diaryToolbarPairDividerClass,
                          searchOpen && "max-md:hidden",
                        )}
                      />
                      <ProductToolbarSearch
                        expanded={searchOpen}
                        onExpandedChange={setSearchOpen}
                        onValueChange={setQuery}
                        value={query}
                      />
                    </div>
                    <div
                      className={cn(
                        diaryToolbarPillClass,
                        "size-9 justify-center p-0 md:hidden",
                      )}
                    >
                      <button
                        aria-label={
                          cardLayout === "list"
                            ? "Показать карточки сеткой"
                            : "Показать карточки списком"
                        }
                        aria-pressed={cardLayout === "list"}
                        className={cn(
                          diaryToolbarIconButtonClass,
                          cardLayout === "list" && "text-[var(--nora-text)]",
                        )}
                        data-diary-card-layout=""
                        onClick={() => {
                          const next = cardLayout === "list" ? "grid" : "list";
                          setCardLayout(next);
                          writeDiaryCardLayout(next);
                        }}
                        type="button"
                      >
                        {cardLayout === "list" ? (
                          <LayoutGridIcon aria-hidden strokeWidth={1.75} />
                        ) : (
                          <Rows2Icon aria-hidden strokeWidth={1.75} />
                        )}
                      </button>
                    </div>
                    {user?.role === "user" ? (
                      <button
                        className={cn(
                          diaryToolbarPillClass,
                          "nora-press-grow max-md:hidden gap-1 px-3 text-[13px] font-normal leading-none text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)] [&>svg]:size-3.5",
                        )}
                        type="button"
                        onClick={() => {
                          setOpenId(null);
                          setAddMealOpen(true);
                        }}
                      >
                        <CirclePlusIcon aria-hidden strokeWidth={1.75} />
                        Добавить
                      </button>
                    ) : null}
                  </div>
                )}
                {toolbarEnd ? (
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    {toolbarEnd}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {body ??
            (mealsQuery.isError ? (
              <ProductFeedEmpty
                action={
                  <NoraButton
                    variant="tinted"
                    onClick={() => {
                      void mealsQuery.refetch();
                    }}
                  >
                    Повторить
                  </NoraButton>
                }
                description="Проверьте соединение и попробуйте ещё раз."
                origin="diary"
                title="Не удалось загрузить дневник"
              />
            ) : mealsQuery.isPending ? (
              <SectionLoading label="Загрузка дневника" />
            ) : filtered.length === 0 && !feedFiltersActive ? (
              <ProductFeedEmpty
                description="Добавьте приём — он появится в этом разделе."
                origin="diary"
                title="В дневнике пока пусто"
              />
            ) : filtered.length === 0 &&
              tab === "Избранное" &&
              !query.trim() &&
              periodFilter == null ? (
              <ProductFeedEmpty
                description="Отметьте приём закладкой — он появится здесь."
                icon={<BookmarkIcon aria-hidden strokeWidth={1.75} />}
                title="В избранном пока пусто"
              />
            ) : filtered.length === 0 ? (
              <ProductFeedEmpty
                action={
                  <NoraButton
                    variant="tinted"
                    onClick={() => {
                      setQuery("");
                      setTab("Все");
                      setPeriodFilter(null);
                      setShowWholePlan(false);
                    }}
                  >
                    Сбросить
                  </NoraButton>
                }
                description="Смягчите поиск или сбросьте фильтры."
                icon={<SearchIcon aria-hidden strokeWidth={1.75} />}
                origin="diary"
                title="Ничего не найдено"
              />
            ) : (
              <div
                className={
                  tab === "Избранное" ? undefined : "flex flex-col gap-6"
                }
                ref={feedRootRef}
              >
                {tab === "Избранное" ? (
                  <section className="isolate flex flex-col gap-5">
                    {toolbarDisabled || !canAddToPlan ? null : (
                      <FeedFavoritesPickBar
                        mealCount={filtered.length}
                        onMove={openBulkPlanPicker}
                        onPick={() => togglePickDay(FAVORITES_PICK_KEY)}
                        pickedCount={
                          pickingDayKey === FAVORITES_PICK_KEY
                            ? pickedIds.size
                            : 0
                        }
                        picking={pickingDayKey === FAVORITES_PICK_KEY}
                      />
                    )}
                    <div
                      className={diaryFeedGridClass(cardLayout)}
                      onClickCapture={(event) => {
                        if (pickingDayKey !== FAVORITES_PICK_KEY) return;
                        const target = event.target;
                        if (!(target instanceof Element)) return;
                        const card = target.closest("[data-meal-id]");
                        const mealId =
                          card instanceof HTMLElement
                            ? card.dataset.mealId
                            : undefined;
                        if (!mealId) return;
                        event.preventDefault();
                        event.stopPropagation();
                        togglePickedMeal(mealId);
                      }}
                    >
                      {filtered.map((meal) =>
                        diaryMealCard(meal, FAVORITES_PICK_KEY),
                      )}
                    </div>
                  </section>
                ) : (
                  dayGroups.map((group) => (
                    <section
                      className={cn(
                        "isolate flex flex-col gap-5",
                        pickingDayKey &&
                          pickingDayKey !== group.dayKey &&
                          "opacity-45",
                      )}
                      key={group.dayKey}
                    >
                      {toolbarDisabled ? null : (
                        <FeedDayStats
                          dailyCalories={dailyCalories}
                          dayIso={group.dayIso}
                          meals={group.meals}
                          onMove={canAddToPlan ? openBulkPlanPicker : undefined}
                          onPickDay={
                            canAddToPlan
                              ? () => togglePickDay(group.dayKey)
                              : undefined
                          }
                          pickable={canAddToPlan}
                          pickedCount={
                            pickingDayKey === group.dayKey ? pickedIds.size : 0
                          }
                          picking={pickingDayKey === group.dayKey}
                          planMode={showWholePlan}
                          readOnly={readOnly}
                          savedScope={savedScope}
                          totals={group.totals}
                        />
                      )}
                      <div
                        className={cn(
                          diaryFeedGridClass(cardLayout),
                          pickingDayKey &&
                            pickingDayKey !== group.dayKey &&
                            "pointer-events-none",
                        )}
                        onClickCapture={(event) => {
                          if (pickingDayKey !== group.dayKey) return;
                          const target = event.target;
                          if (!(target instanceof Element)) return;
                          const card = target.closest("[data-meal-id]");
                          const mealId =
                            card instanceof HTMLElement
                              ? card.dataset.mealId
                              : undefined;
                          if (!mealId) return;
                          event.preventDefault();
                          event.stopPropagation();
                          togglePickedMeal(mealId);
                        }}
                      >
                        {group.meals.map((meal) =>
                          diaryMealCard(meal, group.dayKey),
                        )}
                      </div>
                    </section>
                  ))
                )}
              </div>
            ))}
        </div>
      </div>

      <Dialog
        disablePointerDismissal={mealDialogDismissLocked}
        open={!!openMeal}
        onOpenChange={(o) => {
          if (!o) {
            setOpenId(null);
            setOpenMacrosReveal({ rolling: false });
          }
        }}
      >
        <DialogContent
          className={MEAL_DIALOG_FRAME_CLASS}
          data-modal-frame="meal"
          showCloseButton={false}
        >
          {openMeal ? (
            <>
              <MealDialogHero
                macros={
                  <MealMacrosPlaque
                    meal={openMeal}
                    rolling={openMacrosReveal.rolling}
                    rollingKeys={openMacrosReveal.rollingKeys}
                  />
                }
                origin={mealCardOrigin(openMeal)}
                preview={
                  <Cover
                    key={openMeal.id}
                    meal={openMeal}
                    sizes="lg"
                    images={openMealImages}
                    className={cn(
                      MEAL_DIALOG_COVER_CLASS,
                      openMealPending &&
                        tab !== "Избранное" &&
                        RATION_PENDING_COVER_CLASS,
                    )}
                  />
                }
              />
              <MealOpenDetail
                meal={openMeal}
                completedIds={completedIds}
                previewOnly={isDiaryMealOnFutureDay(openMeal)}
                onCompletePlan={
                  tab === "Избранное" || !isDiaryMealOnCurrentDay(openMeal)
                    ? undefined
                    : () => toggleRationMealDone(openMeal.id)
                }
                onMacrosRevealChange={setOpenMacrosReveal}
                readOnly={readOnly}
                subjectUserId={subjectId}
                onCommitVersionGallery={({
                  mealId,
                  fromVersionId,
                  toVersionId,
                  toIndex,
                  extraSrc,
                }) => {
                  setMealGalleries((current) =>
                    commitMealVersionExtras(
                      current,
                      mealId,
                      fromVersionId,
                      toVersionId,
                      extraSrc,
                      toIndex,
                    ),
                  );
                }}
                onDemoPromoted={(demoId, apiMealId) => {
                  if (!subjectId) return;
                  setDiaryState(removeDemoMealFromDiary(subjectId, demoId));
                  setMealGalleries((current) => {
                    const extrasByVersion = current[demoId];
                    if (!extrasByVersion) return current;
                    const rest = { ...current };
                    delete rest[demoId];
                    return {
                      ...rest,
                      [apiMealId]: {
                        ...extrasByVersion,
                        ...(rest[apiMealId] ?? {}),
                      },
                    };
                  });
                  setOpenId(apiMealId);
                }}
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      <MealAddDraftDialog
        formedMeal={
          addFormedId
            ? userMeals.find((meal) => meal.id === addFormedId)
            : undefined
        }
        mealGalleries={mealGalleries}
        onCommitVersionGallery={({
          mealId,
          fromVersionId,
          toVersionId,
          toIndex,
          extraSrc,
        }) => {
          setMealGalleries((current) =>
            commitMealVersionExtras(
              current,
              mealId,
              fromVersionId,
              toVersionId,
              extraSrc,
              toIndex,
            ),
          );
        }}
        onCreated={(mealId) => {
          setAddFormedId(mealId);
          if (!subjectId) return;
          void queryClient.invalidateQueries({
            queryKey: mealsQueryKeys.forSubject(subjectId),
          });
        }}
        onOpenChange={(next) => {
          setAddMealOpen(next);
          if (!next) setAddFormedId(null);
        }}
        open={addMealOpen}
        subjectUserId={subjectId}
      />
      <DiaryPlanDayPicker
        addingDayKey={addingPlanDayKey}
        completedIds={completedIds}
        fallbackPlanId={weekPlanFallbackId}
        items={planMeals}
        meal={planMeals[0] ?? null}
        meals={userMeals}
        onCreatePlan={async ({ title, coverImage, description, dayCount }) => {
          const created = diaryCreatePlanFromMeals({
            coverImage,
            description,
            dayCount,
            meals: planMeals,
            title,
          });
          if (!created) return null;
          persistPlanLibrary(withAuthoredPlan(ownPlanLibrary, created));
          return created.id;
        }}
        onOpenChange={(next) => {
          if (!next) setPlanMeals([]);
        }}
        onPlanDayCount={(planId, dayCount) => {
          const existing = ownPlanLibrary.authoredPlans.find((item) => item.id === planId);
          if (!existing) return;
          persistPlanLibrary(withAuthoredPlan(ownPlanLibrary, { ...existing, dayCount }));
        }}
        onPlanIdChange={setPickerPlanId}
        onSelectDay={(day, planId) => {
          void addMealsToPlan(planMeals, day, planId);
        }}
        open={planMeals.length > 0}
        planId={pickerPlanId}
        plans={planOptions}
      />
      {dockMove && pickingDayKey
        ? createPortal(
            <button
              className={cn(
                DIARY_MOVE_PILL_CLASS,
                pickedIds.size > 0 &&
                  "!bg-[var(--nora-tint)] !text-white",
              )}
              disabled={pickedIds.size === 0 || Boolean(addingPlanDayKey)}
              onClick={openBulkPlanPicker}
              type="button"
            >
              <CirclePlusIcon
                aria-hidden
                className={
                  pickedIds.size === 0
                    ? "size-4 text-[var(--nora-text-tertiary)]"
                    : "size-4 text-white"
                }
                strokeWidth={1.75}
              />
              В рацион
            </button>,
            dockMove,
          )
        : null}
      <DeleteCardDialog
        confirmLabel={deletePrompt?.confirmLabel ?? "Удалить"}
        description={deletePrompt?.description ?? ""}
        onConfirm={() => {
          if (!deleteTarget || deletingCard) return;
          const meal = deleteTarget;
          setDeletingCard(true);
          void deleteMeal(meal).finally(() => {
            setDeletingCard(false);
            setDeleteTarget(null);
          });
        }}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        open={deleteTarget !== null}
        pending={deletingCard}
        title={deletePrompt?.title ?? "Удалить карточку?"}
      />
    </div>
  );
}
