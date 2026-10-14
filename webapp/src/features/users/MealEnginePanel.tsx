import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MealEngine } from '@web-app-demo/contracts'
import { toast } from '@/components/ui/toast'

import { SettingsEntry } from '@/components/settings-canvas'
import { useAuth } from '@/features/auth'

import { getMealEngine, putMealEngine } from './api'

const CHOICES: Array<{ id: MealEngine; label: string; hint: string }> = [
  { id: 'gemini', label: 'Gemini', hint: 'Как сейчас' },
  { id: 'nora', label: 'Nora', hint: 'Наши модели' },
]

export function MealEnginePanel() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['session', 'meal-engine'],
    queryFn: () => getMealEngine(auth.transport),
  })
  const save = useMutation({
    mutationFn: (engine: MealEngine) => putMealEngine(auth.transport, engine),
    onSuccess: async (result) => {
      queryClient.setQueryData(['session', 'meal-engine'], result)
      await queryClient.invalidateQueries({ queryKey: ['session', 'meal-engine'] })
    },
    onError: () => {
      toast.error('Не удалось сохранить модель')
    },
  })
  const engine = query.data?.engine ?? 'gemini'

  return (
    <SettingsEntry
      description="Фото разбирает модель с картинками, описание без фото — текстовая. Первая карточка после паузы может идти до минуты."
      descriptionClassName="max-w-none line-clamp-none overflow-visible"
      title="Модель дневника"
    >
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Модель дневника">
        {CHOICES.map((choice) => {
          const selected = engine === choice.id
          return (
            <button
              key={choice.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={save.isPending || query.isPending}
              className={
                selected
                  ? 'rounded-full bg-[var(--nora-text)] px-3 py-1.5 font-[family-name:var(--nora-font)] text-[13px] font-medium text-[var(--nora-panel)]'
                  : 'rounded-full bg-[var(--nora-fill)] px-3 py-1.5 font-[family-name:var(--nora-font)] text-[13px] font-medium text-[var(--nora-text)]'
              }
              onClick={() => {
                if (selected || save.isPending) return
                save.mutate(choice.id)
              }}
            >
              {choice.label}
              <span className={selected ? 'ml-1.5 font-[250] opacity-80' : 'ml-1.5 font-[250] text-[var(--nora-text-tertiary)]'}>
                {choice.hint}
              </span>
            </button>
          )
        })}
      </div>
    </SettingsEntry>
  )
}
