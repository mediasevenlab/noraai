/**
 * Same height as the submit button: 40px below the large breakpoint, 32px from it.
 * On a phone the computed size stays 16px so iOS does not zoom — see `[data-auth-field]`.
 */
export const authControlClassName =
  'h-full min-h-0 !bg-[var(--nora-panel)] px-3 pt-2.5 pb-2.5 font-[family-name:var(--nora-font)] text-[13px] font-normal !text-[var(--nora-text)] !leading-5 max-[767px]:!text-[16px] lg:pt-1.5 lg:pb-1.5 shadow-[inset_0_0_0_1px_var(--settings-well-stroke,var(--nora-border))]'

/** Same title as a profile or questionnaire section. */
export const authTitleClassName =
  'font-heading text-[22px] leading-tight font-bold tracking-[-0.02em] text-[var(--nora-text)] text-balance lg:text-[24px]'

/** Primary action: 40px touch height on a phone, 32px from the large breakpoint. */
export const authSubmitClassName = '!h-10 w-full !text-[13px] font-medium lg:!h-8'

/**
 * Icon parked on the right of a field: 16px, 12px from the edge.
 * On a phone the field is scaled, so the layout size is larger.
 */
export const authFieldAdornmentClassName =
  'absolute inset-y-0 right-0 z-[2] flex w-10 items-center justify-end pr-3 text-[var(--nora-text-secondary)] max-[767px]:w-[calc(2.5rem/0.875)] max-[767px]:pr-[calc(0.75rem/0.875)]'

export const authFieldIconClassName = 'size-4 shrink-0 max-[767px]:size-[calc(1rem/0.875)]'

export const authFormClassName =
  'flex flex-col gap-8 font-[family-name:var(--nora-font)] [&_[data-slot=field-description]:not([data-auth-footer])]:!text-[12px] [&_[data-slot=field-description]]:!font-light [&_[data-slot=field-description]]:!leading-5 [&_[data-slot=field-description]]:!text-[var(--nora-text-tertiary)]'
