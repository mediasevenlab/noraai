import { ClapperboardIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MODAL_MOTIONS } from '@/components/modal-motion'
import { setModalMotion, useModalMotion } from '@/components/modal-motion-store'

export function ModalMotionMenu() {
  const motion = useModalMotion()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Отдаление фона"
            className="size-7"
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        <ClapperboardIcon aria-hidden className="size-3.5" />
      </DropdownMenuTrigger>
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
