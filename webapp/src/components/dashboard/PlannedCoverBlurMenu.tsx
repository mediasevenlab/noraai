import { ApertureIcon } from '@/components/icons'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { PLANNED_COVER_BLURS } from '@/components/planned-cover-blur'
import { setPlannedCoverBlur, usePlannedCoverBlur } from '@/components/planned-cover-blur-store'

import { HeaderMenuButton } from './HeaderMenuButton'

export function PlannedCoverBlurMenu() {
  const blur = usePlannedCoverBlur()

  return (
    <DropdownMenu>
      <HeaderMenuButton label="Блюр запланированных">
        <ApertureIcon aria-hidden className="size-3.5" />
      </HeaderMenuButton>
      <DropdownMenuContent
        align="end"
        className="max-h-80 min-w-44 overflow-y-auto"
        sideOffset={8}
      >
        <DropdownMenuLabel>Блюр запланированных</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={blur}
          onValueChange={(value) => {
            if (typeof value === 'string') setPlannedCoverBlur(value)
          }}
        >
          {PLANNED_COVER_BLURS.map((item) => (
            <DropdownMenuRadioItem key={item.id} value={item.id}>
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
