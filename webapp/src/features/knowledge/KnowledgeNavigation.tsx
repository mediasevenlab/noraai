import { useEffect, useState } from 'react'
import { FolderIcon, PlusIcon, XIcon } from '@/components/icons'
import { useAuth } from '@/features/auth'
import { toast } from '@/components/ui/toast'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { useSidebarSearchQuery } from '@/components/dashboard/SidebarSearch'

import { createKnowledgeBase, deleteKnowledgeBase, listKnowledgeBases, type KnowledgeBase } from './api'
import { KnowledgeBaseDialog } from './KnowledgeBaseDialog'
import { notifyKnowledgeCatalog, subscribeKnowledgeCatalog } from './selection'

export function KnowledgeNavigation({ disabled = false }: { disabled?: boolean }) {
  const query = useSidebarSearchQuery().trim().toLowerCase()
  const visible = !query || 'база знаний'.includes(query) || 'новая база'.includes(query)
  const auth = useAuth()
  const [bases, setBases] = useState<KnowledgeBase[]>([])
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    let current = true
    function load() {
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
  }, [auth.transport])

  if (!visible) return null
  const opened = bases.find((base) => base.id === openId) ?? null

  async function create() {
    const next = name.trim()
    if (!next) return
    try {
      const created = await createKnowledgeBase(auth.transport, next)
      setBases((current) => [created, ...current.filter((base) => base.id !== created.id)])
      setName('')
      setCreating(false)
      setOpenId(created.id)
      notifyKnowledgeCatalog()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать базу')
    }
  }

  async function remove(baseId: string) {
    try {
      await deleteKnowledgeBase(auth.transport, baseId)
      setBases((current) => current.filter((base) => base.id !== baseId))
      if (openId === baseId) setOpenId(null)
      notifyKnowledgeCatalog()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить базу')
    }
  }

  return (
    <nav aria-label="База знаний">
      <SidebarGroup>
        <SidebarGroupLabel>База знаний</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              {creating ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    void create()
                  }}
                >
                  <input
                    aria-label="Название базы знаний"
                    autoFocus
                    className="h-8 w-full rounded-md border-0 bg-[var(--nora-input-bg)] px-2 text-[13px] text-[var(--nora-text)] outline-none"
                    maxLength={80}
                    onBlur={() => {
                      if (!name.trim()) setCreating(false)
                    }}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Название"
                    value={name}
                  />
                </form>
              ) : (
                <SidebarMenuButton
                  disabled={disabled}
                  onClick={() => setCreating(true)}
                  tooltip="Новая база"
                >
                  <PlusIcon />
                  <span className="truncate group-data-[collapsible=icon]:hidden">Новая база</span>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
            {bases.map((base) => (
              <SidebarMenuItem key={base.id}>
                <SidebarMenuButton
                  disabled={disabled}
                  onClick={() => setOpenId(base.id)}
                  tooltip={base.name}
                >
                  <FolderIcon />
                  <span className="truncate group-data-[collapsible=icon]:hidden">{base.name}</span>
                </SidebarMenuButton>
                {disabled ? null : (
                  <SidebarMenuAction aria-label="Удалить базу" onClick={() => void remove(base.id)} showOnHover>
                    <XIcon />
                  </SidebarMenuAction>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <KnowledgeBaseDialog
        base={opened}
        onClose={() => setOpenId(null)}
        onChanged={(next) => {
          setBases((current) => current.map((base) => (base.id === next.id ? next : base)))
          notifyKnowledgeCatalog()
        }}
      />
    </nav>
  )
}
