import * as React from "react";
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  PlusIcon,
  XIcon,
} from "@/components/icons";
import { toast } from "@/components/ui/toast";

import { NoraInput, NoraTextarea } from "@/components/nora/primitives";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { mealsCountLabel, rationsCountLabel } from "./diary-feed";
import {
  DIARY_NEW_PLAN_ID,
  DIARY_NEW_PLAN_MAX_DAYS,
  DIARY_NEW_PLAN_MIN_DAYS,
  diaryDefaultPlanId,
  diaryNewPlanDayCount,
  diaryNewPlanDays,
  diaryNewPlanTitle,
  diaryPlanDayOccupancy,
  isDiaryNewPlanId,
  type DiaryPlanStamp,
  type DiaryWeekPlanOption,
} from "./diary-plan-import";
import { feedPlanWeekDays, type FeedPlanWeekDay } from "./feed-import";
import { PLAN_COVER_PLACEHOLDER_SRC, usableMealCover } from "./meal-cover";
import { MEAL_DIALOG_OVERLAY_CHIP_CLASS } from "./meal-sheet";
import type { MealEntry } from "./meals-catalog";
import { currentWeekPlanStampId } from "./ration-import";

const PLAN_DAY_PICKER_FRAME_CLASS = cn(
  "!flex flex-col gap-0 overflow-hidden bg-[var(--nora-modal)] p-0",
  "inset-x-0 bottom-0 top-auto h-auto max-h-[calc(100dvh-var(--modal-sheet-inset))] w-full max-w-none translate-x-0 translate-y-0 rounded-t-[var(--modal-sheet-radius)] rounded-b-none",
  "md:inset-auto md:top-1/2 md:left-1/2 md:bottom-auto md:h-auto md:max-h-[min(760px,calc(100vh-2rem))] md:w-[min(100%-2rem,480px)] md:max-w-[480px] md:rounded-[24px]",
);

/** Create card plus four plans fill the row; further plans scroll sideways. */
const PLAN_PICKER_CARD_CLASS =
  "nora-press-grow flex w-[calc((100%-2rem)/5)] shrink-0 flex-col gap-1.5 outline-none focus-visible:shadow-[var(--nora-shadow-focus)]";
const PLAN_PICKER_COVER_CLASS = "block aspect-square w-full rounded-[16px] p-0.5";
const PLAN_PICKER_TITLE_CLASS =
  "block w-full truncate text-center font-[family-name:var(--nora-font)] text-[13px] leading-4";
const PLAN_SCROLL_BUTTON_CLASS =
  "nora-press-grow absolute top-[calc((100cqw-2rem)/10-1rem)] z-10 flex size-8 items-center justify-center rounded-full bg-[var(--nora-panel)] text-[var(--nora-text)] shadow-[0_1px_4px_rgba(0,0,0,0.16)] outline-none focus-visible:shadow-[var(--nora-shadow-focus)] max-md:hidden";

function planScrollEdges(scroller: HTMLElement) {
  return {
    more: scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 4,
    back: scroller.scrollLeft > 4,
  };
}

const PLAN_DAY_ROW_CLASS = cn(
  "nora-press-grow ios-glass-glare-soft flex min-h-12 items-center gap-3 rounded-[14px] border-0 px-3.5 py-2.5 text-left",
  "bg-[var(--nora-inset)] text-[var(--nora-text-secondary)] outline-none",
  "hover:bg-[color-mix(in_srgb,var(--nora-inset)_88%,var(--nora-text)_6%)] hover:text-[var(--nora-text)]",
  "focus-visible:shadow-[var(--nora-shadow-focus)] disabled:cursor-default",
);

function planPickerDescription(
  selected: readonly MealEntry[],
  meal: MealEntry | null,
  bulk: boolean,
  creatingNew: boolean,
  lockedPlan: boolean,
) {
  const hint = lockedPlan
    ? "Можно поставить в другие дни этого плана."
    : creatingNew
      ? "Назовите план, добавьте дни и поставьте приём."
      : "Можно поставить в выбранный план, в один или несколько дней.";
  if (bulk) return `${mealsCountLabel(selected.length)} из дневника. ${hint}`;
  if (meal) return `${meal.title}. ${hint}`;
  return hint;
}

