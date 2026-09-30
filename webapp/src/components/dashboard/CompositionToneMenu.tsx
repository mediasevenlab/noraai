import { TypeIcon } from '@/components/icons'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { COMPOSITION_TONES } from '@/components/composition-tone'
import { setCompositionTone, useCompositionTone } from '@/components/composition-tone-store'

import { HeaderMenuButton } from './HeaderMenuButton'

export function CompositionToneMenu() {
  const tone = useCompositionTone()

  return (
    <DropdownMenu>
      <HeaderMenuButton label="Тон состава">
        <TypeIcon aria-hidden className="size-3.5" />
      </HeaderMenuButton>
      <DropdownMenuContent align="end" className="min-w-44" sideOffset={8}>
        <DropdownMenuLabel>Тон состава</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={tone}
          onValueChange={(value) => {
            if (typeof value === 'string') setCompositionTone(value)
          }}
        >
          {COMPOSITION_TONES.map((item) => (
            <DropdownMenuRadioItem key={item.id} value={item.id}>
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
