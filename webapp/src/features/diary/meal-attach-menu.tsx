import * as React from 'react'
import { CameraIcon, ImageIcon, PlusIcon } from '@/components/icons'
import { toast } from '@/components/ui/toast'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { pickHybridMealImage } from '@/platform/hybrid-camera'

import {
  fileToMealImage,
  mealAttachPickerMode,
  mealImagePickInputProps,
  type MealImageMime,
  type MealImagePickSource,
} from './meal-image-pick'

export function queueMealImageFile(
  file: File,
  handlers: {
    onAttached: (input: {
      id: string
      base64: string
      mime: MealImageMime
      name: string
    }) => void
    onPicked?: (input: { id: string; file: File }) => void
    onPickFailed?: (id: string) => void
  },
) {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${file.name}`
  handlers.onPicked?.({ id, file })
  void fileToMealImage(file)
    .then((parsed) => handlers.onAttached({ id, ...parsed, name: file.name }))
    .catch((error: unknown) => {
      handlers.onPickFailed?.(id)
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить фото')
    })
}

const plusButtonClass = (disabled: boolean) =>
  cn(
    'nora-press-grow ios-glass-glare inline-flex size-8 shrink-0 items-center justify-center rounded-full border-0 bg-[var(--nora-input-bg)]/72 text-[var(--nora-text)] outline-none backdrop-blur-[16px] shadow-[inset_0_1px_0_color-mix(in_srgb,white_70%,transparent)]',
    disabled
      ? 'cursor-not-allowed opacity-60'
      : 'cursor-pointer hover:bg-[var(--nora-input-bg)]',
  )

export function MealAttachMenu({
  disabled = false,
  pressed = false,
  onAttached,
  onPicked,
  onPickFailed,
  onFiles,
}: {
  disabled?: boolean
  pressed?: boolean
  onAttached: (input: {
    id: string
    base64: string
    mime: MealImageMime
    name: string
  }) => void
  /** Fires as soon as a file is chosen, before it is read — use for instant preview. */
  onPicked?: (input: { id: string; file: File }) => void
  onPickFailed?: (id: string) => void
  /** Several files at once: gallery multi-select. The caller applies the attach limit. */
  onFiles?: (files: File[]) => void
}) {
  const galleryRef = React.useRef<HTMLInputElement>(null)
  const cameraRef = React.useRef<HTMLInputElement>(null)
  const [coarsePointer, setCoarsePointer] = React.useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(pointer: coarse)').matches
      : false,
  )
  const galleryProps = mealImagePickInputProps('gallery')
  const cameraProps = mealImagePickInputProps('camera')
  const useMenu = mealAttachPickerMode({ matches: coarsePointer }) === 'menu'

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const query = window.matchMedia('(pointer: coarse)')
    const sync = () => setCoarsePointer(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  function applyFile(file: File | undefined) {
    if (!file) return
    queueMealImageFile(file, { onAttached, onPicked, onPickFailed })
  }

  function applyFiles(files: File[]) {
    if (files.length === 0) return
    if (onFiles) {
      onFiles(files)
      return
    }
    for (const file of files) applyFile(file)
  }

  function onInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    applyFiles(files)
  }

  async function pickSource(source: MealImagePickSource) {
    const picked = await pickHybridMealImage(source)
    if (picked.kind === 'file') {
      applyFiles([picked.file])
      return
    }
    if (picked.kind === 'canceled') return
    if (picked.kind === 'unavailable') {
      toast.error(source === 'camera' ? 'Не удалось открыть камеру' : 'Не удалось открыть галерею')
      return
    }
    if (source === 'camera') cameraRef.current?.click()
    else galleryRef.current?.click()
  }

  return (
    <>
      <input
        {...galleryProps}
        className="hidden"
        multiple
        onChange={onInputChange}
        ref={galleryRef}
        type="file"
      />
      {useMenu ? (
        <input
          {...cameraProps}
          className="hidden"
          onChange={onInputChange}
          ref={cameraRef}
          type="file"
        />
      ) : null}
      {useMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            nativeButton
            render={
              <button
                aria-label="Добавить фото"
                className={plusButtonClass(disabled)}
                data-demo-pressed={pressed ? '' : undefined}
                disabled={disabled}
                type="button"
              />
            }
          >
            <PlusIcon className="size-[18px]" strokeWidth={1.75} />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="min-w-[12.5rem] rounded-[16px]! border-[color-mix(in_srgb,var(--nora-menu-border)_45%,var(--nora-panel))] p-1! text-[16px] font-medium"
            side="top"
            sideOffset={6}
          >
            <DropdownMenuItem
              className="h-12 gap-3 rounded-[12px]! px-3.5 text-[16px] font-medium leading-none text-[var(--nora-text-secondary)] data-highlighted:text-[var(--nora-text)]"
              onClick={() => void pickSource('gallery')}
            >
              <ImageIcon className="size-6" strokeWidth={1.75} />
              Изображение
            </DropdownMenuItem>
            <DropdownMenuItem
              className="h-12 gap-3 rounded-[12px]! px-3.5 text-[16px] font-medium leading-none text-[var(--nora-text-secondary)] data-highlighted:text-[var(--nora-text)]"
              onClick={() => void pickSource('camera')}
            >
              <CameraIcon className="size-6" strokeWidth={1.75} />
              Камера
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <button
          aria-label="Добавить фото"
          className={plusButtonClass(disabled)}
          data-demo-pressed={pressed ? '' : undefined}
          disabled={disabled}
          onClick={() => void pickSource('gallery')}
          type="button"
        >
          <PlusIcon className="size-[18px]" strokeWidth={1.75} />
        </button>
      )}
    </>
  )
}
