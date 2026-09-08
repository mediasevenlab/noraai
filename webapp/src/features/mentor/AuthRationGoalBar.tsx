import { FlameIcon } from 'lucide-react'

import {
  productToolbarSelectContentClass,
  productToolbarSelectItemClass,
} from '@/components/nora/product-sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import { RATION_GOALS } from './authored-rations'
import {
  GOAL_BADGE_CLASS,
  RATION_GROUP_CHIP_CLASS,
  formatRationGoalKcalCap,
} from './ration-chrome'
import { RATION_GOAL_KCAL_CAP, type RationGoal } from './rations-catalog'

export function AuthRationGoalBar({
  goal,
  open = false,
  triggerPressed = false,
  pressedGoal = null,
}: {
  goal: RationGoal
  open?: boolean
  triggerPressed?: boolean
  pressedGoal?: RationGoal | null
}) {
  return (
    <div className="flex w-max items-center gap-2" data-ration-group-bar={goal}>
      <Select modal={false} onOpenChange={() => undefined} open={open} value={goal}>
        <SelectTrigger
          className={cn(
            RATION_GROUP_CHIP_CLASS,
            GOAL_BADGE_CLASS[goal],
            'nora-press-grow box-border h-7 max-h-7 min-h-7 w-fit min-w-0 shrink-0 gap-1 !border-0 !px-2.5 !shadow-none',
            'text-[12px] font-normal leading-none text-current hover:text-current data-[popup-open]:border-0 data-[popup-open]:text-current',
            '[&>svg]:size-3 [&>svg]:opacity-80 [&>svg]:!text-current',
          )}
          data-demo-pressed={triggerPressed ? '' : undefined}
        >
          <SelectValue>{goal}</SelectValue>
        </SelectTrigger>
        <SelectContent
          align="start"
          alignItemWithTrigger={false}
          className={productToolbarSelectContentClass}
          sideOffset={6}
        >
          {RATION_GOALS.map((item) => (
            <SelectItem
              className={cn(productToolbarSelectItemClass, 'nora-press-grow')}
              data-demo-pressed={pressedGoal === item ? '' : undefined}
              indicator="end"
              key={item}
              value={item}
            >
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className={RATION_GROUP_CHIP_CLASS}>
        <FlameIcon aria-hidden className="size-[13px]" strokeWidth={1.75} />
        <span className="tabular-nums">{formatRationGoalKcalCap(RATION_GOAL_KCAL_CAP[goal])}</span>
      </div>
    </div>
  )
}
