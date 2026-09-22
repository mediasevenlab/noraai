import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import { toast } from "sonner";
import type { ListMealsResponse } from "@web-app-demo/contracts";

import {
  ProductFeedEmpty,
  ProductFeedSkeletonSlots,
  type ProductCardOrigin,
} from "@/components/nora/product-sheet";
import { NoraButton } from "@/components/nora/primitives";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/features/auth";
import { putUserFavorites } from "@/platform/account-favorites";
import { snapshotFromPlanLibrary } from "@/platform/account-plan-library";
import {
  readAssignedPlans,
} from "@/platform/authored-plans";
import { notifyHybridFavoriteAdded } from "@/platform/hybrid-notifications";
import { readPlanLibrarySnapshot, withAuthoredPlan } from "@/platform/plan-library-local";
import { mergeFavoriteIds } from "@/platform/saved-ids";

import { createMyMeal, deleteMyMeal, likeSharedMeal } from "./api";
import {
  apiMealIdForCatalogPreview,
  catalogFavoriteCreateDraft,
} from "./catalog-favorite";
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
  type FeedGoal,
} from "./feed-filters";
import type { FeedPlanWeekDay } from "./feed-import";
import { feedGridClass, type FeedCardLayout } from "./feed-card-layout";
import { mealImageFromUrl } from "./meal-image-pick";
import { preferredMealPhotoSrc } from "./meal-cover";
import type { MealEntry } from "./meals-catalog";
import { mealDtoToEntry } from "./merge-meals";
import { readSavedMealIds, writeSavedMealIds } from "./diary-assignments";
import {
  favoriteMealIdsForSync,
  reconcileLocalFavoriteIds,
} from "./diary-feed";
import { currentWeekPlanStampId, mealCardOrigin } from "./ration-import";
import {
  favoritesQueryKeys,
  mealsQueryKeys,
  useMealsQuery,
  usePlanLibraryQuery,
  useSharedMealsQuery,
  useUserFavoritesQuery,
} from "./queries";
import { useSyncedPlanLibrary } from "./use-plan-library";
import {
  Cover,
  MealCard,
  MealMacrosPlaque,
  SkeletonMealCard,
  imagesForDiaryMeal,
} from "./MealCard";
import { MealOpenDetail } from "./MealOpenDetail";
import {
  MEAL_DIALOG_COVER_CLASS,
  MEAL_DIALOG_FRAME_CLASS,
  MealDialogHero,
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
      return { ...item, liked, likeCount };
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
  const queryClient = useQueryClient();
  const mealsQuery = useSharedMealsQuery();
  const subjectId = auth.user?.role === "user" ? auth.user.id : undefined;
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
  const favoritesQuery = useUserFavoritesQuery(Boolean(subjectId && auth.user));
  const planLibraryQuery = usePlanLibraryQuery(auth.user?.role === "user");
  const { persist: persistPlanLibrary, snapshot: ownPlanLibrary } =
    useSyncedPlanLibrary(auth.user?.role === "user");
  const [saved, setSaved] = React.useState(() => new Set<string>());
  const visible = React.useMemo(
    () => filterSharedMeals(meals, { likedOnly, goal, query, period }),
    [meals, likedOnly, goal, query, period],
  );
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

  React.useEffect(() => {
    if (!subjectId || !auth.user) {
      setSaved(new Set());
      return;
    }
    const scope = { userId: subjectId, email: auth.user.email };
    if (!favoritesQuery.data) {
      setSaved(readSavedMealIds(scope));
      return;
    }
    const local = readSavedMealIds(scope);
    const merged = mergeFavoriteIds(favoritesQuery.data.mealIds, local);
    const next = new Set(merged);
    setSaved(next);
    writeSavedMealIds(scope, next);
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
          writeSavedMealIds(scope, reconciled);
        })
        .catch(() => {
          // Keep local bookmarks; a later visit retries quietly.
        });
    }
  }, [auth.transport, auth.user, favoritesQuery.data, queryClient, subjectId]);

  function feedMealSaved(meal: MealEntry) {
    if (saved.has(meal.id)) return true;
    const copyId = apiMealIdForCatalogPreview(meal.id, diaryMeals);
    return Boolean(copyId && saved.has(copyId));
  }

  async function persistFavoriteIds(next: Set<string>) {
    if (!subjectId || !auth.user) return false;
    const scope = { userId: subjectId, email: auth.user.email };
    setSaved(next);
    writeSavedMealIds(scope, next);
    try {
      const remote = await putUserFavorites(auth.transport, {
        mealIds: favoriteMealIdsForSync(next),
      });
      queryClient.setQueryData(favoritesQueryKeys.forUser(subjectId), remote);
      const reconciled = reconcileLocalFavoriteIds(next, remote.mealIds);
      setSaved(reconciled);
      writeSavedMealIds(scope, reconciled);
      return true;
    } catch {
      toast.error("Не удалось сохранить избранное", {
        id: "favorites-save-failed",
      });
      return false;
    }
  }

  async function toggleSave(meal: MealEntry) {
    if (!subjectId || !auth.user) {
      toast("Сохранить приём можно из аккаунта пользователя");
      return;
    }
    const copyId = apiMealIdForCatalogPreview(meal.id, diaryMeals);
    if (feedMealSaved(meal)) {
      const next = new Set(saved);
      next.delete(meal.id);
      if (copyId) next.delete(copyId);
      const ok = await persistFavoriteIds(next);
      if (ok) toast("Убрано из избранного", { id: "favorite-removed" });
      return;
    }
    try {
      let ownedId = copyId;
      if (!ownedId) {
        const photoSrc = preferredMealPhotoSrc(meal);
        const image = photoSrc ? await mealImageFromUrl(photoSrc) : null;
        const created = await createMyMeal(auth.transport, {
          ...catalogFavoriteCreateDraft(meal),
          ...(image
            ? { imageBase64: image.base64, imageMime: image.mime }
            : {}),
        });
        ownedId = created.meal.id;
        await queryClient.invalidateQueries({
          queryKey: mealsQueryKeys.forSubject(subjectId),
        });
      }
      const next = new Set(saved);
      next.add(ownedId);
      const ok = await persistFavoriteIds(next);
      if (!ok) return;
      toast.success("Добавлено в избранное", { id: "favorite-added" });
      void notifyHybridFavoriteAdded(meal.title);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось добавить в избранное",
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
  const canAddToPlan = auth.user?.role === "user";

  function openPlanPicker(meal: MealEntry) {
    if (!canAddToPlan) {
      toast("Добавить приём в план можно из аккаунта пользователя");
      return;
    }
    if (addingDayKey) return;
    setPickerPlanId(
      diaryDefaultPlanId(planOptions, planLibrary.selectedPlanIds[0] ?? null),
    );
    setOpenId(null);
    setPlanMeal(meal);
  }

  async function addMealToPlan(
    meal: MealEntry,
    day: FeedPlanWeekDay,
    planId: string,
  ) {
    if (!canAddToPlan || !auth.user || addingDayKey) return;
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

  if (mealsQuery.isLoading || (meals.length === 0 && !filtersActive)) {
    return (
      <ProductFeedSkeletonSlots
        className={layout === "list" ? "max-md:grid-cols-1" : undefined}
        Card={() => (
          <SkeletonMealCard
            className={layout === "list" ? "max-md:min-h-[155px]" : "max-md:min-h-[327px]"}
            layout={layout}
          />
        )}
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
            key={meal.id}
            layout={layout}
            meal={meal}
            onDelete={() => undefined}
            onOpen={() => setOpenId(meal.id)}
            onShare={() => undefined}
            onToggleLike={() => toggleLike(meal)}
            onToggleSave={() => {
              void toggleSave(meal);
            }}
            onAddToPlan={canAddToPlan ? () => openPlanPicker(meal) : undefined}
            addingToPlan={Boolean(addingDayKey) && planMeal?.id === meal.id}
            readOnly
            saved={feedMealSaved(meal)}
            showPlanState={false}
            variant="feed"
          />
        ))}
      </section>
      <Dialog
        disablePointerDismissal
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
        fallbackPlanId={weekPlanFallbackId}
        meal={planMeal}
        meals={diaryMeals}
        onCreatePlan={async ({ title, coverImage, description, dayCount }) => {
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
        plans={planOptions}
      />
    </>
  );
}
