import { LayersIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PLANNED_COVER_WASHES } from '@/components/planned-cover-wash'
import { setPlannedCoverWash, usePlannedCoverWash } from '@/components/planned-cover-wash-store'

export function PlannedCoverWashMenu() {
  const wash = usePlannedCoverWash()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Слой запланированных"
            className="size-7"
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        <LayersIcon aria-hidden className="size-3.5" />
      </DropdownMenuTrigger>
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
