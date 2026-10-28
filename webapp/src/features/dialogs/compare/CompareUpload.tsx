import { useAui } from '@assistant-ui/react'
import { useState } from 'react'

import { dialogComposerToolClass } from '@/components/dialog-composer-tool'
import { FileTypeIcon } from '@/components/file-type-icon'
import { Columns2Icon, Loader2Icon, XIcon } from '@/components/icons'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { useAuth } from '@/features/auth'
import { ApiRequestError } from '@/platform/api'
import { cn } from '@/lib/utils'

import { ComposerToolTip } from '../composer/tool-tip'
import { isChatDocumentFile } from '../composer/meal-image-pick'
import { requestDocumentCompare } from './api'
import { compareMessageText } from './message'
import { saveCompareFiles } from './files'
import { saveDocumentCompare } from './store'

const ACCEPT = '.pdf,.docx,.xlsx,.xlsm,.xls,.txt,.md,.csv,.json,.html,.htm,.xml,.rtf,.log'

function takeFile(file: File | undefined) {
  if (!file) return null
  if (file.name.toLowerCase().endsWith('.doc')) {
    toast.error('Старый формат .doc не читается. Сохраните файл как .docx.')
    return null
  }
  if (!isChatDocumentFile(file)) {
    toast.error('Нужен документ: Word, PDF, Excel или текст')
    return null
  }
  if (file.size === 0) {
    toast.error('Файл пустой')
    return null
  }
  if (file.size > 20 * 1024 * 1024) {
    toast.error('Файл больше 20 МБ')
    return null
  }
  return file
}

function FileSlot({
  label,
  file,
  disabled,
  onPick,
  onClear,
}: {
  label: string
  file: File | null
  disabled: boolean
  onPick: (file: File) => void
  onClear: () => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[var(--nora-border)] bg-[var(--nora-surface)] px-3 py-2.5">
      <input
        accept={ACCEPT}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const next = takeFile(event.target.files?.[0])
          event.target.value = ''
          if (next) onPick(next)
        }}
        type="file"
      />
      {file ? <FileTypeIcon name={file.name} /> : <Columns2Icon className="size-4 text-[var(--nora-text-secondary)]" />}
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] leading-4 text-[var(--nora-text-secondary)]">{label}</span>
        <span className="block truncate text-[13px] leading-5 font-medium">{file ? file.name : 'Выбрать файл'}</span>
      </span>
      {file ? (
        <button
          aria-label={`Убрать ${label}`}
          className="inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)]"
          disabled={disabled}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onClear()
          }}
          type="button"
        >
          <XIcon className="size-3.5" />
        </button>
      ) : null}
    </label>
  )
}

export function CompareDocumentsButton({ disabled = false }: { disabled?: boolean }) {
  const auth = useAuth()
  const aui = useAui()
  const [open, setOpen] = useState(false)
  const [left, setLeft] = useState<File | null>(null)
  const [right, setRight] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const ready = Boolean(left && right) && !sending

  function close(next: boolean) {
    if (sending) return
    setOpen(next)
    if (!next) {
      setLeft(null)
      setRight(null)
    }
  }

  async function send() {
    if (!left || !right || sending) return
    setSending(true)
    try {
      const result = await requestDocumentCompare(auth.transport, left, right)
      const id = crypto.randomUUID()
      saveDocumentCompare({
        id,
        leftName: result.leftName,
        rightName: result.rightName,
        leftText: result.leftText,
        rightText: result.rightText,
      })
      await saveCompareFiles(id, left, right)
      await aui.thread().append({
        role: 'user',
        content: [{ type: 'text', text: `Сравнить «${result.leftName}» и «${result.rightName}»` }],
        startRun: false,
      })
      await aui.thread().append({
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: compareMessageText(
              { id, leftName: result.leftName, rightName: result.rightName },
              result.summary,
            ),
          },
        ],
        startRun: false,
      })
      setSending(false)
      setLeft(null)
      setRight(null)
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof ApiRequestError || error instanceof Error ? error.message : 'Не удалось сравнить документы')
      setSending(false)
    }
  }

  return (
    <>
      <ComposerToolTip label="Сравнить документы">
        <button
          aria-label="Сравнить документы"
          className={cn(dialogComposerToolClass(false, disabled), 'size-8')}
          disabled={disabled}
          onClick={() => setOpen(true)}
          type="button"
        >
          <Columns2Icon className="size-4" />
        </button>
      </ComposerToolTip>
      <Dialog onOpenChange={close} open={open}>
        <DialogContent className="md:!max-w-[28rem]" showCloseButton={!sending}>
          <DialogHeader>
            <DialogTitle>Сравнение документов</DialogTitle>
            <DialogDescription className="pt-1 text-[13px] leading-5">
              Прикрепите две версии. Первый файл сравнивается со вторым.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 px-[15px] pt-3">
            <FileSlot disabled={sending} file={left} label="Первый документ" onClear={() => setLeft(null)} onPick={setLeft} />
            <FileSlot disabled={sending} file={right} label="Второй документ" onClear={() => setRight(null)} onPick={setRight} />
          </div>
          <DialogFooter>
            <button
              className={cn(
                'inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--nora-text)] px-4 text-[13px] font-medium text-[var(--nora-panel)] disabled:cursor-not-allowed disabled:opacity-50',
              )}
              disabled={!ready}
              onClick={() => void send()}
              type="button"
            >
              {sending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {sending ? 'Сравниваем' : 'Отправить'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
