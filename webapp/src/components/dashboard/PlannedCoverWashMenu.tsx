import { LayersIcon } from '@/components/icons'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { PLANNED_COVER_WASHES } from '@/components/planned-cover-wash'
import { setPlannedCoverWash, usePlannedCoverWash } from '@/components/planned-cover-wash-store'

import { HeaderMenuButton } from './HeaderMenuButton'

export function PlannedCoverWashMenu() {
  const wash = usePlannedCoverWash()

  return (
    <DropdownMenu>
      <HeaderMenuButton label="Слой запланированных">
        <LayersIcon aria-hidden className="size-3.5" />
      </HeaderMenuButton>
      <DropdownMenuContent
        align="end"
        className="max-h-80 min-w-44 overflow-y-auto"
        sideOffset={8}
      >
        <DropdownMenuLabel>Слой запланированных</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={wash}
          onValueChange={(value) => {
            if (typeof value === 'string') setPlannedCoverWash(value)
          }}
        >
          {PLANNED_COVER_WASHES.map((item) => (
            <DropdownMenuRadioItem key={item.id} value={item.id}>
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
