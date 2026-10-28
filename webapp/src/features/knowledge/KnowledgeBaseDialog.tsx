import { useState } from 'react'
import { FileTypeIcon } from '@/components/file-type-icon'
import { DownloadIcon, XIcon } from '@/components/icons'
import { useAuth } from '@/features/auth'
import { toast } from '@/components/ui/toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import { ruUploadDate } from '@/lib/ru-when'

import {
  deleteKnowledgeFile,
  downloadKnowledgeFile,
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
  const [downloadError, setDownloadError] = useState('')

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

  async function downloadFile(fileId: string, fileName: string) {
    if (!base) return
    setDownloadError('')
    try {
      await downloadKnowledgeFile(auth.transport, base.id, fileId, fileName)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось скачать файл'
      setDownloadError(message)
      toast.error(message)
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
              {base.builtin ? (
                <p className="pr-6 text-[15px] font-medium text-[var(--nora-text)]">{base.name}</p>
              ) : (
                <input
                  aria-label="Название базы знаний"
                  className="h-8 w-full border-0 bg-transparent pr-6 text-[15px] font-medium text-[var(--nora-text)] outline-none"
                  key={base.id}
                  maxLength={80}
                  onBlur={(event) => void saveName(event.target.value)}
                  defaultValue={base.name}
                />
              )}
            </DialogHeader>
            <div className="flex flex-col gap-2 px-[15px] pt-2 pb-[15px]">
              {base.files.length === 0 ? (
                <p className="text-[13px] text-[var(--nora-text-secondary)]">В базе пока нет файлов.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-[var(--nora-border)]">
                  {base.files.map((file) => (
                    <li key={file.id} className="flex items-center gap-2 py-2">
                      <FileTypeIcon name={file.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-[var(--nora-text)]">{file.name}</span>
                        <span className="block text-[12px] text-[var(--nora-text-secondary)]">{ruUploadDate(file.createdAt)}</span>
                      </span>
                      <button
                        aria-label="Скачать файл"
                        className="inline-flex size-6 items-center justify-center rounded-md text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)]"
                        onClick={() => void downloadFile(file.id, file.name)}
                        type="button"
                      >
                        <DownloadIcon className="size-3.5" />
                      </button>
                      {base.builtin ? null : (
                        <button
                          aria-label="Удалить файл"
                          className="inline-flex size-6 items-center justify-center rounded-md text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)]"
                          onClick={() => void removeFile(file.id)}
                          type="button"
                        >
                          <XIcon className="size-3.5" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {downloadError ? (
                <p className="text-[13px] text-[var(--nora-text-secondary)]">{downloadError}</p>
              ) : null}
              {base.builtin ? (
                <p className="text-[13px] text-[var(--nora-text-secondary)]">
                  Эта база входит в программу. Схемы из неё открываются в ответе чата.
                </p>
              ) : (
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
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
