import { useTheme } from 'next-themes'
import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'

import {
  Field,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const themes = ['system', 'light', 'dark'] as const
type Theme = typeof themes[number]

const themeIcons = {
  system: MonitorIcon,
  light: SunIcon,
  dark: MoonIcon,
} as const

const themeLabels: Record<Theme, string> = {
  system: 'Системная',
  light: 'Светлая',
  dark: 'Тёмная',
}

export function AppearancePanel() {
  const { theme = 'system', setTheme } = useTheme()
  const selectedTheme = isTheme(theme) ? theme : 'system'

  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--nora-radius-lg)] bg-[var(--dash-card-bg,var(--nora-panel))] shadow-[inset_0_0_0_1px_var(--dash-card-ring,var(--nora-border))]">
      <div className="border-b border-[var(--nora-divider)] p-3.5">
        <h2 className="text-[13px] font-semibold text-[var(--nora-text)]">
          Внешний вид
        </h2>
        <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--nora-text-tertiary)]">
          Следуйте настройкам устройства или зафиксируйте светлую или тёмную тему.
        </p>
      </div>

      <div className="grid gap-3.5 p-3.5">
        <Field>
          <FieldLabel
            className="font-normal text-[var(--nora-text-secondary)]"
            htmlFor="appearance-theme"
          >
            Тема
          </FieldLabel>
          <Select
            onValueChange={(value) => {
              if (value !== null && isTheme(value)) setTheme(value)
            }}
            value={selectedTheme}
          >
            <SelectTrigger
              className="w-full font-normal sm:w-52"
              id="appearance-theme"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {themes.map((item) => {
                const Icon = themeIcons[item]
                return (
                  <SelectItem key={item} value={item}>
                    <Icon aria-hidden />
                    {themeLabels[item]}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <FieldDescription className="font-normal">
            Изменения сохраняются в этом браузере и применяются сразу.
          </FieldDescription>
        </Field>
      </div>
    </div>
  )
}

function isTheme(value: string): value is Theme {
  return themes.some((theme) => theme === value)
}
