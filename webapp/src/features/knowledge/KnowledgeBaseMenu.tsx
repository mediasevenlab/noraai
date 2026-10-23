import { useEffect, useRef, useState } from 'react'
import { useAuiState } from '@assistant-ui/react'
import { FolderIcon } from '@/components/icons'
import { useAuth } from '@/features/auth'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { dialogComposerToolClass } from '@/components/dialog-composer-tool'
import { cn } from '@/lib/utils'

import { listKnowledgeBases, type KnowledgeBase } from './api'
import { bindThreadKnowledge, subscribeKnowledgeCatalog, writeThreadKnowledge } from './selection'

export function KnowledgeBaseMenu({ disabled = false }: { disabled?: boolean }) {
  const auth = useAuth()
  const userId = auth.user?.id ?? ''
  const threadId = useAuiState((state) => state.threads.mainThreadId)
  const [bases, setBases] = useState<KnowledgeBase[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const previousThread = useRef<string | null>(null)

  useEffect(() => {
    setSelected(bindThreadKnowledge(userId, threadId, previousThread.current))
    previousThread.current = threadId
  }, [threadId, userId])

  useEffect(() => {
    let current = true
    function load() {
      if (!userId) return
      void listKnowledgeBases(auth.transport)
        .then((result) => {
          if (current) setBases(result.bases)
        })
        .catch(() => {
          if (current) setBases([])
        })
    }
    load()
    const unsubscribe = subscribeKnowledgeCatalog(() => {
      if (current) load()
    })
    return () => {
      current = false
      unsubscribe()
    }
  }, [auth.transport, userId])

  function toggle(baseId: string) {
    if (!userId) return
    const next = selected.includes(baseId)
      ? selected.filter((id) => id !== baseId)
      : [...selected, baseId]
    writeThreadKnowledge(userId, threadId, next)
    setSelected(next)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        nativeButton
        render={
          <button
            aria-label="Базы знаний"
            className={cn(dialogComposerToolClass(selected.length > 0, disabled), 'h-8 gap-1 px-2')}
            disabled={disabled}
            type="button"
          />
        }
      >
        <FolderIcon className="size-4" />
        {selected.length > 0 ? <span className="text-[12px] tabular-nums">{selected.length}</span> : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52" side="top" sideOffset={8}>
        {bases.length === 0 ? (
          <p className="px-2 py-1.5 text-[12px] text-[var(--nora-text-secondary)]">Сначала создайте базу в сайдбаре.</p>
        ) : (
          bases.map((base) => (
            <DropdownMenuCheckboxItem
              key={base.id}
              checked={selected.includes(base.id)}
              closeOnClick={false}
              onCheckedChange={() => toggle(base.id)}
            >
              <span className="truncate">{base.name}</span>
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
