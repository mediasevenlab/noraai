import {
  productToolbarSelectContentClass,
  productToolbarSelectItemClass,
} from '@/components/nora/product-sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import {
  setGenerationCurrency,
  useGenerationCurrency,
  type GenerationCurrency,
} from './generation-currency-store'

const currencyLabel: Record<GenerationCurrency, string> = {
  rub: 'RUB',
  usd: 'USD',
}

export function GenerationCurrencySelect({ className }: { className?: string }) {
  const currency = useGenerationCurrency()

  return (
    <Select
      onValueChange={(value) => {
        if (value === 'rub' || value === 'usd') setGenerationCurrency(value)
      }}
      value={currency}
    >
      <SelectTrigger
        aria-label="Валюта расхода"
        className={cn(
          'w-[5.75rem] !rounded-full !px-3 font-[family-name:var(--nora-font)] !text-[13px] !font-normal',
          className,
        )}
        data-generation-control=""
        type="button"
      >
        <span className="min-w-0 flex-1 truncate text-left">{currencyLabel[currency]}</span>
      </SelectTrigger>
      <SelectContent className={productToolbarSelectContentClass}>
        <SelectItem className={productToolbarSelectItemClass} value="rub">
          RUB
        </SelectItem>
        <SelectItem className={productToolbarSelectItemClass} value="usd">
          USD
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
