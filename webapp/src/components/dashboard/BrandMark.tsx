import { GalleryVerticalEnd } from '@/components/icons'

import { cn } from '@/lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'flex aspect-square size-8 items-center justify-center rounded-lg bg-[#242424] text-white dark:bg-[#f3f3f3] dark:text-[#171717] [&_svg]:text-white! dark:[&_svg]:text-[#171717]!',
        className,
      )}
    >
      <GalleryVerticalEnd className="size-4" style={{ color: 'inherit' }} />
    </div>
  )
}
