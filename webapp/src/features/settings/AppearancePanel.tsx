import { useTheme } from 'next-themes'
import { MonitorIcon, MoonIcon, SunIcon } from '@/components/icons'

import { SettingsEntry, SettingsReadRows, useSettingsMode } from '@/components/settings-canvas'
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
  const mode = useSettingsMode()
  const showForm = !mode.managed || mode.editing

  return (
    <SettingsEntry
      description="Система, светлая или тёмная."
      title="Внешний вид"
    >
      {showForm ? (
      <div className="grid gap-3.5">
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
            Сразу в этом браузере.
          </FieldDescription>
        </Field>
      </div>
      ) : (
        <SettingsReadRows
          rows={[{ label: 'Тема', value: themeLabels[selectedTheme] }]}
        />
      )}
    </SettingsEntry>
  )
}

function isTheme(value: string): value is Theme {
  return themes.some((theme) => theme === value)
}
