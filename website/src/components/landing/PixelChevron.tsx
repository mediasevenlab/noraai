import { cn } from '@/lib/utils'

/** AppMinimal pixel double-chevron (Framer SVG path, viewBox 15×24). */
const PIXEL_CHEVRON_PATH =
  'M 4.8 3.811 C 4.8 3.935 4.829 4.058 4.885 4.169 L 4.947 4.294 C 5.025 4.449 5.15 4.574 5.304 4.651 L 5.431 4.715 C 5.543 4.771 5.665 4.8 5.79 4.8 L 8.801 4.8 C 9.242 4.8 9.601 5.158 9.601 5.6 L 9.601 8.612 C 9.601 8.735 9.629 8.857 9.685 8.968 L 9.747 9.093 C 9.824 9.249 9.95 9.375 10.106 9.453 L 10.232 9.515 C 10.343 9.571 10.465 9.6 10.589 9.6 L 13.6 9.6 C 14.042 9.6 14.4 9.958 14.4 10.4 L 14.4 13.6 C 14.4 14.042 14.042 14.4 13.6 14.4 L 10.588 14.4 C 10.465 14.4 10.343 14.429 10.232 14.484 L 10.107 14.546 C 9.951 14.624 9.824 14.751 9.747 14.906 L 9.684 15.032 C 9.629 15.143 9.601 15.264 9.601 15.388 L 9.601 18.4 C 9.601 18.842 9.242 19.2 8.801 19.2 L 5.789 19.2 C 5.665 19.2 5.543 19.229 5.432 19.284 L 5.257 19.371 C 5.066 19.466 4.921 19.633 4.854 19.836 L 4.84 19.878 C 4.814 19.959 4.8 20.044 4.8 20.129 L 4.8 23.2 C 4.8 23.642 4.442 24 4 24 L 0.8 24 C 0.358 24 0 23.642 0 23.2 L 0 20 C 0 19.558 0.358 19.2 0.8 19.2 L 3.87 19.2 C 3.956 19.2 4.042 19.186 4.123 19.159 L 4.166 19.145 C 4.367 19.078 4.533 18.934 4.628 18.744 L 4.715 18.57 C 4.771 18.458 4.8 18.336 4.8 18.211 L 4.8 15.2 C 4.8 14.759 4.442 14.4 4 14.4 L 1.731 14.4 C 1.645 14.4 1.561 14.42 1.484 14.459 C 1.008 14.696 0.504 14.192 0.741 13.716 C 0.78 13.64 0.8 13.555 0.8 13.469 L 0.8 10.531 C 0.8 10.445 0.78 10.36 0.741 10.284 C 0.504 9.808 1.008 9.304 1.484 9.541 C 1.561 9.58 1.645 9.6 1.731 9.6 L 4 9.6 C 4.442 9.6 4.8 9.241 4.8 8.8 L 4.8 5.789 C 4.8 5.664 4.771 5.542 4.715 5.43 L 4.652 5.304 C 4.574 5.149 4.449 5.024 4.294 4.946 L 4.169 4.884 C 4.058 4.829 3.935 4.8 3.811 4.8 L 0.8 4.8 C 0.358 4.8 0 4.442 0 4 L 0 0.8 C 0 0.358 0.358 0 0.8 0 L 4 0 C 4.442 0 4.8 0.358 4.8 0.8 Z M 5.601 13.6 C 5.601 14.042 5.959 14.4 6.401 14.4 L 8.61 14.4 C 8.735 14.4 8.858 14.371 8.969 14.315 L 9.096 14.252 C 9.25 14.175 9.375 14.05 9.452 13.896 L 9.516 13.769 C 9.571 13.658 9.601 13.535 9.601 13.41 L 9.601 10.59 C 9.601 10.465 9.572 10.343 9.516 10.231 L 9.452 10.104 C 9.375 9.95 9.249 9.824 9.095 9.747 L 8.969 9.684 C 8.858 9.629 8.735 9.6 8.611 9.6 L 6.401 9.6 C 5.959 9.6 5.601 9.958 5.601 10.4 Z'

const ROTATE = {
  right: 'rotate-0',
  left: 'rotate-180',
  down: 'rotate-90',
  up: '-rotate-90',
} as const

type PixelChevronProps = {
  className?: string
  direction?: keyof typeof ROTATE
}

export function PixelChevron({ className, direction = 'right' }: PixelChevronProps) {
  return (
    <svg
      aria-hidden="true"
      className={cn('shrink-0', ROTATE[direction], className)}
      fill="currentColor"
      style={{ imageRendering: 'pixelated' }}
      viewBox="0 0 15 24"
    >
      <path d={PIXEL_CHEVRON_PATH} />
    </svg>
  )
}

type PixelChevronButtonProps = {
  className?: string
  direction?: keyof typeof ROTATE
  tone?: 'light' | 'dark'
}

export function PixelChevronButton({
  className,
  direction = 'right',
  tone = 'light',
}: PixelChevronButtonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-grid size-9 shrink-0 place-items-center rounded-[10px]',
        tone === 'light'
          ? 'bg-white text-[#020108] dark:bg-background dark:text-foreground'
          : 'bg-white/8 text-white/85',
        className
      )}
    >
      <PixelChevron className="h-[14px] w-[9px]" direction={direction} />
    </span>
  )
}
