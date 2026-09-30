import { GalleryVerticalEnd } from '@/components/icons'

import { cn } from '@/lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground',
        className,
      )}
    >
      <GalleryVerticalEnd className="size-4 text-sidebar-primary-foreground!" />
    </div>
  )
}
