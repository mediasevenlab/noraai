import { BlendIcon } from '@/components/icons'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { MODAL_OVERLAYS } from '@/components/modal-overlay'
import { setModalOverlay, useModalOverlay } from '@/components/modal-overlay-store'

import { HeaderMenuButton } from './HeaderMenuButton'

export function ModalOverlayMenu() {
  const overlay = useModalOverlay()

  return (
    <DropdownMenu>
      <HeaderMenuButton label="Фон окна">
        <BlendIcon aria-hidden className="size-3.5" />
      </HeaderMenuButton>
      <DropdownMenuContent
        align="end"
        className="max-h-[min(70vh,28rem)] min-w-56 overflow-y-auto"
        sideOffset={8}
      >
        <DropdownMenuLabel>Фон окна</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={overlay}
          onValueChange={(value) => {
            if (typeof value === 'string') setModalOverlay(value)
          }}
        >
          {MODAL_OVERLAYS.map((item) => (
            <DropdownMenuRadioItem key={item.id} value={item.id}>
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
