import { SquareRoundCornerIcon } from '@/components/icons'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { CARD_RADII } from '@/components/card-radius'
import { setCardRadius, useCardRadius } from '@/components/card-radius-store'

import { HeaderMenuButton } from './HeaderMenuButton'

export function CardRadiusMenu() {
  const radius = useCardRadius()

  return (
    <DropdownMenu>
      <HeaderMenuButton label="Скругление карточки">
        <SquareRoundCornerIcon aria-hidden className="size-3.5" />
      </HeaderMenuButton>
      <DropdownMenuContent align="end" className="min-w-44" sideOffset={8}>
        <DropdownMenuLabel>Скругление карточки</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={radius}
          onValueChange={(value) => {
            if (typeof value === 'string') setCardRadius(value)
          }}
        >
          {CARD_RADII.map((item) => (
            <DropdownMenuRadioItem key={item.id} value={item.id}>
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
