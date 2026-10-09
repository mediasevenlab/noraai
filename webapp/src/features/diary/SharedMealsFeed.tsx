import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SearchIcon } from "@/components/icons";
import { toast } from "@/components/ui/toast";
import type { ListMealsResponse } from "@web-app-demo/contracts";

import {
  ProductFeedEmpty,
  SectionLoading,
  type ProductCardOrigin,
} from "@/components/nora/product-sheet";
import { NoraButton } from "@/components/nora/primitives";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/features/auth";
import { snapshotFromPlanLibrary } from "@/platform/account-plan-library";
import {
  readAssignedPlans,
} from "@/platform/authored-plans";
import { readPlanLibrarySnapshot, withAuthoredPlan } from "@/platform/plan-library-local";

import { createMyMeal, deleteMyMeal, likeSharedMeal, shareMyMeal } from "./api";
import { DiaryPlanDayPicker } from "./DiaryPlanDayPicker";
import { type DiaryPeriodFilter } from "./DiaryPeriodPicker";
import {
  diaryCreatePlanFromMeals,
  diaryDefaultPlanId,
  diaryMealCreatePlanDraft,
  diaryMealOnPlanDay,
  diaryMealStampOnDay,
  diaryPlanCopiesOnDay,
  diaryPlanSourceId,
  diaryWeekPlanOptions,
} from "./diary-plan-import";
import {
  filterSharedMeals,
  orderByLikedAt,
  type FeedGoal,
} from "./feed-filters";
import type { FeedPlanWeekDay } from "./feed-import";
import { feedGridClass, type FeedCardLayout } from "./feed-card-layout";
import {
  appendFeedMealToMentorPlan,
  mentorWeekdayIndex,
} from "./feed-ration-clone";
import { mealImageFromUrl } from "./meal-image-pick";
import { preferredMealPhotoSrc } from "./meal-cover";
import type { MealEntry } from "./meals-catalog";
import { mealDtoToEntry } from "./merge-meals";
import { currentWeekPlanStampId, mealCardOrigin } from "./ration-import";
import {
  mealsQueryKeys,
  useMealsQuery,
  usePlanLibraryQuery,
  useSharedMealsQuery,
} from "./queries";
import { useSyncedPlanLibrary } from "./use-plan-library";
import {
  Cover,
  MealCard,
  MealMacrosPlaque,
  imagesForDiaryMeal,
} from "./MealCard";
import { MealOpenDetail } from "./MealOpenDetail";
import {
  MEAL_DIALOG_COVER_CLASS,
  MEAL_DIALOG_FRAME_CLASS,
  MealDialogHero,
  useMealDialogDismissLocked,
} from "./meal-sheet";
import type { MealMacrosRevealState } from "./meal-card-reveal";

const EMPTY_COMPLETED_IDS: ReadonlySet<string> = new Set();
const EMPTY_GALLERIES: Record<string, Record<string, string[]>> = {};

function patchSharedLike(
  previous: ListMealsResponse | undefined,
  mealId: string,
  liked: boolean,
): ListMealsResponse | undefined {
  if (!previous) return previous;
  return {
    items: previous.items.map((item) => {
      if (item.id !== mealId) return item;
      let likeCount = item.likeCount;
      if (liked && !item.liked) likeCount += 1;
      if (!liked && item.liked) likeCount = Math.max(0, likeCount - 1);
      return {
        ...item,
        liked,
        likeCount,
        ...(liked ? { likedAt: new Date().toISOString() } : { likedAt: undefined }),
      };
    }),
  };
}

