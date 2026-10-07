import type { CardBrand } from './model'

import { cn } from '@/lib/utils'

/** Brand wash on the preview. Fields live under the card; this face only mirrors them. */
const face: Record<CardBrand, string> = {
  unknown:
    'bg-[radial-gradient(90%_80%_at_0%_0%,rgba(255,255,255,0.22),transparent_46%),linear-gradient(155deg,#5c5c62_0%,#2c2c30_46%,#121214_100%)]',
  visa:
    'bg-[radial-gradient(90%_80%_at_0%_0%,rgba(255,255,255,0.28),transparent_42%),linear-gradient(155deg,#4d7ed0_0%,#1d448f_48%,#0c2048_100%)]',
  mastercard:
    'bg-[radial-gradient(90%_80%_at_0%_0%,rgba(255,255,255,0.2),transparent_42%),linear-gradient(155deg,#8a5344_0%,#4a2820_48%,#1c100e_100%)]',
  mir:
    'bg-[radial-gradient(90%_80%_at_0%_0%,rgba(255,255,255,0.2),transparent_42%),linear-gradient(155deg,#2f8a78_0%,#13584c_48%,#08241f_100%)]',
  unionpay:
    'bg-[radial-gradient(90%_80%_at_0%_0%,rgba(255,255,255,0.18),transparent_42%),linear-gradient(155deg,#a84358_0%,#5c2030_48%,#1c0c12_100%)]',
  jcb:
    'bg-[radial-gradient(90%_80%_at_0%_0%,rgba(255,255,255,0.2),transparent_42%),linear-gradient(155deg,#3a8494_0%,#1a4c60_48%,#0c2030_100%)]',
}

const networks = ['visa', 'mastercard', 'mir', 'unionpay', 'jcb'] as const satisfies readonly CardBrand[]

