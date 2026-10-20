import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import type { MealEntry } from './meals-catalog'
import {
  MEAL_FORMING_STEP_GAP_MS,
  mealFormingSteps,
} from './meal-forming-steps'
import {
  AUTH_DEMO_CAPTIONS,
  AUTH_DEMO_FIRST_PLAN_INDEX,
  AUTH_DEMO_SHOP_INDEX,
  AUTH_DEMO_RATION_SLOT_ID,
  AUTH_MEAL_CARD_WIDTH_REM,
  AUTH_MEAL_DRAFT_DEMO,
  AUTH_MEAL_SAVE_DEMO,
  AUTH_MEAL_SHARE_DEMO,
  AUTH_DEMO_SHARE_AUDIENCE,
  AUTH_DEMO_SHARE_LIKE_TO,
  AUTH_MEAL_DRAFT_DEMO_NOTE,
  AUTH_MEAL_DRAFT_DEMO_PHOTOS_CHAT,
  AUTH_MEAL_DRAFT_DEMO_WELCOME,
  AUTH_MEAL_SIDE_SCALE,
  AUTH_MEAL_SIDE_X_REM,
  AUTH_PLAN_DAY_DEMO,
  AUTH_PLAN_MEAL_DEMO,
  AUTH_SHOP_DEMO,
  authDemoCaptionId,
  authDemoPitchCaptionId,
  authDemoSheetPlayStartMs,
  authDemoCarouselItems,
  authDemoMealShowsFeedChrome,
  authDemoCaptionTop,
  authDemoLeftCardInsetRem,
  authDemoAttachItems,
  authDemoAttachItemsForMeal,
  authDemoCreatesAtIndex,
  authDemoOpensAtIndex,
  authDemoOpensPlanMealAtIndex,
  authDemoOpensRationAtIndex,
  authDemoPlanBalanceFromDelta,
  authDemoPlanBalanceLabel,
  authDemoPlanDayHeading,
  authDemoShopsAtIndex,
  authDemoFormedMeal,
  authDemoNoteForMeal,
  authDemoShareAtIndex,
  authDemoShareMeal,
  authDraftDemoFieldPressAtMs,
  authDraftDemoCloseAtMs,
  authDraftDemoFormingAtMs,
  authDraftDemoLastPhotoAtMs,
  authDraftDemoNutrientsPressAtMs,
  authDraftDemoNutrientsPressFromOpenAtMs,
  authDraftDemoNutrientsShowAtMs,
  authDraftDemoNutrientsShowFromOpenAtMs,
  authDraftDemoReadyAtFromOpenMs,
  authDraftDemoNoteFieldPressAtMs,
  authDraftDemoPhotoAtMs,
  authDraftDemoReadyAfterRevealMs,
  authDraftDemoSeekProgress,
  authDraftDemoSheetCloseFromOpenAtMs,
  authDraftDemoPhotoCycleMs,
  authDraftDemoPlusPressAtMs,
  authDraftDemoRevealAtMs,
  authDraftDemoSendPressAtMs,
  authDraftDemoTypeDurationMs,
  authDraftDemoTypedMs,
  authDraftDemoTypeStartAtMs,
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
  authIntroPressAtMs,
  authPlanMealDemoCloseAtMs,
  authPlanMealDemoCompleteAtMs,
  authPlanMealDemoCompletePressAtMs,
  authPreviewMeals,
  authShopDemoAfterItemsMs,
  authShopDemoCloseAtMs,
  authShopDemoItemCheckAtMs,
  authShopDemoItemPressAtMs,
  signedCarouselOffset,
} from './auth-meal-carousel'

function meal(id: string, featured = false): MealEntry {
  return {
    id,
    title: id,
    ingredients: id,
    category: 'Завтрак',
    meal: 'Завтрак',
    at: '2026-08-01T08:00:00',
    kcal: 1,
    protein: 1,
    fat: 1,
    carbs: 1,
    image: `/${id}.jpg`,
    featured,
  }
}

describe('authPreviewMeals', () => {
  test('puts featured meals first and caps the loop', () => {
    const catalog = [
      meal('a'),
      meal('b', true),
      meal('c'),
      meal('d', true),
      meal('e'),
      meal('f'),
      meal('g'),
    ]

    expect(authPreviewMeals(catalog, 5).map((item) => item.id)).toEqual([
      'b',
      'd',
      'a',
      'c',
      'e',
    ])
  })

  test('login diary demo uses dedicated PP catalog with local covers', async () => {
    const { AUTH_DEMO_MEAL_CATALOG } = await import('./auth-demo-meals')
    const preview = authPreviewMeals()
    expect(preview).toHaveLength(6)
    expect(preview.every((item) => item.id.startsWith('auth-demo-'))).toBe(true)
    expect(preview.every((item) => item.image.startsWith('/diary/auth-demo/'))).toBe(true)
    expect(preview.every((item) => (item.portionItems?.length ?? 0) >= 4)).toBe(true)
    expect(authDemoFormedMeal().id).toBe('auth-demo-02')
    expect(authDemoFormedMeal().title).toMatch(/фасол/i)
    expect(AUTH_DEMO_MEAL_CATALOG).toHaveLength(6)
  })
})

