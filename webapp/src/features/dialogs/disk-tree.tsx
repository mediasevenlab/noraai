import { useState } from 'react'

import { FileTypeIcon, fileTypeInfo } from '@/components/file-type-icon'
import { ChevronDownIcon, ChevronRightIcon, FolderIcon, Loader2Icon } from '@/components/icons'
import { toast } from '@/components/ui/toast'
import { useAuth } from '@/features/auth'
import { ApiRequestError } from '@/platform/api'
import { cn } from '@/lib/utils'

import { ImageLightbox } from './ImageLightbox'

export type DiskTreeNode = {
  id: string
  name: string
  kind: 'file' | 'folder'
  children?: DiskTreeNode[]
}

const IMAGE_NAME = /\.(png|jpe?g|gif|webp)$/i

export function parseDiskTree(code: string): DiskTreeNode[] | null {
  try {
    const parsed = JSON.parse(code.trim()) as { nodes?: unknown }
    if (!Array.isArray(parsed.nodes)) return null
    const nodes = parsed.nodes.flatMap(readNode)
    return nodes.length > 0 ? nodes : null
  } catch {
    return null
  }
}

function readNode(value: unknown): DiskTreeNode[] {
  if (!value || typeof value !== 'object') return []
  const row = value as { id?: unknown; name?: unknown; kind?: unknown; children?: unknown }
  if (typeof row.id !== 'string' || typeof row.name !== 'string') return []
  if (row.kind !== 'file' && row.kind !== 'folder') return []
  const children = Array.isArray(row.children) ? row.children.flatMap(readNode) : undefined
  return [{ id: row.id, name: row.name, kind: row.kind, ...(children && children.length > 0 ? { children } : {}) }]
}

function bytesFromBase64(data: string) {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function DiskFileRow({ node }: { node: DiskTreeNode }) {
  const auth = useAuth()
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState('')
  const image = IMAGE_NAME.test(node.name)
  const hint = fileTypeInfo(node.name).hint
  const open = async () => {
    if (busy) return
    setBusy(true)
    try {
      const response = await auth.transport.raw('/api/users/me/bitrix-file', {
        method: 'POST',
        body: { id: node.id },
      })
      const payload = (await response.json()) as { name?: string; mime?: string; data?: string }
      if (!payload.data || !payload.name) throw new Error('Файл не открылся.')
      const blob = new Blob([bytesFromBase64(payload.data)], { type: payload.mime || 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      if (image) {
        setPreview((current) => {
          if (current) URL.revokeObjectURL(current)
          return url
        })
        return
      }
      const link = document.createElement('a')
      link.href = url
      link.download = payload.name
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      const message = error instanceof ApiRequestError || error instanceof Error ? error.message : 'Файл не открылся.'
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <button
        aria-label={image ? `Открыть изображение ${node.name}` : `Скачать ${node.name}`}
        className={cn(
          'inline-flex max-w-full items-center gap-2 rounded-md px-1 py-0.5 text-left text-[14px] leading-5 text-[var(--nora-text)] hover:bg-[var(--nora-input-bg)]',
          image ? 'cursor-zoom-in' : 'cursor-pointer',
        )}
        disabled={busy}
        onClick={() => void open()}
        title={image ? 'Открыть изображение' : hint}
        type="button"
      >
        <FileTypeIcon name={node.name} />
        <span className="min-w-0 break-all">{node.name}</span>
        {busy ? <Loader2Icon className="size-3.5 shrink-0 animate-spin text-[var(--nora-text-secondary)]" /> : null}
      </button>
      {preview ? (
        <ImageLightbox
          alt={node.name}
          onClose={() => {
            URL.revokeObjectURL(preview)
            setPreview('')
          }}
          src={preview}
        />
      ) : null}
    </>
  )
}

function DiskFolderRow({ node }: { node: DiskTreeNode }) {
  const children = node.children ?? []
  const [open, setOpen] = useState(true)
  const nested = children.length > 0
  const label = (
    <>
      {nested ? (
        open ? <ChevronDownIcon className="size-3.5 shrink-0 text-[var(--nora-text-secondary)]" /> : <ChevronRightIcon className="size-3.5 shrink-0 text-[var(--nora-text-secondary)]" />
      ) : (
        <span className="size-3.5 shrink-0" />
      )}
      <FolderIcon className="size-4 shrink-0 text-[#2FC6F6]" />
      <span className="min-w-0 break-all">{node.name}</span>
    </>
  )
  return (
    <div>
      {nested ? (
        <button
          aria-expanded={open}
          aria-label={`Папка ${node.name}`}
          className="inline-flex max-w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-[14px] leading-5 text-[var(--nora-text)] hover:bg-[var(--nora-input-bg)]"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          {label}
        </button>
      ) : (
        <div className="inline-flex max-w-full items-center gap-1.5 px-1 py-0.5 text-[14px] leading-5">{label}</div>
      )}
      {nested && open ? (
        <div className="ml-[18px] border-l border-[var(--nora-border)] pl-2">
          {children.map((child) => (
            <DiskTreeRow key={`${child.kind}-${child.id}`} node={child} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function DiskTreeRow({ node }: { node: DiskTreeNode }) {
  if (node.kind === 'file') return <DiskFileRow node={node} />
  return <DiskFolderRow node={node} />
}

export function DiskTreeView({ nodes }: { nodes: DiskTreeNode[] }) {
  return (
    <div className="my-2 min-w-0">
      {nodes.map((node) => (
        <DiskTreeRow key={`${node.kind}-${node.id}`} node={node} />
      ))}
    </div>
  )
}

export function DiskTreeBlock({ code }: { code: string }) {
  const nodes = parseDiskTree(code)
  if (!nodes) return <p className="my-2 text-[13px] text-[var(--nora-text-secondary)]">Дерево не открылось.</p>
  return <DiskTreeView nodes={nodes} />
}
