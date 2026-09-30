import { ClapperboardIcon } from '@/components/icons'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { MODAL_MOTIONS } from '@/components/modal-motion'
import { setModalMotion, useModalMotion } from '@/components/modal-motion-store'

import { HeaderMenuButton } from './HeaderMenuButton'

export function ModalMotionMenu() {
  const motion = useModalMotion()

  return (
    <DropdownMenu>
      <HeaderMenuButton label="Отдаление фона">
        <ClapperboardIcon aria-hidden className="size-3.5" />
      </HeaderMenuButton>
      <DropdownMenuContent align="end" className="min-w-44" sideOffset={8}>
        <DropdownMenuLabel>Отдаление фона</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={motion}
          onValueChange={(value) => {
            if (typeof value === 'string') setModalMotion(value)
          }}
        >
          {MODAL_MOTIONS.map((item) => (
            <DropdownMenuRadioItem key={item.id} value={item.id}>
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