describe('signedCarouselOffset', () => {
  test('wraps the shortest path around the loop', () => {
    expect(signedCarouselOffset(0, 0, 6)).toBe(0)
    expect(signedCarouselOffset(1, 0, 6)).toBe(1)
    expect(signedCarouselOffset(5, 0, 6)).toBe(-1)
    expect(signedCarouselOffset(0, 5, 6)).toBe(1)
    expect(signedCarouselOffset(4, 0, 6)).toBe(-2)
  })

  test('returns 0 for an empty list', () => {
    expect(signedCarouselOffset(0, 0, 0)).toBe(0)
  })
})

describe('auth demo captions', () => {
  test('names the visible demo step from the sheet state', () => {
    expect(authDemoCaptionId({ open: false })).toBe('diary')
    expect(AUTH_DEMO_CAPTIONS.diary.title).toBe('Дневник питания')
    expect(AUTH_DEMO_CAPTIONS.diary.body.length).toBeGreaterThan(40)
    expect(authDemoCaptionId({ open: true })).toBe('add')
    expect(authDemoPitchCaptionId('add')).toBe('diary')
    expect(authDemoPitchCaptionId('photos')).toBe('diary')
    expect(authDemoPitchCaptionId('analyze')).toBe('analyze')
    expect(AUTH_DEMO_CAPTIONS.add.body).toMatch(/фото/i)
    expect(authDemoCaptionId({ open: true, photos: 1 })).toBe('photos')
    expect(authDemoCaptionId({ open: true, photos: 3, analyzing: true })).toBe('analyze')
    expect(AUTH_DEMO_CAPTIONS.analyze.body).toMatch(/калори/i)
    expect(authDemoCaptionId({ open: true, formed: true })).toBe('ready')
    expect(AUTH_DEMO_CAPTIONS.ready.body).toMatch(/состав/i)
    expect(authDemoCaptionId({ open: true, formed: true, nutrients: true })).toBe(
      'nutrients',
    )
    expect(AUTH_DEMO_CAPTIONS.nutrients.body).toMatch(/витамин/i)
    expect(authDemoCaptionId({ open: false, saved: true })).toBe('saved')
    expect(AUTH_DEMO_CAPTIONS.saved.title).toMatch(/закладк/i)
    expect(AUTH_DEMO_CAPTIONS.saved.body).toMatch(/сохран/i)
    expect(authDemoCaptionId({ open: false, share: true })).toBe('share')
    expect(AUTH_DEMO_CAPTIONS.share.body).toMatch(/поделить/i)
    expect(AUTH_DEMO_CAPTIONS.share.body).toMatch(/лент/i)
    expect(AUTH_DEMO_CAPTIONS.share.body).toBe(
      '«Поделиться»: карточка появится в ленте. Нажмите сердце — и счётчик лайков оживёт.',
    )
    expect(AUTH_DEMO_CAPTIONS.share.body).not.toMatch(/Три точки/)
    expect(AUTH_DEMO_CAPTIONS.share.body).not.toMatch(/как у других/)
    expect(authDemoCaptionId({ open: false, kind: 'ration' })).toBe('ration')
    expect(AUTH_DEMO_CAPTIONS.ration.body).toMatch(/меню/i)
    expect(authDemoCaptionId({ open: false, kind: 'ration', rationFilter: true })).toBe(
      'rationFilter',
    )
    expect(AUTH_DEMO_CAPTIONS.rationFilter.body).toMatch(/похуден/i)
    expect(authDemoCaptionId({ open: true, kind: 'ration' })).toBe('rationMeals')
    expect(AUTH_DEMO_CAPTIONS.rationMeals.title).toMatch(/меню/i)
    expect(AUTH_DEMO_CAPTIONS.rationMeals.body).toMatch(/приём/i)
    expect(authDemoCaptionId({ open: true, kind: 'ration', rationTab: 'Готовка' })).toBe(
      'rationCook',
    )
    expect(AUTH_DEMO_CAPTIONS.rationCook.body).toMatch(/рецепт/i)
    expect(authDemoCaptionId({ open: true, kind: 'ration', rationTab: 'Покупки' })).toBe(
      'rationShop',
    )
    expect(AUTH_DEMO_CAPTIONS.rationShop.body).toMatch(/покуп/i)
    expect(authDemoCaptionId({ open: false, kind: 'ration', rationAdd: true })).toBe('rationAdd')
    expect(AUTH_DEMO_CAPTIONS.rationAdd.title).toMatch(/рацион/i)
    expect(AUTH_DEMO_CAPTIONS.rationAdd.body).toMatch(/меню/i)
    expect(authDemoCaptionId({ open: true, kind: 'day-picker' })).toBe('rationDay')
    expect(AUTH_DEMO_CAPTIONS.rationDay.title).toMatch(/план/i)
    expect(AUTH_DEMO_CAPTIONS.rationDay.body).toMatch(/недел/i)
    expect(AUTH_DEMO_CAPTIONS.rationDay.body).not.toMatch(/сентябр/i)
    expect(AUTH_DEMO_CAPTIONS.dayNorm.title).toMatch(/норм/i)
    expect(AUTH_DEMO_CAPTIONS.dayNorm.body).toMatch(/добрать/i)
    expect(AUTH_DEMO_CAPTIONS.dayNorm.body).toMatch(/выполн/i)
    expect(authDemoCaptionId({ open: false, planMeal: true })).toBe('planMeal')
    expect(AUTH_DEMO_CAPTIONS.planMeal.body).toMatch(/недоб/i)
    expect(authDemoCaptionId({ open: true, planDone: true })).toBe('planDone')
    expect(AUTH_DEMO_CAPTIONS.planDone.body).toMatch(/выполн/i)
    expect(authDemoCaptionId({ open: false, shopping: true })).toBe('shopping')
    expect(AUTH_DEMO_CAPTIONS.shopping.body).toMatch(/корзин/i)
    expect(authDemoCaptionId({ open: true, mentorCreate: true })).toBe('mentorCreate')
    expect(AUTH_DEMO_CAPTIONS.mentorCreate.body).toMatch(/подопеч/i)
    expect(authDemoCaptionId({ open: true, mentorEditor: true })).toBe('mentorEditor')
    expect(AUTH_DEMO_CAPTIONS.mentorEditor.body).toMatch(/подопеч/i)
    expect(authDemoCaptionId({ open: true, mentorSaved: true })).toBe('mentorSaved')
    expect(AUTH_DEMO_CAPTIONS.mentorSaved.title).toBe('Отправляйте подопечным')
    expect(AUTH_DEMO_CAPTIONS.mentorSaved.body).toMatch(/подопеч/i)
  })

  test('does not carry a previous sheet offset into live play', () => {
    expect(authDemoSheetPlayStartMs(12_400, false)).toBe(0)
    expect(authDemoSheetPlayStartMs(2_160, true)).toBe(2_160)
    expect(authDemoSheetPlayStartMs(-40, true)).toBe(0)
  })

  test('aligns the pitch with the left side card and scales the sheet evenly', () => {
    expect(authDemoLeftCardInsetRem(false)).toBe(
      AUTH_MEAL_SIDE_X_REM.closed + (AUTH_MEAL_CARD_WIDTH_REM * AUTH_MEAL_SIDE_SCALE) / 2,
    )
    expect(authDemoLeftCardInsetRem(true)).toBeGreaterThan(authDemoLeftCardInsetRem(false))
    expect(authDemoCaptionTop(true)).toBe('0rem')
    expect(authDemoCaptionTop(false)).toBe('calc(50% - 19.75rem)')
    const source = readFileSync(
      new URL('../auth/components/AuthMealCarousel.tsx', import.meta.url),
      'utf8',
    )
    expect(source).toContain('w-[24.5rem]')
    expect(source).toContain('h-[min(44rem,calc(100svh-10rem))]')
    expect(source).toContain('AUTH_MEAL_OPEN_SCALE')
    expect(source).toContain('AUTH_DEMO_CAPTION_ICONS')
    expect(source).toContain('satisfies Record<AuthDemoCaptionId')
    expect(source).toContain('rounded-full')
    expect(source).toContain('CalendarPlusIcon')
    for (const id of Object.keys(AUTH_DEMO_CAPTIONS)) {
      expect(source).toContain(`${id}:`)
    }
    expect(source).toContain('surface?: AuthDemoSurface')
    expect(source).toContain("surface === 'login'")
    expect(source).toContain("surface !== 'login'")
    expect(source).toContain("surface === 'signup-mentor'")
    expect(source).toContain("surface === 'signup-user'")
    expect(source).toContain('authDemoLeftCardInsetRem')
    expect(source).toContain('authDemoCaptionTop')
    expect(source).toContain("frameOpen && openSheet !== 'plan-start'")
    expect(source).toContain('setSignupNormMet(true), 2800')
    expect(source).toContain('transition-[left,top,opacity]')
    expect(source).toContain('authDemoPitchCaptionId')
    expect(source).toContain('pitchCaptionId')
    expect(source).not.toContain('AUTH_DEMO_SILENT_CAPTIONS')
    expect(source).toContain('opacity: visible ? 1 : 0')
    expect(source).toContain('bg-[var(--nora-panel)]')
    expect(source).toContain('transition-[transform,opacity,filter]')
    expect(source).toContain('dimSide')
    expect(source).toContain("filter: dimSide")
    expect(source).toContain('authDemoSetPaused(true)')
    expect(source).toContain('demoFinished')
    expect(source).not.toContain('(current + 1) % items.length')
    expect(source).toContain('data-auth-demo-save-toast')
    const draftSheet = readFileSync(
      new URL('./MealAddDraftIdleSheet.tsx', import.meta.url),
      'utf8',
    )
    expect(draftSheet).toContain('authDraftDemoSheetCloseFromOpenAtMs')
    expect(draftSheet).toContain('authDraftDemoNutrientsPressFromOpenAtMs')
    expect(draftSheet).toContain('authDraftDemoNutrientsShowFromOpenAtMs')
    expect(draftSheet).toContain('setNutrientsPressed(true)')
    expect(draftSheet).toContain('auth-demo-composer-caret')
    expect(draftSheet).toContain('pressPoint')
    expect(draftSheet).toContain('coverReveal')
    expect(draftSheet).toContain("revealPhase === 'title'")
    expect(draftSheet).toContain('setCoverReveal(true)')
    expect(draftSheet).not.toContain(
      "revealPhase === 'settle' ||\n      revealPhase === 'title'",
    )
    expect(draftSheet).toContain('authDraftDemoFieldPressAtMs')
    expect(source).toContain('collapseHandOff')
    expect(source).toContain('AUTH_MEAL_COVER_FADE_MS')
    expect(source).toContain('AUTH_MEAL_EXPAND_MS')
    expect(source).toContain('morphCollapse')
    expect(source).toContain('hideCard')
    expect(source).toContain('const hideCard = expanded')
    expect(source).toContain('const morphCollapse = collapsing')
    expect(source).toContain('opacity: detailVisible ? 1 : 0')
    expect(source).toContain('opacity: hideCard ? 0 : 1')
    expect(source).toContain('collapsing={collapsing}')
    expect(source).toContain('grayscale=')
    expect(source).toContain('!draftActDone')
    expect(draftSheet).not.toContain('index > 0')
    expect(source).toContain('whitespace-nowrap')
    expect(source).toContain("left: 'calc(50% + 9.5rem)'")
    expect(source).toContain("top: 'calc(50% + 12.4rem)'")
    expect(source).toContain('auth-demo-toast-in')
    expect(source).toContain('auth-demo-toast-out')
    expect(source).toContain('authDemoShareMeal')
    expect(source).toContain('setActive(targetIndex)')
    expect(source).not.toContain('text-[var(--nora-tint)]')
    expect(source).toContain('sharePlaying')
    expect(source).toContain('authDemoMealShowsFeedChrome')
    expect(source).toContain('sharedMealId')
    expect(source).toContain('authDemoFormedMeal()')
    expect(source).toContain('variant=')
    expect(source).toContain('menuOpen')
    expect(source).not.toContain('feedView && item.id === items[active]')
    expect(source).not.toContain('visibilityState')
    expect(source).toContain('authDemoOpensRationAtIndex(active)')
    expect(source).not.toContain('const loop = () => {')
    expect(source).toContain("reduceMotion || authDemoIsSeeking()")
    expect(source).toContain('scale(${AUTH_MEAL_OPEN_SCALE})')
    expect(source).toContain('AuthRationGoalBar')
    expect(source).toContain('AuthRationIdleSheet')
    expect(source).toContain('authDemoSheetPlayStartMs(sheetMs, seeking)')
    expect(source).toContain('AuthRationDayPickerSheet')
    expect(source).toContain('AuthPlanMealIdleSheet')
    expect(source).toContain('AuthDiaryDayBar')
    expect(source).toContain('AuthDayShoppingSheet')
    expect(source).toContain('AuthMentorRationCreateSheet')
    expect(source).toContain("openSheet === 'mentor-create'")
    expect(source).toContain('const visible = Math.abs(offset) <= 1')
    expect(source).toContain('authMentorCreateExistingRation')
    expect(source).toContain('authMentorCreateDraftRation')
    expect(source).toContain('mentorCreatedVisible')
    expect(source).toContain('mentorCreateActive')
    expect(source).toContain('onRevealCreated')
    expect(source).toContain('Создать')
    expect(source).toContain('authMentorCreateOpenAtMs')
    expect(source).toContain('mentorCreatePending')
    expect(source).toContain("openSheet === 'shopping'")
    expect(source).toContain('onMarkDone')
    expect(source).toContain('AUTH_PLAN_BALANCE_DEMO')
    expect(source).toContain('authDemoTimeout')
    expect(source).toContain('useAuthDemoSeeking')
    expect(source).toContain('useAuthDemoRemountHold')
    expect(source).toContain('reduceMotion || seeking')
    expect(source).toContain('authDemoIsSeeking()')
    expect(source).toContain('play={detailEntered || seeking}')
    expect(source).toContain('authDemoSheetPlayStartMs(sheetMs, seeking)')
    expect(source).toContain('setSheetMs(0)')
    expect(source).not.toContain('startMs={sheetMs}')
    expect(source).toContain('completedIds={completedIds}')
    expect(source).toContain('hideFooterShare')
    expect(source).toContain('menuSide="bottom"')
    expect(source).toContain('revealAuthor=')
    expect(source).not.toContain('hideStamp=')
    expect(source).toContain('auth-share-audience')
    expect(source).toContain('AUTH_DEMO_SHARE_AUDIENCE')
    expect(source).toContain('setShareAudienceVisible(true)')
    expect(source).toContain('authShareDemoLikePressAtMs')
    expect(source).not.toContain('afterDiaryHoldMs')
    expect(source).toContain('authDemoLeftCardInsetRem(false)')
    expect(source).toContain("surface === 'login' && shareDone")
    expect(source).toContain('keepFeed')
    expect(source).not.toContain('Делимся в ленту')
    expect(source).toContain('Добавлено в избранное')
    expect(source).not.toContain('toast.success')
    expect(source).toContain('setSavePlaying(true)')
    expect(source).not.toContain('onDiarySegmentComplete')
    expect(source).not.toContain('onRationSegmentComplete')
    expect(source).not.toContain('feedGateOpen')
    expect(source).not.toContain('planGateOpen')
    expect(source).toContain('rationActDone')
    expect(source).not.toContain('wallCloseTimerRef')
    expect(source).toContain('AUTH_MEAL_EXPAND_MS')
    expect(source).toContain('onShare={noop}')
    expect(source).toContain('onDelete={noop}')
    expect(source).not.toMatch(/<MealCard[\s\S]*?readOnly/)
    expect(source).not.toContain('var(--nora-canvas)_28%')
    expect(source).toContain('authPreviewGainRation')
    expect(source).toContain('authDemoPlanMeals')
    expect(source).toContain('AUTH_RATION_ADD_DEMO.afterCloseMs')
    expect(source).toContain('openId || pressed')
    const bar = readFileSync(new URL('./AuthDiaryDayBar.tsx', import.meta.url), 'utf8')
    expect(bar).toContain('color-mix(in_srgb,var(--nora-badge-yellow-text)')
    expect(bar).toContain('color-mix(in_srgb,var(--nora-badge-green-text)')
    expect(bar).not.toContain('--nora-badge-yellow-bg')
    const sheet = readFileSync(new URL('./AuthPlanMealIdleSheet.tsx', import.meta.url), 'utf8')
    expect(sheet).toContain('authPlanMealDemoCompletePressAtMs')
    expect(sheet).toContain('demoPressedComplete')
    expect(sheet).toContain('transition-[height,max-height,filter]')
    expect(sheet).toContain('collapsing')
    expect(sheet).toContain('allowCompletePlan')
    const playback = readFileSync(new URL('./auth-demo-playback.tsx', import.meta.url), 'utf8')
    expect(playback).toContain('aria-label="Стоп"')
    expect(playback).toContain('aria-label="Плей"')
    expect(playback).toContain('playFrom')
    expect(playback).toContain('data-auth-demo-steps')
    expect(playback).toContain('data-auth-demo-transport')
    expect(playback).not.toContain('data-auth-demo-debug')
    expect(playback).toContain('aria-current={current ? \'step\' : undefined}')
    expect(playback).not.toContain('aria-label="Время анимации"')
    expect(playback).not.toContain('type="range"')
    expect(playback).toContain('hover:bg-transparent')
    expect(playback).toContain('bg-transparent')
    expect(playback).toContain('border-transparent')
    const shell = readFileSync(
      new URL('../auth/components/AuthPageShell.tsx', import.meta.url),
      'utf8',
    )
    expect(shell).toContain('authDemoSurfaceWindow')
    expect(shell).not.toContain('AuthDemoPlaybackButtons')
    expect(shell).not.toContain('AuthDemoPlaybackTransport')
    expect(shell).not.toContain('authDemoTimelineGroups')
    expect(shell).toContain('top-6 right-6')
    expect(shell).toContain('authDemoReleaseSeek')
    expect(shell).toContain('pb-16')
    expect(shell).toContain('AuthDemoPlaybackProvider')
    expect(shell).toContain('AuthDemoStage')
    expect(shell).toContain('flex h-full w-full justify-center')
    expect(shell).toContain('requestAnimationFrame')
    expect(shell).toContain('authDemoReleaseSeek')
    expect(shell).toContain('AuthMealCarousel')
    expect(shell).not.toContain('AuthDemoFeatureMarquee')
    expect(shell).not.toContain('onHandoff')
    expect(shell).not.toContain('data-auth-demo-diary-reveal')
    expect(source).toContain('captionEnterDelayMs')
    expect(source).toContain('data-auth-demo-caption')
    expect(source).toContain('setRevealReady(false)')
    expect(source).toContain('window.setTimeout')
    expect(shell).toContain('key={surface}')
    expect(shell).not.toContain('AuthRoleGuide')
    const pages = readFileSync(new URL('../../pages.tsx', import.meta.url), 'utf8')
    expect(pages).toContain('<AuthPageShell>')
    expect(pages).not.toContain("role === 'mentor' ? 'signup-mentor' : 'signup-user'")
  })
})

