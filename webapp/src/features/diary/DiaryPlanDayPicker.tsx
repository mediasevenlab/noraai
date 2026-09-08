import * as React from "react";
import { CalendarDaysIcon, Loader2Icon, XIcon } from "lucide-react";

import { NoraSelect } from "@/components/nora/primitives";
import {
  productToolbarSelectContentClass,
  productToolbarSelectItemClass,
} from "@/components/nora/product-sheet";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { mealsCountLabel } from "./diary-feed";
import {
  diaryDefaultPlanId,
  diaryPlanDayOccupancy,
  type DiaryPlanStamp,
  type DiaryWeekPlanOption,
} from "./diary-plan-import";
import { feedPlanWeekDays, type FeedPlanWeekDay } from "./feed-import";
import { MealDetailHeading, MEAL_DIALOG_OVERLAY_CHIP_CLASS } from "./meal-sheet";
import type { MealEntry } from "./meals-catalog";
import { currentWeekPlanStampId } from "./ration-import";

const PLAN_DAY_PICKER_FRAME_CLASS = cn(
  "flex flex-col gap-0 overflow-hidden bg-[var(--nora-modal)] p-0",
  "inset-x-0 top-[var(--modal-sheet-inset)] bottom-0 h-[calc(100dvh-var(--modal-sheet-inset))] max-h-[calc(100dvh-var(--modal-sheet-inset))] w-full max-w-none translate-x-0 translate-y-0 rounded-t-[var(--modal-sheet-radius)] rounded-b-none",
  "md:inset-auto md:top-1/2 md:left-1/2 md:h-auto md:max-h-[min(760px,calc(100vh-2rem))] md:w-[min(100%-2rem,480px)] md:max-w-[480px] md:rounded-[24px]",
);

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
) {
  const hint = "Можно поставить в выбранный план, в один или несколько дней.";
  if (bulk) return `${mealsCountLabel(selected.length)} из дневника. ${hint}`;
  if (meal) return `${meal.title}. ${hint}`;
  return hint;
}

export function DiaryPlanDayPicker({
  addingDayKey,
  completedIds,
  fallbackPlanId,
  items,
  meal,
  meals,
  onOpenChange,
  onPlanIdChange,
  onSelectDay,
  open,
  planId: planIdProp,
  plans,
}: {
  addingDayKey: string | null;
  completedIds?: ReadonlySet<string>;
  fallbackPlanId?: string;
  items?: readonly MealEntry[];
  meal: MealEntry | null;
  meals: readonly DiaryPlanStamp[];
  onOpenChange: (open: boolean) => void;
  onPlanIdChange?: (planId: string) => void;
  onSelectDay: (day: FeedPlanWeekDay, planId: string) => void;
  open: boolean;
  planId?: string;
  plans: readonly DiaryWeekPlanOption[];
}) {
  const weekFallback = fallbackPlanId ?? currentWeekPlanStampId();
  const fallbackSelected = diaryDefaultPlanId(plans, planIdProp ?? null);
  const [localPlanId, setLocalPlanId] = React.useState(fallbackSelected);
  const planId = planIdProp ?? localPlanId;
  const planItems = plans.map((plan) => ({
    value: plan.id,
    label: plan.title,
  }));
  const days = feedPlanWeekDays();
  const selected = items ?? (meal ? [meal] : []);
  const bulk = selected.length > 1;
  const busy = Boolean(addingDayKey);
  const description = planPickerDescription(selected, meal, bulk);

  function setPlanId(next: string) {
    setLocalPlanId(next);
    onPlanIdChange?.(next);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={PLAN_DAY_PICKER_FRAME_CLASS}
        data-diary-plan-picker=""
        data-modal-frame="meal"
        showCloseButton={false}
      >
        {selected.length > 0 ? (
          <>
            <div className="shrink-0 px-2 pt-2">
              <DialogHeader className="min-w-0 gap-1 rounded-[16px] bg-[var(--nora-inset)] p-2.5 text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--nora-text)] text-[var(--nora-modal)]">
                    <CalendarDaysIcon
                      aria-hidden
                      className="size-4"
                      strokeWidth={1.7}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="font-[family-name:var(--nora-font)] !text-[15px] !font-medium !leading-6 tracking-normal text-[var(--nora-text)]">
                      Добавить в план
                    </DialogTitle>
                    <DialogDescription className="mt-0.5 line-clamp-2 font-[family-name:var(--nora-font)] text-[12px] font-light leading-5 text-[var(--nora-text-tertiary)]">
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
              <div
                className="mt-2.5 border-t border-[var(--nora-divider)] pt-2.5"
                data-diary-plan-select=""
              >
                <MealDetailHeading>План назначения</MealDetailHeading>
                <NoraSelect
                  className="mt-2 !h-10 !min-h-10 !max-h-10 rounded-[12px] bg-[var(--nora-panel)] px-3.5 text-[13px] font-normal leading-5"
                  contentClassName={productToolbarSelectContentClass}
                  disabled={busy}
                  itemClassName={productToolbarSelectItemClass}
                  items={planItems}
                  onValueChange={(value) => {
                    if (value) setPlanId(value);
                  }}
                  placeholder="План"
                  value={planId}
                />
              </div>
              </DialogHeader>
            </div>
            <div className="flex flex-col px-3 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-3.5">
              <div className="flex flex-col gap-2.5">
                {days.map((day) => {
                  const occupancy = diaryPlanDayOccupancy(
                    selected,
                    meals,
                    day.date,
                    planId,
                    weekFallback,
                    completedIds,
                  );
                  const already = occupancy.total > 0 && occupancy.fresh === 0;
                  const mixed = occupancy.already > 0 && occupancy.fresh > 0;
                  const dayBusy = addingDayKey === day.dayKey;
                  const marked = already || mixed;
                  const status = already
                    ? "уже в плане"
                    : mixed
                      ? `${occupancy.already} уже в плане`
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
                      onClick={() => onSelectDay(day, planId)}
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
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
