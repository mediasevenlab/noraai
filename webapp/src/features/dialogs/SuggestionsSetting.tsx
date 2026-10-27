import { useSyncExternalStore } from 'react'

import { SettingsEntry } from '@/components/settings-canvas'
import { Switch } from '@/components/ui/switch'

import { setSuggestionsEnabled, subscribeSuggestionsOpen, suggestionsEnabled } from './suggestions-open'

export function SuggestionsSetting() {
  const enabled = useSyncExternalStore(subscribeSuggestionsOpen, suggestionsEnabled, () => true)
  return (
    <SettingsEntry
      description="Короткие запросы под ответом. Нажатие сразу отправляет выбранный."
      title="Подсказки"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="font-[family-name:var(--nora-font)] text-[13px] leading-5 text-[var(--nora-text)]">
          Показывать под ответом
        </span>
        <Switch
          aria-label="Подсказки запросов"
          checked={enabled}
          onCheckedChange={setSuggestionsEnabled}
        />
      </div>
    </SettingsEntry>
  )
}
