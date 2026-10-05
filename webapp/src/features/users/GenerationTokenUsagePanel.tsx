import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { toast } from '@/components/ui/toast'

import { RefreshCwIcon, SparklesIcon } from '@/components/icons'
import { SettingsEntry, SettingsFieldMark } from '@/components/settings-canvas'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/features/auth'

import { getGenerationPricing, resetMyGenerationSpend } from './api'
import { formatGenerationPricingCaption } from './generation-pricing-caption'
import { GenerationCurrencySelect } from './GenerationCurrencySelect'
import {
  setGenerationTokenUsageVisible,
  useGenerationTokenUsageVisible,
} from './generation-token-usage-store'

export function GenerationTokenUsagePanel() {
  const visible = useGenerationTokenUsageVisible()
  const switchId = useId()
  const auth = useAuth()
  const queryClient = useQueryClient()
  const [resetting, setResetting] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const pricingQuery = useQuery({
    queryKey: ['session', 'generation-pricing'],
    queryFn: () => getGenerationPricing(auth.transport),
    staleTime: 5 * 60 * 1000,
  })
  const description = pricingQuery.data
    ? formatGenerationPricingCaption(pricingQuery.data)
    : 'Курс и цены обновляются.'

  async function resetSpend() {
    if (resetting) return
    setResetting(true)
    try {
      await resetMyGenerationSpend(auth.transport)
      await queryClient.invalidateQueries({ queryKey: ['session', 'meals'] })
      await queryClient.invalidateQueries({ queryKey: ['session', 'admin'] })
      toast.success('Статистика расхода сброшена')
      setConfirmReset(false)
    } catch {
      toast.error('Не удалось сбросить расход')
    } finally {
      setResetting(false)
    }
  }

  return (
    <>
    <SettingsEntry
      description={description}
      descriptionClassName="max-w-none line-clamp-none overflow-visible whitespace-pre-line"
      title="Расход токенов"
    >
      <div className="-my-1.5 flex items-center gap-2.5">
        <label
          className="flex cursor-pointer items-center gap-2.5 font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]"
          htmlFor={switchId}
        >
          <SettingsFieldMark icon={SparklesIcon} />
          Показывать расход
        </label>
        <span aria-hidden className="h-4 w-px shrink-0 bg-[var(--nora-border)]" />
        <GenerationCurrencySelect className="!h-8 !min-h-8 !bg-[var(--settings-field-bg,var(--nora-panel))]" />
        <span aria-hidden className="h-4 w-px shrink-0 bg-[var(--nora-border)]" />
        <button
          aria-label="Сбросить статистику расхода"
          className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-full text-[var(--nora-text-secondary)] transition-colors hover:bg-[var(--nora-hover)] disabled:opacity-50"
          data-generation-control=""
          disabled={resetting}
          onClick={() => setConfirmReset(true)}
          title="Сбросить статистику расхода"
          type="button"
        >
          <RefreshCwIcon className={resetting ? 'size-3.5 animate-spin' : 'size-3.5'} />
        </button>
        <span aria-hidden className="h-4 w-px shrink-0 bg-[var(--nora-border)]" />
        <Switch
          aria-label="Показывать расход токенов за генерации"
          checked={visible}
          className="ml-auto"
          id={switchId}
          onCheckedChange={(checked) => setGenerationTokenUsageVisible(checked)}
          size="lg"
        />
      </div>
    </SettingsEntry>
    <AlertDialog
      onOpenChange={(open) => {
        if (!open && !resetting) setConfirmReset(false)
      }}
      open={confirmReset}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Сбросить статистику расхода?</AlertDialogTitle>
          <AlertDialogDescription>
            Счётчик токенов и сумма обнулятся. Записи в дневнике останутся.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={resetting}>Отмена</AlertDialogCancel>
          <Button
            disabled={resetting}
            onClick={() => {
              void resetSpend()
            }}
            variant="destructive"
          >
            {resetting ? 'Сбрасываем…' : 'Сбросить'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
