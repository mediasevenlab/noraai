import { EclipseIcon } from '@/components/icons'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { CARD_SHADOWS } from '@/components/card-shadow'
import { setCardShadow, useCardShadow } from '@/components/card-shadow-store'

import { HeaderMenuButton } from './HeaderMenuButton'

export function CardShadowMenu() {
  const shadow = useCardShadow()

  return (
    <DropdownMenu>
      <HeaderMenuButton label="Тень карточки">
        <EclipseIcon aria-hidden className="size-3.5" />
      </HeaderMenuButton>
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
