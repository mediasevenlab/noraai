/** Matches Tailwind `md` / `useIsMobile`: viewports below 768px. */
export const TOASTER_MOBILE_MAX_WIDTH_PX = 767

/** Cap for mobile toasts: screen minus 0.75rem side insets. The pill hugs its copy. */
export const TOASTER_MOBILE_WIDTH = 'calc(100vw - 1.5rem)'

/** Sit above the 3rem mobile dock plus its 1rem inset, with a 1.25rem gap. */
export const TOASTER_MOBILE_BOTTOM =
  'calc(4.25rem + max(1rem, var(--app-safe-bottom, env(safe-area-inset-bottom))))'

export function toasterPositionForViewport(
  viewportWidth: number,
): 'bottom-left' | 'bottom-right' {
  return viewportWidth <= TOASTER_MOBILE_MAX_WIDTH_PX ? 'bottom-left' : 'bottom-right'
}