describe('auth intro choreography', () => {
  test('presses the second card after the first slide, then opens', () => {
    expect(authIntroPressAtMs()).toBe(900 + 700 + 420)
    expect(authIntroOpenAtMs()).toBe(authIntroPressAtMs() + 280)
  })
})

describe('auth draft demo choreography', () => {
  test('focuses the field, then adds three photos after plus presses', () => {
    expect(authDraftDemoFieldPressAtMs()).toBeGreaterThanOrEqual(AUTH_MEAL_DRAFT_DEMO.settleMs)
    expect(authDraftDemoFieldPressAtMs()).toBeGreaterThan(
      authDraftDemoTypedMs(AUTH_MEAL_DRAFT_DEMO_WELCOME, 'chat'),
    )
    expect(authDraftDemoPlusPressAtMs(0)).toBe(
      authDraftDemoFieldPressAtMs() +
        AUTH_MEAL_DRAFT_DEMO.fieldPressMs +
        AUTH_MEAL_DRAFT_DEMO.afterFieldMs,
    )
    expect(authDraftDemoPhotoAtMs(0)).toBe(
      authDraftDemoPlusPressAtMs(0) +
        AUTH_MEAL_DRAFT_DEMO.plusPressMs +
        AUTH_MEAL_DRAFT_DEMO.afterPlusMs,
    )
    expect(authDraftDemoSeekProgress(authDraftDemoPhotoAtMs(0) - 1).photoCount).toBe(0)
    expect(authDraftDemoSeekProgress(authDraftDemoPhotoAtMs(0)).photoCount).toBe(1)
    expect(authDraftDemoSeekProgress(authDraftDemoPhotoAtMs(2)).photoCount).toBe(3)
    expect(authDraftDemoPlusPressAtMs(1)).toBe(
      authDraftDemoPlusPressAtMs(0) + authDraftDemoPhotoCycleMs(),
    )
    expect(authDraftDemoPhotoAtMs(2)).toBe(
      authDraftDemoPlusPressAtMs(2) +
        AUTH_MEAL_DRAFT_DEMO.plusPressMs +
        AUTH_MEAL_DRAFT_DEMO.afterPlusMs,
    )
    expect(authDraftDemoLastPhotoAtMs()).toBe(authDraftDemoPhotoAtMs(2))
  })

  test('attaches only angles of the opened meal, and chats only after the third photo', () => {
    const oats: MealEntry = {
      ...meal('b', true),
      extraImages: ['/b-2.jpg', '/b-3.jpg'],
    }
    const catalog = [meal('a', true), oats, meal('c'), meal('d')]
    const items = authDemoAttachItemsForMeal(oats, catalog, 3)
    expect(items.map((item) => item.src)).toEqual(['/b.jpg', '/b-2.jpg', '/b-3.jpg'])
    expect(authDemoAttachItems(catalog, 3).map((item) => item.src)).toEqual([
      '/b.jpg',
      '/b-2.jpg',
      '/b-3.jpg',
    ])
    expect(AUTH_MEAL_DRAFT_DEMO_PHOTOS_CHAT).toContain('Добавлены 3 фото')
    expect(AUTH_MEAL_DRAFT_DEMO_WELCOME.length).toBeLessThan(55)
    expect(AUTH_MEAL_DRAFT_DEMO_PHOTOS_CHAT.length).toBeLessThan(60)
    expect(AUTH_MEAL_DRAFT_DEMO_WELCOME).toMatch(/фото/i)
    expect(AUTH_MEAL_DRAFT_DEMO_PHOTOS_CHAT).toMatch(/порци/i)
  })

  test('creates the diary meal once, then opens the ration on the next card', () => {
    expect(authDemoCreatesAtIndex(0)).toBe(false)
    expect(authDemoCreatesAtIndex(1)).toBe(true)
    expect(authDemoCreatesAtIndex(2)).toBe(false)
    expect(authDemoCreatesAtIndex(3)).toBe(false)
    expect(authDemoOpensRationAtIndex(2)).toBe(false)
    expect(authDemoOpensAtIndex(1)).toBe(true)
    expect(authDemoOpensAtIndex(2)).toBe(false)
    expect(authDemoOpensAtIndex(3)).toBe(false)
    expect(authDemoShopsAtIndex(AUTH_DEMO_SHOP_INDEX, 4)).toBe(true)
    expect(authDemoOpensPlanMealAtIndex(AUTH_DEMO_SHOP_INDEX, 4)).toBe(true)
    expect(authDemoOpensPlanMealAtIndex(AUTH_DEMO_FIRST_PLAN_INDEX, 4)).toBe(false)
    expect(authDemoOpensPlanMealAtIndex(AUTH_DEMO_SHOP_INDEX)).toBe(false)
    expect(authDemoOpensAtIndex(AUTH_DEMO_SHOP_INDEX, 4)).toBe(true)
    expect(authDemoPlanBalanceLabel([
      { kcal: 350 },
      { kcal: 450 },
      { kcal: 250 },
      { kcal: 350 },
    ])).toBe('Недобор −640')
    expect(authDemoPlanBalanceFromDelta(0)).toBe('Норма')
    expect(authDemoPlanBalanceFromDelta(200)).toBe('Недобор −200')
    expect(authPlanMealDemoCompletePressAtMs()).toBe(AUTH_PLAN_MEAL_DEMO.settleMs)
    expect(authPlanMealDemoCompleteAtMs()).toBe(
      AUTH_PLAN_MEAL_DEMO.settleMs + AUTH_PLAN_MEAL_DEMO.completePressMs,
    )
    expect(authPlanMealDemoCloseAtMs()).toBeGreaterThan(authPlanMealDemoCompleteAtMs())
    expect(AUTH_PLAN_MEAL_DEMO.afterCompleteMs).toBeGreaterThan(800)
    expect(authDemoPlanDayHeading([{ at: '2026-08-24T08:30:00' }])).toMatch(/^Пн\./)
    expect(authShopDemoItemPressAtMs(0)).toBe(AUTH_SHOP_DEMO.afterOpenMs)
    expect(authShopDemoItemCheckAtMs(0)).toBe(
      AUTH_SHOP_DEMO.afterOpenMs + AUTH_SHOP_DEMO.itemPressMs,
    )
    expect(AUTH_SHOP_DEMO.maxItems).toBe(7)
    expect(authShopDemoAfterItemsMs(AUTH_SHOP_DEMO.maxItems)).toBeGreaterThan(
      authShopDemoItemCheckAtMs(AUTH_SHOP_DEMO.maxItems - 1),
    )
    expect(authShopDemoCloseAtMs(AUTH_SHOP_DEMO.maxItems)).toBeGreaterThan(
      authShopDemoAfterItemsMs(AUTH_SHOP_DEMO.maxItems),
    )
    expect(AUTH_PLAN_DAY_DEMO.firstHoldMs).toBeGreaterThan(1000)
    expect(AUTH_SHOP_DEMO.afterCloseMs).toBeGreaterThan(600)
  })

  test('inserts the ration card after the diary create meal', () => {
    const catalog = [meal('a', true), meal('b', true), meal('c'), meal('d'), meal('e')]
    const items = authDemoCarouselItems(catalog, { id: 'ration-01' }, [], {
      includeRation: true,
    })
    expect(items.map((item) => item.kind)).toEqual([
      'meal',
      'meal',
      'ration',
      'meal',
      'meal',
      'meal',
    ])
    expect(items[1]).toMatchObject({ kind: 'meal', id: 'b' })
    expect(items[2]).toMatchObject({ kind: 'ration', id: AUTH_DEMO_RATION_SLOT_ID })
    expect(items[2]?.kind === 'ration' && items[2].ration.id).toBe('ration-01')
    expect(authDemoCreatesAtIndex(1)).toBe(true)
    expect(authDemoOpensRationAtIndex(2)).toBe(false)
  })

  test('can omit the ration slot for the login diary pitch', () => {
    const catalog = [meal('a', true), meal('b', true), meal('c'), meal('d')]
    const items = authDemoCarouselItems(catalog, { id: 'ration-01' }, [], {
      includeRation: false,
    })
    expect(items.every((item) => item.kind === 'meal')).toBe(true)
    expect(items.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  test('replaces the remaining catalog meals with planned gray cards after import', () => {
    const catalog = [meal('a', true), meal('b', true), meal('c'), meal('d'), meal('e')]
    const planned = [meal('p0'), meal('p1'), meal('p2'), meal('p3')]
    const items = authDemoCarouselItems(catalog, { id: 'ration-01' }, planned, {
      includeRation: false,
    })
    expect(items.map((item) => item.id)).toEqual([
      'a',
      'b',
      'p0',
      'p1',
      'p2',
      'p3',
    ])
    expect(items[AUTH_DEMO_FIRST_PLAN_INDEX]).toMatchObject({ kind: 'meal', id: 'p0' })
    expect(items[AUTH_DEMO_SHOP_INDEX]).toMatchObject({ kind: 'meal', id: 'p1' })
  })

  test('types a note after the photos, sends, then reveals the opened meal', () => {
    expect(authDraftDemoNoteFieldPressAtMs()).toBeGreaterThanOrEqual(
      authDraftDemoLastPhotoAtMs() + AUTH_MEAL_DRAFT_DEMO.afterPhotosMs,
    )
    expect(authDraftDemoNoteFieldPressAtMs()).toBeGreaterThan(
      authDraftDemoLastPhotoAtMs() +
        authDraftDemoTypedMs(AUTH_MEAL_DRAFT_DEMO_PHOTOS_CHAT, 'chat'),
    )
    expect(authDraftDemoTypeStartAtMs()).toBe(
      authDraftDemoNoteFieldPressAtMs() +
        AUTH_MEAL_DRAFT_DEMO.noteFieldPressMs +
        AUTH_MEAL_DRAFT_DEMO.afterNoteFieldMs,
    )
    expect(authDraftDemoTypeDurationMs()).toBe(
      Array.from(AUTH_MEAL_DRAFT_DEMO_NOTE).length * AUTH_MEAL_DRAFT_DEMO.typeStepMs,
    )
    expect(authDraftDemoSendPressAtMs()).toBe(
      authDraftDemoTypeStartAtMs() +
        authDraftDemoTypeDurationMs() +
        AUTH_MEAL_DRAFT_DEMO.afterTypedMs,
    )
    expect(authDraftDemoFormingAtMs()).toBeGreaterThan(authDraftDemoSendPressAtMs())
    expect(authDraftDemoRevealAtMs()).toBeGreaterThan(authDraftDemoFormingAtMs())
    // Last forming step appears, then a short hold, then the formed card fills.
    const lastStepAt =
      authDraftDemoFormingAtMs() +
      (mealFormingSteps(AUTH_MEAL_DRAFT_DEMO.photoCount).length - 1) *
        MEAL_FORMING_STEP_GAP_MS
    expect(authDraftDemoRevealAtMs()).toBe(
      lastStepAt + AUTH_MEAL_DRAFT_DEMO.afterLastFormingStepMs,
    )
    expect(AUTH_MEAL_DRAFT_DEMO.afterLastFormingStepMs).toBeLessThan(MEAL_FORMING_STEP_GAP_MS)
    expect(AUTH_MEAL_DRAFT_DEMO.holdReadyMs).toBeGreaterThan(0)
    expect(authDraftDemoNutrientsPressAtMs()).toBe(AUTH_MEAL_DRAFT_DEMO.holdReadyMs)
    expect(authDraftDemoNutrientsShowAtMs()).toBe(
      AUTH_MEAL_DRAFT_DEMO.holdReadyMs + AUTH_MEAL_DRAFT_DEMO.nutrientsPressMs,
    )
    expect(authDraftDemoCloseAtMs()).toBeGreaterThan(authDraftDemoNutrientsShowAtMs())
    expect(authDraftDemoReadyAfterRevealMs()).toBeGreaterThan(4 * 420)
    expect(authDraftDemoReadyAtFromOpenMs()).toBe(
      authDraftDemoRevealAtMs() + authDraftDemoReadyAfterRevealMs(),
    )
    expect(authDraftDemoNutrientsPressFromOpenAtMs()).toBe(
      authDraftDemoReadyAtFromOpenMs() + authDraftDemoNutrientsPressAtMs(),
    )
    expect(authDraftDemoNutrientsShowFromOpenAtMs()).toBe(
      authDraftDemoReadyAtFromOpenMs() + authDraftDemoNutrientsShowAtMs(),
    )
    expect(authDraftDemoSheetCloseFromOpenAtMs()).toBeGreaterThan(
      authDraftDemoNutrientsShowFromOpenAtMs(),
    )
    expect(authDraftDemoSheetCloseFromOpenAtMs()).toBeGreaterThan(
      authDraftDemoRevealAtMs() + authDraftDemoReadyAfterRevealMs() + authDraftDemoNutrientsShowAtMs(),
    )
    expect(authSaveDemoSlideAtMs()).toBe(AUTH_MEAL_SAVE_DEMO.holdFormedMs)
    expect(AUTH_MEAL_SAVE_DEMO.holdFormedMs).toBeGreaterThan(0)
    expect(authSaveDemoPressAtMs()).toBe(
      AUTH_MEAL_SAVE_DEMO.holdFormedMs +
        AUTH_MEAL_SAVE_DEMO.slideMs +
        AUTH_MEAL_SAVE_DEMO.settleMs,
    )
    expect(AUTH_MEAL_SAVE_DEMO.slideMs).toBeGreaterThan(0)
    expect(authSaveDemoPressEndAtMs()).toBe(
      authSaveDemoPressAtMs() + AUTH_MEAL_SAVE_DEMO.pressMs,
    )
    expect(AUTH_MEAL_SAVE_DEMO.afterPressMs).toBeGreaterThanOrEqual(400)
    expect(authSaveDemoToastAtMs()).toBe(
      authSaveDemoPressEndAtMs() + AUTH_MEAL_SAVE_DEMO.afterPressMs,
    )
    expect(authSaveDemoDoneAtMs()).toBeGreaterThan(
      authSaveDemoToastAtMs() + AUTH_MEAL_SAVE_DEMO.toastHoldMs,
    )
    expect(authShareDemoMenuPressAtMs()).toBe(
      AUTH_MEAL_SHARE_DEMO.slideMs + AUTH_MEAL_SHARE_DEMO.settleMs,
    )
    expect(AUTH_MEAL_SHARE_DEMO.slideMs).toBe(0)
    expect(authShareDemoMenuOpenAtMs()).toBeGreaterThan(authShareDemoMenuPressAtMs())
    expect(authShareDemoSharePressAtMs()).toBeGreaterThan(authShareDemoMenuOpenAtMs())
    expect(AUTH_MEAL_SHARE_DEMO.sharePressHoldMs).toBeGreaterThan(140)
    expect(AUTH_MEAL_SHARE_DEMO.sharePressMs).toBeGreaterThan(
      AUTH_MEAL_SHARE_DEMO.sharePressHoldMs,
    )
    expect(authShareDemoFeedAtMs()).toBeGreaterThan(authShareDemoSharePressAtMs())
    expect(authShareDemoLikePressAtMs()).toBeGreaterThan(authShareDemoFeedAtMs())
    expect(authShareDemoLikeCountAtMs()).toBeGreaterThan(authShareDemoLikePressAtMs())
    expect(authShareDemoDoneAtMs()).toBeGreaterThan(authShareDemoLikeCountAtMs())
    expect(authShareDemoLikeCountAt(0)).toBe(1)
    expect(authShareDemoLikeCountAt(AUTH_MEAL_SHARE_DEMO.likeCountMs)).toBe(
      AUTH_DEMO_SHARE_LIKE_TO,
    )
    expect(AUTH_DEMO_SHARE_LIKE_TO).toBeGreaterThanOrEqual(100)
    expect(AUTH_DEMO_SHARE_AUDIENCE.length).toBeGreaterThanOrEqual(3)
    expect(AUTH_DEMO_SHARE_AUDIENCE.every((person) => person.src.includes('/avatars/'))).toBe(
      true,
    )
    expect(AUTH_MEAL_SHARE_DEMO.audiencePulseMs).toBeGreaterThan(400)
    expect(AUTH_MEAL_SHARE_DEMO.audienceInMs).toBeGreaterThan(500)
    expect(AUTH_MEAL_SHARE_DEMO.audienceAvatarStaggerMs).toBeGreaterThan(80)

    const catalog = [meal('roll', true), meal('oats', true), meal('rice')]
    catalog[1] = {
      ...catalog[1]!,
      title: 'Тёплый салат с фасолью',
      ingredients: 'Фасоль, черри, чеснок.',
    }
    expect(authDemoFormedMeal(catalog).id).toBe('oats')
    expect(authDemoShareMeal(catalog).id).toBe('rice')
    expect(authDemoShareAtIndex(2)).toBe(true)
    expect(authDemoShareAtIndex(1)).toBe(false)
    expect(authDemoNoteForMeal(catalog[1]!)).toBe(AUTH_MEAL_DRAFT_DEMO_NOTE)
    expect(authDemoNoteForMeal(catalog[0]!)).toBe('roll')
    expect(authDemoMealShowsFeedChrome('meal-02', 'meal-02', true)).toBe(true)
    expect(authDemoMealShowsFeedChrome('plan-1', 'meal-02', true)).toBe(false)
    expect(authDemoMealShowsFeedChrome('meal-02', 'meal-02', false)).toBe(false)
  })

  test('signup ration day picker uses plan covers instead of the old select', () => {
    const sheet = readFileSync(
      new URL('../mentor/AuthRationDayPickerSheet.tsx', import.meta.url),
      'utf8',
    )
    expect(sheet).not.toContain('>План назначения<')
    expect(sheet).not.toContain('>Дни плана<')
    expect(sheet).not.toContain('NoraSelect')
    expect(sheet).toContain('Новый план')
    expect(sheet).toContain('rationsCountLabel(DEMO_RATIONS.length)')
    expect(sheet).toContain("!selected && 'grayscale'")
  })
})
