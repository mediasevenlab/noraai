/** Matches Tailwind `md` / `useIsMobile`: viewports below 768px. */
export const TOASTER_MOBILE_MAX_WIDTH_PX = 767

/** ~2/3 of the viewport, always leaving room for the mobile nav FAB. */
export const TOASTER_MOBILE_WIDTH = 'min(66.67vw, calc(100vw - 5.5rem))'

/** Sit above the 3rem mobile dock plus its 1rem inset, with a 1.25rem gap. */
export const TOASTER_MOBILE_BOTTOM =
  'calc(4.25rem + max(1rem, var(--app-safe-bottom, env(safe-area-inset-bottom))))'

export function toasterPositionForViewport(
  viewportWidth: number,
): 'bottom-left' | 'bottom-right' {
  return viewportWidth <= TOASTER_MOBILE_MAX_WIDTH_PX ? 'bottom-left' : 'bottom-right'
}
