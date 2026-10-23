import { useState } from 'react'
import { XIcon } from '@/components/icons'
import { useAuth } from '@/features/auth'
import { toast } from '@/components/ui/toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import {
  deleteKnowledgeFile,
  renameKnowledgeBase,
  uploadKnowledgeFile,
  type KnowledgeBase,
} from './api'

const ACCEPT = '.pdf,.docx,.xlsx,.xlsm,.xls,.txt,.md,.csv,.json,.html,.htm,.rtf,.xml,.log'

export function KnowledgeBaseDialog({
  base,
  onClose,
  onChanged,
}: {
  base: KnowledgeBase | null
  onClose: () => void
  onChanged: (base: KnowledgeBase) => void
}) {
  const auth = useAuth()
  const [busy, setBusy] = useState(false)

  async function saveName(nextName: string) {
    if (!base) return
    const next = nextName.trim()
    if (!next || next === base.name) return
    try {
      onChanged(await renameKnowledgeBase(auth.transport, base.id, next))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось переименовать базу')
    }
  }

  async function addFiles(files: File[]) {
    if (!base || files.length === 0) return
    setBusy(true)
    let current = base
    try {
      for (const file of files) {
        const saved = await uploadKnowledgeFile(auth.transport, current.id, file)
        current = { ...current, files: [...current.files, saved] }
        onChanged(current)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить файл')
    } finally {
      setBusy(false)
    }
  }

  async function removeFile(fileId: string) {
    if (!base) return
    try {
      await deleteKnowledgeFile(auth.transport, base.id, fileId)
      onChanged({ ...base, files: base.files.filter((file) => file.id !== fileId) })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить файл')
    }
  }

  return (
    <Dialog
      open={base !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="md:max-w-[28rem]">
        {base ? (
          <>
            <DialogHeader>
              <DialogTitle className="sr-only">База знаний</DialogTitle>
              <input
                aria-label="Название базы знаний"
                className="h-8 w-full border-0 bg-transparent pr-6 text-[15px] font-medium text-[var(--nora-text)] outline-none"
                key={base.id}
                maxLength={80}
                onBlur={(event) => void saveName(event.target.value)}
                defaultValue={base.name}
              />
            </DialogHeader>
            <div className="flex flex-col gap-2 px-[15px] pt-2 pb-[15px]">
              {base.files.length === 0 ? (
                <p className="text-[13px] text-[var(--nora-text-secondary)]">В базе пока нет файлов.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {base.files.map((file) => (
                    <li key={file.id} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[13px]">{file.name}</span>
                      <button
                        aria-label="Удалить файл"
                        className="inline-flex size-6 items-center justify-center rounded-md text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)]"
                        onClick={() => void removeFile(file.id)}
                        type="button"
                      >
                        <XIcon className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <label className="mt-1 inline-flex h-8 cursor-pointer items-center justify-center rounded-full bg-[var(--nora-text)] px-3 text-[13px] text-[var(--nora-panel)]">
                {busy ? 'Добавляем…' : 'Добавить файлы'}
                <input
                  accept={ACCEPT}
                  className="hidden"
                  disabled={busy}
                  multiple
                  onChange={(event) => {
                    const files = [...(event.target.files ?? [])]
                    event.target.value = ''
                    void addFiles(files)
                  }}
                  type="file"
                />
              </label>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
