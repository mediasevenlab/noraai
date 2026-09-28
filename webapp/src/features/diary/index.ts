// Meal-cover must initialize before any export that can import auth/mentor.
// Mentor → diary → auth → mentor is a real cycle; ration cover registration
// calls setMealCoverExtras at module load.
export {
  MEAL_COVER_PLACEHOLDER_SRC,
  MEAL_COVER_STUB_SRC,
  PLAN_COVER_PLACEHOLDER_SRC,
  displayMealCover,
  displayPlanCover,
  durablePlanCoverSrc,
  isCoverPlaceholder,
  preferredMealPhotoSrc,
  setMealCoverExtras,
  usableMealCover,
} from './meal-cover'
export {
  isPlannedDiaryMeal,
  mealCanShareToFeed,
  mealShareBlockedMessage,
  mealHasAuthorPhoto,
  MEAL_AUTHOR_PHOTO_MARK,
  isRationImportedMeal,
  isRationPlanDone,
  isRationPlanPending,
  mealCardOrigin,
  isPendingPlanMealShownInDiary,
  isDiaryFeedMealVisible,
  isDiaryMealOnFutureDay,
  currentWeekPlanStampId,
  RATION_DIARY_DONE_MARK,
  RATION_DIARY_SOURCE_MARK,
  rationIdFromAssumptions,
  rationPlanAssumption,
  setRationImportedMealTitles,
  mealsForWeekPlan,
  mealBelongsToWeekPlan,
  weekPlanAssumption,
} from './ration-import'
export { readCompletedRationMealIds, readDiaryPlanAtById, writeCompletedRationMealIds, writeDiaryPlanAtById } from './ration-done'
export {
  diaryFeedGridClass,
  readDiaryCardLayout,
  writeDiaryCardLayout,
  type DiaryCardLayout,
} from './diary-card-layout'
export {
  clearSkippedPlanMealIds,
  keepsWeeklyPlanOnDiaryDelete,
  planOccurrenceDiaryAt,
  planOccurrenceDiaryAtWithLayout,
  planOccurrenceStampWhilePending,
  planLayoutSlotIndex,
  orderDiaryDayByPlanLayout,
  diaryPlanIdForMeal,
  diaryPlanStartForMeal,
  readDetachedPlanMealIds,
  readSkippedPlanMealIds,
  writeDetachedPlanMealIds,
  writeSkippedPlanMealIds,
} from './plan-occurrence'
export type { MealEntry } from './meals-catalog'
export { groceryShoppingLines, mealCompositionLines, mealGroceryLines } from './meals-catalog'
export { mergeDemoAndApiMeals, mealDtoToEntry } from './merge-meals'
export { useMealsQuery, useSharedMealsQuery, useSharedRationsQuery, useUserFavoritesQuery, usePlanLibraryQuery, mealsQueryKeys, favoritesQueryKeys, planLibraryQueryKeys } from './queries'
export { createMyMeal, deleteMyMeal, setMyMealPlanDone, shareMyMeal, shareMyRation, listSharedRations, likeSharedRation } from './api'
export { authoredCloneOfSharedRation, canAddSharedRationToMine } from './feed-ration-clone'
export { useSyncedPlanLibrary } from './use-plan-library'

