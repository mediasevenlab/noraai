import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

/** Кнопка выпадающего меню шапки с подсказкой снизу. */
export function HeaderMenuButton({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <TooltipProvider delay={250}>
      <Tooltip>
        <DropdownMenuTrigger
          render={
            <TooltipTrigger
              render={
                <Button
                  aria-label={label}
                  className="size-7"
                  size="icon"
                  type="button"
                  variant="ghost"
                />
              }
            />
          }
        >
          {children}
        </DropdownMenuTrigger>
        <TooltipContent side="bottom" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
