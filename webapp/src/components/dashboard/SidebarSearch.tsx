import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { SearchIcon } from 'lucide-react'

import { NoraSearch } from '@/components/nora/primitives'

const SidebarSearchContext = createContext('')

export function useSidebarSearchQuery() {
  return useContext(SidebarSearchContext)
}

export function SidebarSearchProvider({
  children,
  value,
}: {
  children: ReactNode
  value: string
}) {
  return (
    <SidebarSearchContext.Provider value={value}>
      {children}
    </SidebarSearchContext.Provider>
  )
}

export function SidebarSearchField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }
      event.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="flex h-[50px] w-full min-w-0 shrink-0 items-center px-2 group-data-[collapsible=icon]:hidden">
      <NoraSearch
        ref={inputRef}
        icon={<SearchIcon />}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Поиск…"
        aria-label="Поиск по меню"
        className="w-full min-w-0"
        inputClassName="font-medium text-[var(--nora-input-text)] placeholder:font-normal placeholder:text-[var(--nora-input-placeholder)]"
      />
    </div>
  )
}

export function filterByQuery<T extends { label?: string; name?: string; title?: string }>(
  items: ReadonlyArray<T>,
  query: string,
): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...items]
  return items.filter((item) => {
    const haystack = (item.label ?? item.name ?? item.title ?? '').toLowerCase()
    return haystack.includes(q)
  })
}

export function useFilteredBySidebarSearch<T extends { label?: string; name?: string; title?: string }>(
  items: ReadonlyArray<T>,
) {
  const query = useSidebarSearchQuery()
  return useMemo(() => filterByQuery(items, query), [items, query])
}