export function SharedMealsFeed({
  query = "",
  origin = "feed",
  likedOnly = false,
  goal = null,
  layout = "grid",
  period = null,
}: {
  query?: string;
  origin?: ProductCardOrigin;
  likedOnly?: boolean;
  goal?: FeedGoal | null;
  layout?: FeedCardLayout;
  period?: DiaryPeriodFilter | null;
}) {
  const auth = useAuth();
  const mealDialogDismissLocked = useMealDialogDismissLocked();
  const queryClient = useQueryClient();
  const mealsQuery = useSharedMealsQuery();
  const keepsOwnMeals =
    auth.user?.role === "user" || auth.user?.role === "mentor";
  const isMentor = auth.user?.role === "mentor";
  const subjectId = keepsOwnMeals ? auth.user?.id : undefined;
  const mentorPlansQuery = useQuery({
    queryKey: ["session", "mentor", "plans"] as const,
    enabled: Boolean(isMentor && auth.user),
    queryFn: async () => {
      const api = await import("@/features/mentor/api");
      return api.listMentorPlans(auth.transport);
    },
  });
  const diaryQuery = useMealsQuery(subjectId);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [planMeal, setPlanMeal] = React.useState<MealEntry | null>(null);
  const [pickerPlanId, setPickerPlanId] = React.useState("");
  const [addingDayKey, setAddingDayKey] = React.useState<string | null>(null);
  const [openMacrosReveal, setOpenMacrosReveal] =
    React.useState<MealMacrosRevealState>({
      rolling: false,
    });
  const meals = React.useMemo(
    () => (mealsQuery.data?.items ?? []).map(mealDtoToEntry),
    [mealsQuery.data?.items],
  );
  const diaryMeals = React.useMemo(
    () => (diaryQuery.data?.items ?? []).map(mealDtoToEntry),
    [diaryQuery.data?.items],
  );
  const planLibraryQuery = usePlanLibraryQuery(auth.user?.role === "user");
  const { persist: persistPlanLibrary, snapshot: ownPlanLibrary } =
    useSyncedPlanLibrary(auth.user?.role === "user");
  const visible = React.useMemo(() => {
    const filtered = filterSharedMeals(meals, { likedOnly, goal, query, period });
    return likedOnly ? orderByLikedAt(filtered) : filtered;
  }, [meals, likedOnly, goal, query, period]);
  const filtersActive = likedOnly || Boolean(query.trim()) || goal != null || period != null;
  const openMeal = openId
    ? (meals.find((meal) => meal.id === openId) ?? null)
    : null;
  const openMealImages = openMeal
    ? imagesForDiaryMeal(openMeal, EMPTY_GALLERIES)
    : [];
  const likeMutation = useMutation({
    mutationFn: ({ mealId, liked }: { mealId: string; liked: boolean }) =>
      likeSharedMeal(auth.transport, mealId, { liked }),
    onMutate: async ({ mealId, liked }) => {
      await queryClient.cancelQueries({ queryKey: mealsQueryKeys.shared() });
      const previous = queryClient.getQueryData<ListMealsResponse>(
        mealsQueryKeys.shared(),
      );
      queryClient.setQueryData(
        mealsQueryKeys.shared(),
        patchSharedLike(previous, mealId, liked),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(mealsQueryKeys.shared(), context.previous);
      }
      toast.error(
        error instanceof Error ? error.message : "Не удалось поставить лайк",
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: mealsQueryKeys.shared() });
    },
  });

  function toggleLike(meal: MealEntry) {
    likeMutation.mutate({ mealId: meal.id, liked: !meal.liked });
  }

  async function toggleShare(meal: MealEntry) {
    if (!auth.user || meal.userId !== auth.user.id) return;
    const nextShared = !meal.shared;
    try {
      await shareMyMeal(auth.transport, meal.id, { shared: nextShared });
      await queryClient.invalidateQueries({ queryKey: mealsQueryKeys.shared() });
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

  const savedScope = { userId: auth.user?.id ?? subjectId ?? "guest", email: auth.user?.email };
  const planLibrary = planLibraryQuery.data
    ? snapshotFromPlanLibrary(planLibraryQuery.data)
    : readPlanLibrarySnapshot(savedScope);
  const planOptions = diaryWeekPlanOptions([
    ...planLibrary.authoredPlans,
    ...readAssignedPlans(savedScope),
  ]);
  const weekPlanFallbackId = currentWeekPlanStampId();
  const mentorPlanOptions = (mentorPlansQuery.data?.items ?? []).map((plan) => ({
    id: plan.id,
    title: plan.title,
    ...(plan.image ? { image: plan.image } : {}),
  }));
  const visiblePlanOptions = isMentor ? mentorPlanOptions : planOptions;
  const canAddToPlan = auth.user?.role === "user" || isMentor;

  function openPlanPicker(meal: MealEntry) {
    if (!canAddToPlan) {
      toast("Добавить приём в план можно из своего аккаунта");
      return;
    }
    if (isMentor && mentorPlanOptions.length === 0) {
      toast("Сначала создайте рацион");
      return;
    }
    if (addingDayKey) return;
    setPickerPlanId(
      isMentor
        ? (mentorPlanOptions[0]?.id ?? "")
        : diaryDefaultPlanId(planOptions, planLibrary.selectedPlanIds[0] ?? null),
    );
    setOpenId(null);
    setPlanMeal(meal);
  }

  async function addMealToMentorPlan(
    meal: MealEntry,
    day: FeedPlanWeekDay,
    planId: string,
  ) {
    const plan = mentorPlansQuery.data?.items.find((item) => item.id === planId);
    if (!plan || !auth.user) {
      toast.error("Рацион не найден");
      return;
    }
    const photo = preferredMealPhotoSrc(meal);
    const next = appendFeedMealToMentorPlan(
      {
        title: plan.title,
        description: plan.description,
        goal: plan.goal,
        image: plan.image,
        meals: plan.meals.map((item) => ({
          slot: item.slot,
          title: item.title,
          ingredients: item.ingredients,
          steps: item.steps,
          image: item.image,
          kcal: item.kcal,
          protein: item.protein,
          fat: item.fat,
          carbs: item.carbs,
          ...(item.dayIndex != null ? { dayIndex: item.dayIndex } : {}),
        })),
      },
      {
        carbs: meal.carbs,
        fat: meal.fat,
        image: photo ?? "",
        ingredients: meal.ingredients,
        kcal: meal.kcal,
        meal: meal.meal,
        protein: meal.protein,
        title: meal.title,
      },
      mentorWeekdayIndex(day.date),
    );
    if (!next.ok) {
      toast(
        next.reason === "duplicate"
          ? "Этот приём уже стоит в выбранный день"
          : "В рационе уже 80 приёмов",
      );
      return;
    }
    setAddingDayKey(day.dayKey);
    try {
      const api = await import("@/features/mentor/api");
      await api.updateMentorPlan(auth.transport, planId, next.body);
      await queryClient.invalidateQueries({
        queryKey: ["session", "mentor", "plans"],
      });
      toast.success(`Добавлено в ${day.label.toLowerCase()}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось добавить приём в рацион",
      );
    } finally {
      setAddingDayKey(null);
    }
  }

  async function addMealToPlan(
    meal: MealEntry,
    day: FeedPlanWeekDay,
    planId: string,
  ) {
    if (!canAddToPlan || !auth.user || addingDayKey) return;
    if (isMentor) {
      await addMealToMentorPlan(meal, day, planId);
      return;
    }
    const sourceId = diaryPlanSourceId(meal);
    if (
      diaryMealOnPlanDay(
        diaryMeals,
        sourceId,
        day.date,
        planId,
        weekPlanFallbackId,
      )
    ) {
      const copies = diaryPlanCopiesOnDay(
        diaryMeals,
        sourceId,
        day.date,
        planId,
        weekPlanFallbackId,
      );
      if (copies.length === 0) {
        toast("Этот приём уже стоит в выбранный день");
        return;
      }
      setAddingDayKey(day.dayKey);
      try {
        for (const copy of copies) {
          await deleteMyMeal(auth.transport, copy.id);
        }
        await queryClient.invalidateQueries({
          queryKey: mealsQueryKeys.forSubject(auth.user.id),
        });
        toast.success("Убрано из плана");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Не удалось убрать приём из плана",
        );
      } finally {
        setAddingDayKey(null);
      }
      return;
    }
    setAddingDayKey(day.dayKey);
    try {
      const photoSrc = preferredMealPhotoSrc(meal);
      const image = photoSrc ? await mealImageFromUrl(photoSrc) : null;
      const recorded = diaryMealStampOnDay(day.date, meal.at);
      await createMyMeal(auth.transport, {
        ...diaryMealCreatePlanDraft(meal, planId, recorded),
        ...(image ? { imageBase64: image.base64, imageMime: image.mime } : {}),
      });
      await queryClient.invalidateQueries({
        queryKey: mealsQueryKeys.forSubject(auth.user.id),
      });
      toast.success(`Добавлено в ${day.label.toLowerCase()}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось добавить приём в план",
      );
    } finally {
      setAddingDayKey(null);
    }
  }

  if (mealsQuery.isError) {
    return (
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
        origin={origin}
        title="Не удалось загрузить ленту"
      />
    );
  }

  if (mealsQuery.isLoading) {
    return <SectionLoading label="Загрузка ленты" />;
  }

  if (meals.length === 0 && !filtersActive) {
    return (
      <ProductFeedEmpty
        description="Опубликованные приёмы появятся здесь."
        origin={origin}
        title="В ленте пока пусто"
      />
    );
  }

  if (visible.length === 0) {
    const likesEmpty = likedOnly && !query.trim() && goal == null && period == null;
    return (
      <ProductFeedEmpty
        description={
          likesEmpty
            ? "Лайкните приём в ленте — он появится в этой капсуле."
            : period
              ? "В этом периоде пока нет опубликованных приёмов."
            : goal
              ? "В этом калорийном интервале пока нет опубликованных приёмов."
              : "Смягчите поиск — в ленте остаются только опубликованные приёмы."
        }
        icon={<SearchIcon aria-hidden strokeWidth={1.75} />}
        origin={origin}
        title={likesEmpty ? "Пока нет лайков" : "Ничего не найдено"}
      />
    );
  }

  return (
    <>
      <section className={feedGridClass(layout)}>
        {visible.map((meal) => (
          <MealCard
            completedIds={EMPTY_COMPLETED_IDS}
            images={imagesForDiaryMeal(meal, EMPTY_GALLERIES)}
            saved={false}
            key={meal.id}
            layout={layout}
            meal={meal}
            onOpen={() => setOpenId(meal.id)}
            allowShare={meal.userId === auth.user?.id}
            onShare={() => {
              void toggleShare(meal);
            }}
            onToggleLike={() => toggleLike(meal)}
            onToggleSave={() => undefined}
            onAddToPlan={canAddToPlan ? () => openPlanPicker(meal) : undefined}
            addingToPlan={Boolean(addingDayKey) && planMeal?.id === meal.id}
            readOnly
            showSave={false}
            showPlanState={false}
            variant="feed"
          />
        ))}
      </section>
      <Dialog
        disablePointerDismissal={mealDialogDismissLocked}
        open={!!openMeal}
        onOpenChange={(open) => {
          if (!open) {
            setOpenId(null);
            setOpenMacrosReveal({ rolling: false });
          }
        }}
      >
        <DialogContent
          className={MEAL_DIALOG_FRAME_CLASS}
          data-modal-frame="meal"
          data-phone-full=""
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
                    className={MEAL_DIALOG_COVER_CLASS}
                    images={openMealImages}
                    key={openMeal.id}
                    meal={openMeal}
                    sizes="lg"
                  />
                }
              />
              <MealOpenDetail
                feedView
                meal={openMeal}
                onMacrosRevealChange={setOpenMacrosReveal}
                onToggleLike={() => toggleLike(openMeal)}
                readOnly
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      <DiaryPlanDayPicker
        addingDayKey={addingDayKey}
        fallbackPlanId={isMentor ? mentorPlanOptions[0]?.id : weekPlanFallbackId}
        meal={planMeal}
        meals={isMentor ? [] : diaryMeals}
        onCreatePlan={
          isMentor
            ? undefined
            : async ({ title, coverImage, description, dayCount }) => {
          const created = diaryCreatePlanFromMeals({
            coverImage,
            description,
            dayCount,
            meals: planMeal ? [planMeal] : [],
            title,
          });
          if (!created) return null;
          persistPlanLibrary(withAuthoredPlan(ownPlanLibrary, created));
          return created.id;
        }}
        onOpenChange={(next) => {
          if (!next && !addingDayKey) setPlanMeal(null);
        }}
        onPlanDayCount={(planId, dayCount) => {
          const existing = ownPlanLibrary.authoredPlans.find((item) => item.id === planId);
          if (!existing) return;
          persistPlanLibrary(withAuthoredPlan(ownPlanLibrary, { ...existing, dayCount }));
        }}
        onPlanIdChange={setPickerPlanId}
        onSelectDay={(day, planId) => {
          if (planMeal) void addMealToPlan(planMeal, day, planId);
        }}
        open={!!planMeal}
        planId={pickerPlanId}
        plans={visiblePlanOptions}
      />
    </>
  );
}
