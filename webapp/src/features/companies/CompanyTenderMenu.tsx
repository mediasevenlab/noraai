import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link } from '@tanstack/react-router'

import { dialogComposerToolClass } from '@/components/dialog-composer-tool'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/features/auth'
import { cn } from '@/lib/utils'

import { loadCompanies, type Company } from './api'
import {
  selectedCompanyIds,
  setSelectedCompanyIds,
  subscribeCompanyCatalog,
  subscribeCompanySelection,
  toggleSelectedCompany,
} from './selection'

function TenderMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M7 4.5h7.2L18 8.2V19.5H7V4.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="M14 4.8V8.4h3.5" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M9.5 12.2h5.5M9.5 15.4h5.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  )
}

export function CompanyTenderMenu() {
  const transport = useAuth().transport
  const selected = useSyncExternalStore(subscribeCompanySelection, selectedCompanyIds, () => [])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let current = true
    function load() {
      void loadCompanies(transport)
        .then((result) => {
          if (!current) return
          setCompanies(result.companies)
          setLoaded(true)
        })
        .catch(() => {
          if (!current) return
        })
    }
    load()
    return subscribeCompanyCatalog(() => {
      if (current) load()
    })
  }, [transport])

  useEffect(() => {
    if (!loaded) return
    const allowed = new Set(companies.filter((company) => company.enabled).map((company) => company.id))
    const next = selectedCompanyIds().filter((id) => allowed.has(id))
    if (next.length !== selectedCompanyIds().length) setSelectedCompanyIds(next)
  }, [companies, loaded])

  const available = companies.filter((company) => company.enabled)
  const active = selected.length > 0

  return (
    <DropdownMenu>
      <Tooltip>
        <DropdownMenuTrigger
          nativeButton
          render={
            <TooltipTrigger
              render={
                <button
                  aria-label="Компании для закупок"
                  aria-pressed={active}
                  className={cn(dialogComposerToolClass(active), 'h-8 gap-1 px-2')}
                  type="button"
                />
              }
            />
          }
        >
          <TenderMark className="size-4" />
          {active ? <span className="text-[12px] tabular-nums">{selected.length}</span> : null}
        </DropdownMenuTrigger>
        <TooltipContent side="top" sideOffset={8}>
          Компании для закупок
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="start"
        className={!loaded || available.length === 0 ? 'w-56 max-w-56' : 'w-max min-w-0 max-w-[min(22rem,calc(100vw-2rem))]'}
        side="top"
        sideOffset={8}
      >
        {!loaded ? (
          <p className="px-2 py-1.5 text-[12px] leading-5 text-[var(--nora-text-secondary)]">Открываю компании…</p>
        ) : available.length === 0 ? (
          <p className="px-2 py-1.5 text-[12px] leading-5 whitespace-normal text-[var(--nora-text-secondary)]">
            {companies.length === 0
              ? 'Сначала создайте компанию в разделе '
              : 'Включите компанию в разделе '}
            <Link className="underline" to="/app/companies">Компании</Link>.
          </p>
        ) : (
          available.map((company) => (
            <DropdownMenuCheckboxItem
              key={company.id}
              checked={selected.includes(company.id)}
              className="w-auto"
              closeOnClick={false}
              onCheckedChange={() => toggleSelectedCompany(company.id)}
            >
              <span className="whitespace-nowrap">{company.name}</span>
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