export function BankCard({
  brand,
  compact = false,
  expiry,
  holderName,
  number,
}: {
  brand: CardBrand
  /** Narrow left column: smaller type so the number stays on one line. */
  compact?: boolean
  expiry: string
  holderName: string
  number: string
}) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-[12px] text-white shadow-none',
        face[brand],
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'repeating-linear-gradient(118deg, transparent 0 3px, rgba(255,255,255,0.28) 3px 4px)',
        }}
      />
      <div
        aria-label={`Карта ${brand === 'unknown' ? '' : brand}`.trim()}
        className={cn(
          'relative grid aspect-[1.7/1] w-full grid-rows-[auto_1fr_auto]',
          compact ? 'px-4 py-3.5' : 'px-5 py-4 sm:px-6 sm:py-5',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="flex items-center gap-3">
            <Chip />
            <Contactless />
          </span>
          <CardBrandMark brand={brand} />
        </div>
        <p className={cn(
          'flex items-center font-[family-name:var(--nora-font)] font-medium tabular-nums',
          compact ? 'text-[15px] tracking-[0.12em]' : 'text-[18px] tracking-[0.16em] sm:text-[22px]',
        )}>
          {number || '•••• •••• •••• ••••'}
        </p>
        <div className="flex items-end gap-4">
          <p className="min-w-0 flex-1">
            <span className="mb-1 block text-[10px] font-medium tracking-[0.16em] text-white/55 uppercase">
              Имя
            </span>
            <span className={cn('block truncate text-[12px] font-medium tracking-[0.08em] uppercase', !holderName && 'text-white/40')}>
              {holderName || 'IVAN IVANOV'}
            </span>
          </p>
          <p className="w-[4.5rem] shrink-0 text-right">
            <span className="mb-1 block text-[10px] font-medium tracking-[0.16em] text-white/55 uppercase">
              Срок
            </span>
            <span className={cn('block text-[12px] font-medium tabular-nums', !expiry && 'text-white/40')}>
              {expiry || 'ММ/ГГ'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export function CardBrandStrip({ active }: { active: CardBrand }) {
  return (
    <span aria-hidden className="flex items-center gap-1">
      {networks.map((brand) => (
        <span
          className={cn('transition-opacity', active !== 'unknown' && active !== brand && 'opacity-25')}
          key={brand}
        >
          <TinyBrand brand={brand} />
        </span>
      ))}
    </span>
  )
}

function TinyBrand({ brand }: { brand: Exclude<CardBrand, 'unknown'> }) {
  if (brand === 'visa') {
    return <span className="font-[family-name:var(--nora-font)] text-[11px] leading-none font-bold italic tracking-tight text-[#1a1f71]">VISA</span>
  }
  if (brand === 'mastercard') {
    return (
      <span className="relative block h-3.5 w-5">
        <span className="absolute top-0 left-0 size-3.5 rounded-full bg-[#eb001b]" />
        <span className="absolute top-0 left-1.5 size-3.5 rounded-full bg-[#f79e1b]" />
      </span>
    )
  }
  if (brand === 'mir') {
    return <span className="font-[family-name:var(--nora-font)] text-[10px] leading-none font-bold tracking-[0.08em] text-[#0d6b4f]">МИР</span>
  }
  if (brand === 'unionpay') {
    return (
      <span className="flex h-3.5 overflow-hidden rounded-[2px]">
        <span className="w-1.5 bg-[#e21836]" />
        <span className="w-1.5 bg-[#00447c]" />
        <span className="w-1.5 bg-[#007b84]" />
      </span>
    )
  }
  return <span className="rounded-[2px] bg-[#0c3b6e] px-1 py-0.5 font-[family-name:var(--nora-font)] text-[9px] leading-none font-bold text-white">JCB</span>
}

function Chip() {
  return (
    <span
      aria-hidden
      className="relative block h-8 w-11 overflow-hidden rounded-[7px] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-1px_0_rgba(90,60,20,0.35)]"
      style={{
        background: 'linear-gradient(145deg, #fff6dc 0%, #e8cc8c 26%, #c4964a 62%, #f3e2b4 100%)',
      }}
    >
      <span className="absolute inset-y-1 left-[32%] w-px bg-[#6d4e1e]/50" />
      <span className="absolute inset-y-1 right-[32%] w-px bg-[#6d4e1e]/50" />
      <span className="absolute inset-x-1 top-[30%] h-px bg-[#6d4e1e]/45" />
      <span className="absolute inset-x-1 bottom-[30%] h-px bg-[#6d4e1e]/45" />
      <span className="absolute top-[22%] bottom-[22%] left-[32%] w-[36%] rounded-[3px] shadow-[inset_0_0_0_1px_rgba(90,60,20,0.45)]" />
    </span>
  )
}

function Contactless() {
  return (
    <svg aria-hidden className="h-5 w-5 text-white/75" fill="none" viewBox="0 0 24 24">
      <path d="M8.5 8.2c2.4 1.8 2.4 5.8 0 7.6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
      <path d="M12 6c3.6 2.8 3.6 9.2 0 12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
      <path d="M15.5 4c4.6 3.6 4.6 12.4 0 16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  )
}

function CardBrandMark({ brand }: { brand: CardBrand }) {
  if (brand === 'visa') {
    return <span className="font-[family-name:var(--nora-font)] text-[26px] leading-none font-bold italic tracking-[-0.04em] text-white">VISA</span>
  }
  if (brand === 'mastercard') {
    return (
      <span aria-label="Mastercard" className="relative block h-8 w-12">
        <span className="absolute top-0.5 left-0 size-7 rounded-full bg-[#eb001b]" />
        <span className="absolute top-0.5 left-4 size-7 rounded-full bg-[#f79e1b]" />
      </span>
    )
  }
  if (brand === 'mir') {
    return <span className="font-[family-name:var(--nora-font)] text-[20px] leading-none font-bold tracking-[0.18em] text-white">МИР</span>
  }
  if (brand === 'unionpay') {
    return (
      <span aria-label="UnionPay" className="flex h-7 items-stretch overflow-hidden rounded-[5px]">
        <span className="w-2.5 bg-[#e21836]" />
        <span className="w-2.5 bg-[#00447c]" />
        <span className="w-2.5 bg-[#007b84]" />
      </span>
    )
  }
  if (brand === 'jcb') {
    return <span className="rounded-[4px] bg-[#0c3b6e] px-1.5 py-1 font-[family-name:var(--nora-font)] text-[13px] leading-none font-bold tracking-wide text-white">JCB</span>
  }
  return <span className="font-[family-name:var(--nora-font)] text-[13px] font-medium tracking-[0.12em] text-white/70 uppercase">Карта</span>
}