export { NewsPage as DiaryNewsPage } from './pages/news'
export { diaryPeriodStartOverrideForEmail } from './diary-period-start'
export {
  hashUserId,
  initDiarySkeletonForNewUser,
  readDiaryState,
  readSavedMealIds,
  seededShuffle,
  writeSavedMealIds,
} from './diary-assignments'
export { DiaryPlanDayPicker } from './DiaryPlanDayPicker'
export type { FeedPlanWeekDay } from './feed-import'
export {
  diaryMealCreatePlanDraft,
  diaryMealOnPlanDay,
  diaryMealPhotoSrc,
  diaryMealStampOnDay,
  diaryMealsFreshForPlanDay,
  diaryPlanCopiesOnDay,
  diaryPlanDayOccupancy,
  diaryPlanSourceId,
} from './diary-plan-import'
export { requestAddMeal, DIARY_MOBILE_DOCK_MOVE_ID } from './add-meal-request'
export { fileToMealImage, mealImageFromUrl } from './meal-image-pick'
export { MealFeedPhoto } from './meal-feed-photo'
export {
  Cover,
  imagesForDiaryMeal,
  MealCard,
  MealLikeButton,
  MealMacrosPlaque,
  SkeletonMealCard,
  authorInitials,
} from './MealCard'
export { MealOpenDetail } from './MealOpenDetail'
export type { MealMacrosRevealState } from './meal-card-reveal'
export {
  MEAL_DIALOG_COVER_CLASS,
  MEAL_DIALOG_FRAME_CLASS,
  MealDialogHero,
} from './meal-sheet'
export { feedDayHeading, isApiMealId, favoriteMealIdsForSync, reconcileLocalFavoriteIds, daysCountLabel, mealsCountLabel, mealsPerDayLabel, calorieBalanceTone, CALORIE_BALANCE_CHIP_CLASS } from './diary-feed'
export {
  catalogFavoriteCreateDraft,
  isCatalogFavoriteMeal,
  isPlanPreviewMealId,
  apiMealIdForCatalogPreview,
} from './catalog-favorite'
export { dayShoppingItems } from './day-shopping'
export { MEAL_REVEAL_MACRO_GAP_MS } from './meal-card-reveal'
export { MealAddDraftIdleSheet } from './MealAddDraftIdleSheet'
export { AuthPlanMealIdleSheet } from './AuthPlanMealIdleSheet'
export { AuthDiaryDayBar } from './AuthDiaryDayBar'
export { AuthDayShoppingSheet } from './AuthDayShoppingSheet'
export {
  AuthDemoPlaybackButtons,
  AuthDemoPlaybackTransport,
  AuthDemoPlaybackProvider,
  authDemoClear,
  authDemoElapsedMs,
  authDemoIsPaused,
  authDemoIsSeeking,
  authDemoKickCatchup,
  authDemoPlayFrom,
  authDemoReleaseSeek,
  authDemoResume,
  authDemoSetPaused,
  authDemoSubscribe,
  authDemoTimeout,
  useAuthDemoPlayback,
  useAuthDemoRemountHold,
  useAuthDemoSeeking,
} from './auth-demo-playback'
export {
  AUTH_DEMO_CAPTIONS,
  AUTH_DEMO_FIRST_PLAN_INDEX,
  AUTH_DEMO_PLAN_DAILY_KCAL,
  AUTH_DEMO_SHOP_INDEX,
  AUTH_DEMO_RATION_SLOT_ID,
  AUTH_MEAL_CARD_WIDTH_REM,
  AUTH_MEAL_CAROUSEL_INTERVAL_MS,
  AUTH_MEAL_COVER_FADE_MS,
  AUTH_MEAL_EXPAND_MS,
  AUTH_MEAL_INTRO,
  AUTH_MEAL_OPEN_SCALE,
  AUTH_MEAL_SIDE_SCALE,
  AUTH_MEAL_SIDE_X_REM,
  AUTH_MEAL_SAVE_DEMO,
  AUTH_MEAL_SHARE_DEMO,
  AUTH_DEMO_SHARE_AUTHOR,
  AUTH_DEMO_SHARE_AUDIENCE,
  AUTH_DEMO_SHARE_LIKE_TO,
  AUTH_MEAL_SLIDE_MS,
  AUTH_PLAN_BALANCE_DEMO,
  AUTH_PLAN_DAY_DEMO,
  AUTH_PLAN_MEAL_DEMO,
  AUTH_SHOP_DEMO,
  authDraftDemoCloseAtMs,
  authDraftDemoFormingAtMs,
  authDraftDemoNutrientsShowAtMs,
  authDraftDemoPhotoAtMs,
  authDraftDemoReadyAfterRevealMs,
  authDraftDemoReadyCaptionAtMs,
  authDraftDemoSeekProgress,
  authDraftDemoSheetCloseFromOpenAtMs,
  authDraftDemoRevealAtMs,
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
  authIntroOpenAtMs,
  authPlanMealDemoCloseAtMs,
  authPlanMealDemoCompleteAtMs,
  authShopDemoCloseAtMs,
  authDemoAttachItemsForMeal,
  authDemoCaptionId,
  authDemoPitchCaptionId,
  authDemoSheetPlayStartMs,
  authDemoCarouselItems,
  authDemoMealShowsFeedChrome,
  authDemoCaptionTop,
  authDemoLeftCardInsetRem,
  authDemoCreatesAtIndex,
  authDemoFormedMeal,
  authDemoShareAtIndex,
  authDemoShareMeal,
  authDemoOpensPlanMealAtIndex,
  authDemoOpensRationAtIndex,
  authDemoPlanBalanceFromDelta,
  authDemoPlanBalanceLabel,
  authDemoPlanDayHeading,
  authDemoPlanKcalTotal,
  authDemoShopsAtIndex,
  authPreviewMeals,
  signedCarouselOffset,
} from './auth-meal-carousel'
export type { AuthDemoCaptionId } from './auth-meal-carousel'
export { AUTH_DEMO_MEAL_CATALOG } from './auth-demo-meals'
export {
  displayMediaSrc,
  applyMealPhotoFallback,
  mealPhotoDisplaySize,
  mealPhotoOriginalSrc,
  prefetchMealPhoto,
} from './media-display'
export { SharedMealsFeed } from './SharedMealsFeed'
export { SharedMealsFeedPage } from './pages/feed'
