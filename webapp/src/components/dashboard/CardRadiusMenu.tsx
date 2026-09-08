import { SquareRoundCornerIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CARD_RADII } from '@/components/card-radius'
import { setCardRadius, useCardRadius } from '@/components/card-radius-store'

export function CardRadiusMenu() {
  const radius = useCardRadius()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Скругление карточки"
            className="size-7"
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        <SquareRoundCornerIcon aria-hidden className="size-3.5" />
      </DropdownMenuTrigger>
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
