import { PaletteIcon } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LIGHT_PALETTES } from '@/components/light-palette'
import { setLightPalette, useLightPalette } from '@/components/theme-provider'

export function LightPaletteMenu() {
  const { resolvedTheme } = useTheme()
  const lightPalette = useLightPalette()

  if (resolvedTheme !== 'light') return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Цветовая схема"
            className="size-7"
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        <PaletteIcon aria-hidden className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44" sideOffset={8}>
        <DropdownMenuLabel>Цветовая схема</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={lightPalette}
          onValueChange={(value) => {
            if (typeof value === 'string') setLightPalette(value)
          }}
        >
          {LIGHT_PALETTES.map((palette) => (
            <DropdownMenuRadioItem key={palette.id} value={palette.id}>
              <span
                aria-hidden
                className="flex size-3.5 shrink-0 overflow-hidden rounded-[3px] border border-[var(--nora-border)]"
              >
                <span className="h-full w-1/2" style={{ background: palette.panel }} />
                <span className="h-full w-1/2" style={{ background: palette.canvas }} />
              </span>
              {palette.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
