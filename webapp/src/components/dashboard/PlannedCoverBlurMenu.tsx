import { ApertureIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PLANNED_COVER_BLURS } from '@/components/planned-cover-blur'
import { setPlannedCoverBlur, usePlannedCoverBlur } from '@/components/planned-cover-blur-store'

export function PlannedCoverBlurMenu() {
  const blur = usePlannedCoverBlur()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Блюр запланированных"
            className="size-7"
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        <ApertureIcon aria-hidden className="size-3.5" />
      </DropdownMenuTrigger>
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
