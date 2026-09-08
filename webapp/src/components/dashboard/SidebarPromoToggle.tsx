import { PanelBottomIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { setSidebarPromoCards, useSidebarPromoCards } from '@/components/sidebar-promo-store'

export function SidebarPromoToggle() {
  const visible = useSidebarPromoCards()
  return (
    <Button
      aria-label={visible ? 'Скрыть блоки сайдбара' : 'Показать блоки сайдбара'}
      aria-pressed={visible}
      className="size-7"
      onClick={() => setSidebarPromoCards(!visible)}
      size="icon"
      type="button"
      variant="ghost"
    >
      <PanelBottomIcon aria-hidden className="size-3.5" />
    </Button>
  )
}
