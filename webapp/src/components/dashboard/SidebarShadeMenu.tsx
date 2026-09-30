import { PanelLeftIcon } from '@/components/icons'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { SIDEBAR_SHADES } from '@/components/sidebar-shade'
import { setSidebarShade, useSidebarShade } from '@/components/sidebar-shade-store'

import { HeaderMenuButton } from './HeaderMenuButton'

export function SidebarShadeMenu() {
  const shade = useSidebarShade()

  return (
    <DropdownMenu>
      <HeaderMenuButton label="Затемнение сайдбара">
        <PanelLeftIcon aria-hidden className="size-3.5" />
      </HeaderMenuButton>
      <DropdownMenuContent align="end" className="min-w-44" sideOffset={8}>
        <DropdownMenuLabel>Затемнение сайдбара</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={shade}
          onValueChange={(value) => {
            if (typeof value === 'string') setSidebarShade(value)
          }}
        >
          {SIDEBAR_SHADES.map((item) => (
            <DropdownMenuRadioItem key={item.id} value={item.id}>
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
