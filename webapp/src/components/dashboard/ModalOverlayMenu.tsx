import { BlendIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MODAL_OVERLAYS } from '@/components/modal-overlay'
import { setModalOverlay, useModalOverlay } from '@/components/modal-overlay-store'

export function ModalOverlayMenu() {
  const overlay = useModalOverlay()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Фон окна"
            className="size-7"
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        <BlendIcon aria-hidden className="size-3.5" />
      </DropdownMenuTrigger>
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
