import { ShapesIcon } from '@/components/icons'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { ICON_PACKS } from '@/components/icon-pack'
import { setIconPack, useIconPack } from '@/components/icon-pack-store'

import { HeaderMenuButton } from './HeaderMenuButton'

export function IconPackMenu() {
  const pack = useIconPack()

  return (
    <DropdownMenu>
      <HeaderMenuButton label="Пак иконок">
        <ShapesIcon aria-hidden className="size-3.5" />
      </HeaderMenuButton>
      <DropdownMenuContent align="end" className="max-h-[70vh] min-w-60 overflow-y-auto" sideOffset={8}>
        <DropdownMenuLabel>Пак иконок</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={pack}
          onValueChange={(value) => {
            if (typeof value === 'string') setIconPack(value)
          }}
        >
          {ICON_PACKS.map((item) => (
            <DropdownMenuRadioItem key={item.id} value={item.id}>
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
