import { SlidersHorizontalIcon } from '@/components/icons'

import { NoraSlider } from '@/components/nora/primitives'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  DEFAULT_PLANNED_COVER_GRADE,
  type PlannedCoverGrade,
} from '@/components/planned-cover-grade'
import { setPlannedCoverGrade, usePlannedCoverGrade } from '@/components/planned-cover-grade-store'

import { HeaderMenuButton } from './HeaderMenuButton'

const GRADE_SLIDERS = [
  { key: 'exposure', label: 'Экспозиция' },
  { key: 'contrast', label: 'Контраст' },
  { key: 'highlights', label: 'Света' },
] as const

function formatGrade(value: number) {
  return value > 0 ? `+${value}` : String(value)
}

export function PlannedCoverGradeMenu() {
  const grade = usePlannedCoverGrade()

  function update(key: keyof PlannedCoverGrade, value: string) {
    setPlannedCoverGrade({ ...grade, [key]: Number(value) })
  }

  return (
    <DropdownMenu>
      <HeaderMenuButton label="Ч/б превью">
        <SlidersHorizontalIcon aria-hidden className="size-3.5" />
      </HeaderMenuButton>
      <DropdownMenuContent align="end" className="w-64 p-2" sideOffset={8}>
        <DropdownMenuLabel>Ч/б превью</DropdownMenuLabel>
        <div
          className="flex flex-col gap-2.5 px-2 pt-1 pb-2"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {GRADE_SLIDERS.map((slider) => (
            <label key={slider.key} className="flex flex-col gap-1">
              <span className="flex items-center justify-between text-[12px] font-normal text-[var(--nora-text-secondary)]">
                {slider.label}
                <span className="tabular-nums text-[var(--nora-text)]">
                  {formatGrade(grade[slider.key])}
                </span>
              </span>
              <NoraSlider
                aria-label={slider.label}
                max={100}
                min={-100}
                onChange={(event) => update(slider.key, event.target.value)}
                step={1}
                value={grade[slider.key]}
              />
            </label>
          ))}
          <button
            className="self-start text-[12px] text-[var(--nora-text-tertiary)] hover:text-[var(--nora-text)]"
            onClick={() => setPlannedCoverGrade(DEFAULT_PLANNED_COVER_GRADE)}
            type="button"
          >
            Сбросить
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
