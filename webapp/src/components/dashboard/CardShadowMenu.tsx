import { EclipseIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CARD_SHADOWS } from '@/components/card-shadow'
import { setCardShadow, useCardShadow } from '@/components/card-shadow-store'

export function CardShadowMenu() {
  const shadow = useCardShadow()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Тень карточки"
            className="size-7"
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        <EclipseIcon aria-hidden className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44" sideOffset={8}>
        <DropdownMenuLabel>Тень карточки</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={shadow}
          onValueChange={(value) => {
            if (typeof value === 'string') setCardShadow(value)
          }}
        >
          {CARD_SHADOWS.map((item) => (
            <DropdownMenuRadioItem key={item.id} value={item.id}>
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