const PLAN_TITLE_FIELD_CLASS =
  "!h-10 !min-h-10 !max-h-10 rounded-[14px] bg-[var(--nora-inset)] px-3.5 font-[family-name:var(--nora-font)] !text-[13px] !font-normal !leading-5 text-[var(--nora-text)] placeholder:text-[var(--nora-text-tertiary)]";
const PLAN_DESC_FIELD_CLASS =
  "min-h-16 rounded-[14px] bg-[var(--nora-inset)] px-3.5 py-2.5 font-[family-name:var(--nora-font)] !text-[13px] !font-normal !leading-5 text-[var(--nora-text)] placeholder:text-[var(--nora-text-tertiary)]";

export function DiaryPlanDayPicker({
  addingDayKey,
  allowPendingCopies = false,
  completedIds,
  fallbackPlanId,
  items,
  lockedPlan = false,
  meal,
  meals,
  onCreatePlan,
  onOpenChange,
  onPlanDayCount,
  onPlanIdChange,
  onSelectDay,
  open,
  planDays,
  planId: planIdProp,
  plans,
}: {
  addingDayKey: string | null;
  allowPendingCopies?: boolean;
  completedIds?: ReadonlySet<string>;
  fallbackPlanId?: string;
  items?: readonly MealEntry[];
  lockedPlan?: boolean;
  meal: MealEntry | null;
  meals: readonly DiaryPlanStamp[];
  onCreatePlan?: (draft: {
    title: string;
    description: string;
    coverImage: string;
    dayCount: number;
  }) => Promise<string | null>;
  onOpenChange: (open: boolean) => void;
  onPlanDayCount?: (planId: string, dayCount: number) => void;
  onPlanIdChange?: (planId: string) => void;
  onSelectDay: (day: FeedPlanWeekDay, planId: string) => void;
  open: boolean;
  planDays?: readonly FeedPlanWeekDay[];
  planId?: string;
  plans: readonly DiaryWeekPlanOption[];
}) {
  const weekFallback = fallbackPlanId ?? currentWeekPlanStampId();
  const fallbackSelected = diaryDefaultPlanId(plans, planIdProp ?? null);
  const [localPlanId, setLocalPlanId] = React.useState(fallbackSelected);
  const [draftTitle, setDraftTitle] = React.useState("");
  const [draftDescription, setDraftDescription] = React.useState("");
  const [draftDayCount, setDraftDayCount] = React.useState(DIARY_NEW_PLAN_MIN_DAYS);
  const [sessionCreatedPlanId, setSessionCreatedPlanId] = React.useState<string | null>(
    null,
  );
  const [creating, setCreating] = React.useState(false);
  const [planScrollMore, setPlanScrollMore] = React.useState<boolean | null>(null);
  const [planScrollBack, setPlanScrollBack] = React.useState(false);
  const planScrollRef = React.useRef<HTMLDivElement>(null);
  const planRowOverflows = plans.length > 4;
  const planId = planIdProp ?? localPlanId;
  const creatingNew = !lockedPlan && isDiaryNewPlanId(planId);
  const usesDraftDays = creatingNew || planId === sessionCreatedPlanId;
  const weekDays = feedPlanWeekDays();
  const days = planDays
    ? planDays
    : usesDraftDays
      ? diaryNewPlanDays(weekDays, draftDayCount)
      : weekDays;
  const canAddDay = !lockedPlan && usesDraftDays && draftDayCount < DIARY_NEW_PLAN_MAX_DAYS;
  const selected = React.useMemo(
    () => items ?? (meal ? [meal] : []),
    [items, meal],
  );
  const bulk = selected.length > 1;
  const busy = Boolean(addingDayKey) || creating;
  const description = planPickerDescription(selected, meal, bulk, creatingNew, lockedPlan);
  const lockedTitle =
    plans.find((plan) => plan.id === planId)?.title ?? plans[0]?.title ?? "";
  const placedLabel = lockedPlan ? "уже в дне" : "уже в рационе";
  const occupancyPlanId = creatingNew ? DIARY_NEW_PLAN_ID : planId;

  React.useLayoutEffect(() => {
    const node = planScrollRef.current;
    if (!node || !open || lockedPlan) return;
    function syncPlanScroll() {
      const scroller = planScrollRef.current;
      if (!scroller || scroller.clientWidth === 0) return;
      const edges = planScrollEdges(scroller);
      setPlanScrollMore(edges.more);
      setPlanScrollBack(edges.back);
    }
    syncPlanScroll();
    const frame = requestAnimationFrame(syncPlanScroll);
    node.addEventListener("scroll", syncPlanScroll, { passive: true });
    const observer = new ResizeObserver(syncPlanScroll);
    observer.observe(node);
    for (const child of node.children) observer.observe(child);
    return () => {
      cancelAnimationFrame(frame);
      node.removeEventListener("scroll", syncPlanScroll);
      observer.disconnect();
    };
  }, [lockedPlan, open, plans]);

  React.useEffect(() => {
    if (!open) return;
    setDraftTitle(diaryNewPlanTitle("", selected));
    setDraftDescription("");
    setDraftDayCount(DIARY_NEW_PLAN_MIN_DAYS);
    setSessionCreatedPlanId(null);
    setCreating(false);
  }, [open, selected]);

  function scrollPlanCards(direction: -1 | 1) {
    const scroller = planScrollRef.current;
    const card = scroller?.querySelector("[data-diary-plan-card]");
    if (!scroller || !(card instanceof HTMLElement)) return;
    scroller.scrollBy({
      left: direction * (card.getBoundingClientRect().width + 8),
      behavior: "smooth",
    });
  }

  function setPlanId(next: string) {
    if (isDiaryNewPlanId(next)) {
      setDraftDayCount(DIARY_NEW_PLAN_MIN_DAYS);
      setSessionCreatedPlanId(null);
    }
    setLocalPlanId(next);
    onPlanIdChange?.(next);
  }

  async function handleSelectDay(day: FeedPlanWeekDay) {
    if (busy) return;
    let targetId = planId;
    if (creatingNew) {
      const title = diaryNewPlanTitle(draftTitle, selected);
      if (!title) {
        toast.error("Назовите план");
        return;
      }
      if (!onCreatePlan) {
        toast.error("Не удалось создать план");
        return;
      }
      setCreating(true);
      try {
        const createdId = await onCreatePlan({
          title,
          description: draftDescription,
          coverImage:
            selected.map((item) => usableMealCover(item.image)).find(Boolean) ?? "",
          dayCount: draftDayCount,
        });
        if (!createdId) {
          toast.error("Не удалось создать план");
          return;
        }
        setSessionCreatedPlanId(createdId);
        setPlanId(createdId);
        targetId = createdId;
      } finally {
        setCreating(false);
      }
    }
    onSelectDay(day, targetId);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={PLAN_DAY_PICKER_FRAME_CLASS}
        data-diary-plan-picker=""
        showCloseButton={false}
      >
        {selected.length > 0 ? (
          <>
            <div className="flex shrink-0 flex-col gap-2 px-2 pt-2">
              <DialogHeader className="min-w-0 gap-1 rounded-[16px] bg-[var(--nora-inset)] p-2.5 text-left">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--nora-text)] text-[var(--nora-modal)]">
                      <CalendarDaysIcon
                        aria-hidden
                        className="size-4"
                        strokeWidth={1.7}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <DialogTitle className="flex min-w-0 items-baseline gap-1.5 font-[family-name:var(--nora-font)] !text-[15px] !font-medium !leading-6 tracking-normal text-[var(--nora-text)]">
                        <span className="truncate">
                          {lockedPlan ? lockedTitle : "Добавить рацион"}
                        </span>
                        {lockedPlan ? null : (
                          <span
                            className="shrink-0 font-light text-[#707070]"
                            data-diary-plan-count=""
                          >
                            ({rationsCountLabel(plans.length)})
                          </span>
                        )}
                      </DialogTitle>
                      <DialogDescription className="sr-only">
                        {description}
                      </DialogDescription>
                    </div>
                  </div>
                  <DialogClose
                    aria-label="Закрыть"
                    className={cn(
                      MEAL_DIALOG_OVERLAY_CHIP_CLASS,
                      "nora-press-grow size-8 shrink-0 bg-[var(--nora-panel)]/80 sm:size-8",
                      "hover:text-[var(--nora-text)] focus-visible:shadow-[var(--nora-shadow-focus)]",
                    )}
                  >
                    <XIcon
                      aria-hidden
                      className="size-3.5"
                      strokeWidth={1.75}
                    />
                  </DialogClose>
                </div>
              </DialogHeader>
            </div>
              {!lockedPlan ? (
                <div className="mt-4 flex shrink-0 flex-col gap-2 px-3.5">
                  <div className="relative [container-type:inline-size]">
                  <div
                    aria-label="План назначения"
                    className="no-scrollbar -mx-3.5 flex gap-2 overflow-x-auto overscroll-x-contain px-3.5"
                    data-diary-plan-select=""
                    onScroll={(event) => {
                      const scroller = event.currentTarget;
                      if (scroller.clientWidth === 0) return;
                      const edges = planScrollEdges(scroller);
                      setPlanScrollMore((current) =>
                        current === edges.more ? current : edges.more,
                      );
                      setPlanScrollBack((current) =>
                        current === edges.back ? current : edges.back,
                      );
                    }}
                    ref={planScrollRef}
                    role="listbox"
                  >
                    {onCreatePlan ? (
                    <button
                      aria-label="Создать новый план"
                      aria-selected={creatingNew}
                      className={PLAN_PICKER_CARD_CLASS}
                      data-diary-plan-card="new"
                      disabled={busy}
                      onClick={() => setPlanId(DIARY_NEW_PLAN_ID)}
                      role="option"
                      type="button"
                    >
                      <span
                        className={cn(
                          PLAN_PICKER_COVER_CLASS,
                          creatingNew ? "bg-[var(--nora-tint)]" : "bg-transparent",
                        )}
                      >
                        <span className="flex size-full items-center justify-center rounded-[14px] bg-[var(--nora-inset)]">
                          <span className="flex size-8 items-center justify-center rounded-full bg-[var(--nora-tint)] text-white">
                            <PlusIcon
                              aria-hidden
                              className="size-4 text-white"
                              color="white"
                              strokeWidth={2}
                            />
                          </span>
                        </span>
                      </span>
                      <span
                        className={cn(
                          PLAN_PICKER_TITLE_CLASS,
                          creatingNew
                            ? "font-medium text-[var(--nora-text)]"
                            : "font-light text-[#707070]",
                        )}
                      >
                        Новый план
                      </span>
                    </button>
                    ) : null}
                    {plans.map((plan) => {
                      const selectedPlan = plan.id === planId && !creatingNew;
                      const cover =
                        usableMealCover(plan.image) || PLAN_COVER_PLACEHOLDER_SRC;
                      return (
                        <button
                          aria-label={plan.title}
                          aria-selected={selectedPlan}
                          className={PLAN_PICKER_CARD_CLASS}
                          data-diary-plan-card={plan.id}
                          disabled={busy}
                          key={plan.id}
                          onClick={() => setPlanId(plan.id)}
                          role="option"
                          type="button"
                        >
                          <span
                            className={cn(
                              PLAN_PICKER_COVER_CLASS,
                              selectedPlan ? "bg-[var(--nora-tint)]" : "bg-transparent",
                            )}
                          >
                            <img
                              alt=""
                              className={cn(
                                "size-full rounded-[14px] bg-[var(--nora-inset)] object-cover",
                                !selectedPlan && "grayscale",
                              )}
                              onError={(event) => {
                                const img = event.currentTarget;
                                if (img.dataset.coverFallback === "1") return;
                                img.dataset.coverFallback = "1";
                                img.src = PLAN_COVER_PLACEHOLDER_SRC;
                              }}
                              src={cover}
                            />
                          </span>
                          <span
                            className={cn(
                              PLAN_PICKER_TITLE_CLASS,
                              selectedPlan
                                ? "font-medium text-[var(--nora-text)]"
                                : "font-light text-[#707070]",
                            )}
                          >
                            {plan.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {planScrollBack ? (
                    <button
                      aria-label="Показать предыдущие планы"
                      className={cn(PLAN_SCROLL_BUTTON_CLASS, "left-0")}
                      data-diary-plan-scroll="back"
                      onClick={() => scrollPlanCards(-1)}
                      type="button"
                    >
                      <ChevronLeftIcon aria-hidden className="size-4" strokeWidth={2} />
                    </button>
                  ) : null}
                  {(planScrollMore ?? planRowOverflows) ? (
                    <button
                      aria-label="Показать ещё планы"
                      className={cn(PLAN_SCROLL_BUTTON_CLASS, "right-0")}
                      data-diary-plan-scroll=""
                      onClick={() => scrollPlanCards(1)}
                      type="button"
                    >
                      <ChevronRightIcon aria-hidden className="size-4" strokeWidth={2} />
                    </button>
                  ) : null}
                  </div>
                </div>
              ) : null}
            <div className="shrink-0 px-3.5 pt-4">
              <div
                aria-hidden
                className="border-t border-[var(--nora-divider)]"
                data-diary-plan-divider=""
              />
            </div>
            {creatingNew ? (
              <div
                className="flex shrink-0 flex-col gap-2.5 px-3.5 pt-4"
                data-diary-new-plan=""
              >
                <NoraInput
                  aria-label="Название"
                  className={PLAN_TITLE_FIELD_CLASS}
                  data-diary-plan-title=""
                  disabled={busy}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  placeholder="Например, Офис без срывов"
                  value={draftTitle}
                />
                <NoraTextarea
                  aria-label="Описание"
                  className={PLAN_DESC_FIELD_CLASS}
                  data-diary-plan-description=""
                  disabled={busy}
                  onChange={(event) => setDraftDescription(event.target.value)}
                  placeholder="Коротко, что в плане"
                  rows={3}
                  value={draftDescription}
                />
              </div>
            ) : null}
            {creatingNew ? (
              <div className="shrink-0 px-3.5 pt-4">
                <div
                  aria-hidden
                  className="border-t border-[var(--nora-divider)]"
                  data-diary-new-plan-divider=""
                />
              </div>
            ) : null}
            <div className="min-h-0 overflow-y-auto flex flex-col gap-2.5 px-3.5 pt-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-3.5 sm:pb-3.5">
              <div className="flex flex-col gap-2.5">
                {days.map((day) => {
                  const occupancy = diaryPlanDayOccupancy(
                    selected,
                    meals,
                    day.date,
                    occupancyPlanId,
                    weekFallback,
                    completedIds,
                    { allowPending: allowPendingCopies },
                  );
                  const already = occupancy.total > 0 && occupancy.fresh === 0;
                  const mixed = occupancy.already > 0 && occupancy.fresh > 0;
                  const dayBusy = addingDayKey === day.dayKey;
                  const marked = already || mixed;
                  const status = already
                    ? placedLabel
                    : mixed
                      ? `${occupancy.already} ${placedLabel}`
                      : "свободен";
                  return (
                    <button
                      className={PLAN_DAY_ROW_CLASS}
                      data-diary-plan-day={day.dayKey}
                      data-plan-state={
                        already ? "same" : mixed ? "mixed" : "free"
                      }
                      disabled={dayBusy || busy}
                      key={day.dayKey}
                      onClick={() => {
                        void handleSelectDay(day);
                      }}
                      type="button"
                    >
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                          marked
                            ? "border-[var(--nora-success)] bg-[var(--nora-panel)]"
                            : dayBusy
                              ? "border-[var(--nora-success)] bg-[var(--nora-success-dimmed)] text-[var(--nora-success)]"
                              : "border-[var(--nora-border-strong)] bg-[var(--nora-panel)]",
                        )}
                      >
                        {dayBusy ? (
                          <Loader2Icon className="size-3 animate-spin" />
                        ) : marked ? (
                          <span
                            aria-hidden
                            className="size-2 rounded-full bg-[var(--nora-success)]"
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text)]">
                        {day.label}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 font-[family-name:var(--nora-font)] text-[11px] leading-none",
                          marked
                            ? "bg-[var(--nora-success)] font-medium text-white"
                            : "bg-[var(--nora-panel)]/80 text-[var(--nora-text-tertiary)]",
                        )}
                      >
                        {dayBusy ? (already ? "убираем…" : "добавляем…") : status}
                      </span>
                    </button>
                  );
                })}
                {canAddDay ? (
                  <button
                    className={PLAN_DAY_ROW_CLASS}
                    data-diary-add-plan-day=""
                    disabled={busy}
                    onClick={() => {
                      const next = diaryNewPlanDayCount(draftDayCount + 1);
                      setDraftDayCount(next);
                      if (sessionCreatedPlanId) {
                        onPlanDayCount?.(sessionCreatedPlanId, next);
                      }
                    }}
                    type="button"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--nora-tint)] text-white">
                      <PlusIcon
                        aria-hidden
                        className="size-3.5 text-white"
                        color="white"
                        strokeWidth={2}
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text)]">
                      Добавить день
                    </span>
                  </button>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
