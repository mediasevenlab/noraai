import * as React from 'react'
import { DotLottieReact, type DotLottie } from '@lottiefiles/dotlottie-react'
import { BrandMark } from '@/components/dashboard/BrandMark'
import { NoraSlider } from '@/components/nora/primitives'
import { BrainIcon, ChevronDownIcon, GlobeIcon, HistoryIcon, Maximize2Icon, Minimize2Icon, SettingsIcon } from '@/components/icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SettingsEntry } from '@/components/settings-canvas'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { ApiRequestError, type AuthenticatedTransport } from '@/platform/api'
import { cn } from '@/lib/utils'

import { chatWithNoraModel, transcribeModelChat } from './api'
import { parseChatMarkdown, type ChatInline } from './chat-markdown'
import { ComposerAttachChips } from './composer-ui'
import { ComposerTypedText } from './composer-typed-text'
import { ComposerPressSurface } from './ComposerPressSurface'
import { MealAttachMenu, queueMealImageFile } from './meal-attach-menu'
import { pastedMealImageFiles, type MealImageMime } from './meal-image-pick'
import {
  MEAL_COMPOSER_FIELD_CLASS,
  MEAL_DIALOG_FRAME_CLASS,
  MEAL_DIALOG_OVERLAY_CHIP_CLASS,
  MEAL_MODAL_CHIP_CLASS,
  MealComposerSendButton,
  MealDialogCloseButton,
  mealComposerSendTone,
} from './meal-sheet'
import { MealVoiceControls } from './MealVoiceControls'
import { appendVoiceTranscript } from './voice-input'

const PHOTO_LIMIT = 4

type ChatImage = { base64: string; mime: MealImageMime }

type ChatLine = {
  id: string
  role: 'user' | 'assistant'
  text: string
  images?: ChatImage[]
  previews?: string[]
  model?: string
  /** Shown in the window, never sent back to the model. */
  local?: boolean
  /** Status line while the model is still working. */
  pending?: boolean
  /** The pending line was sent with internet search. */
  searching?: boolean
  /** The reply is an error, so the character shakes its head. */
  failed?: boolean
  /** Fresh reply types in, the same way a formed meal card fills. */
  typing?: boolean
  /** The opening line, so the greeting gesture stays on this bubble. */
  greeting?: boolean
}

type Attach = {
  id: string
  base64: string
  mime: MealImageMime
  name: string
  previewUrl: string
}

const NORA_HELLO = 'Привет, я Nora. Напишите, продиктуйте или прикрепите фото — помогу разобраться.'

function helloLine(): ChatLine {
  return { id: lineId(), role: 'assistant', text: NORA_HELLO, local: true, greeting: true, typing: true }
}

function lineId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`
}

function replyError(error: unknown) {
  if (error instanceof ApiRequestError && error.message.trim()) return error.message
  return 'Не удалось получить ответ. Попробуйте ещё раз.'
}

type NoraCharacter = 'face' | 'robo' | 'cat'

const CHARACTER_KEY = 'nora-chat-character'

function readCharacter(): NoraCharacter {
  try {
    const stored = localStorage.getItem(CHARACTER_KEY)
    if (stored === 'face' || stored === 'robo' || stored === 'cat') return stored
  } catch {
    // The visit keeps the current character.
  }
  return 'cat'
}

type NoraMood = 'idle' | 'greet' | 'think' | 'search' | 'talk' | 'deny' | 'mode'

const MOODS: { id: NoraMood; label: string }[] = [
  { id: 'idle', label: 'Покой' },
  { id: 'greet', label: 'Приветствие' },
  { id: 'think', label: 'Думает' },
  { id: 'search', label: 'Ищет' },
  { id: 'talk', label: 'Печатает' },
  { id: 'deny', label: 'Ошибка' },
  { id: 'mode', label: 'Режим' },
]

const CLIP_CATALOG: Record<NoraCharacter, { id: string; label: string; src?: string }[]> = {
  face: [
    { id: 'rest', label: 'Моргает' },
    { id: 'look', label: 'Смотрит' },
    { id: 'speak', label: 'Говорит' },
  ],
  robo: [
    { id: 'idle', label: 'Покой' },
    { id: 'think', label: 'Думает' },
    { id: 'jump', label: 'Прыжок' },
    { id: 'yes', label: 'Кивок' },
    { id: 'no', label: 'Отказ' },
    { id: 'alert', label: 'Тревога' },
  ],
  cat: [
    { id: 'sleep', label: 'Сон', src: '/nora/cat/cat-sleep.lottie' },
    { id: 'loading', label: 'Загрузка', src: '/nora/cat/cat-loading.lottie' },
    { id: 'roll', label: 'Катается', src: '/nora/cat/cat-roll.lottie' },
    { id: 'drive', label: 'Едет', src: '/nora/cat/cat-drive.lottie' },
    { id: 'laugh', label: 'Смех', src: '/nora/cat/cat-laugh.lottie' },
    { id: 'thanks', label: 'Спасибо', src: '/nora/cat/cat-thanks.lottie' },
    { id: 'love', label: 'Любовь', src: '/nora/cat/cat-love.lottie' },
    { id: 'cry', label: 'Плачет', src: '/nora/cat/cat-cry.lottie' },
  ],
}

type MotionMap = Record<NoraCharacter, Record<NoraMood, string>>

const MOTION_KEY = 'nora-chat-motions'

function defaultMotions(): MotionMap {
  return {
    face: { idle: 'rest', greet: 'speak', think: 'look', search: 'look', talk: 'speak', deny: 'look', mode: 'look' },
    robo: { idle: 'idle', greet: 'yes', think: 'think', search: 'jump', talk: 'yes', deny: 'no', mode: 'alert' },
    cat: { idle: 'sleep', greet: 'drive', think: 'loading', search: 'roll', talk: 'laugh', deny: 'cry', mode: 'drive' },
  }
}

const AVATAR_SIZE_KEY = 'nora-chat-avatar-size'
const AVATAR_SIZE_MIN = 40
const AVATAR_SIZE_MAX = 96
const AVATAR_SIZE_DEFAULT = 64

function readAvatarSize() {
  try {
    const raw = localStorage.getItem(AVATAR_SIZE_KEY)
    if (!raw) return AVATAR_SIZE_DEFAULT
    const value = Number(raw)
    if (Number.isFinite(value)) {
      return Math.min(AVATAR_SIZE_MAX, Math.max(AVATAR_SIZE_MIN, Math.round(value)))
    }
  } catch {
    // Keep the starting size.
  }
  return AVATAR_SIZE_DEFAULT
}

function readMotions(): MotionMap {
  const motions = defaultMotions()
  try {
    const raw = localStorage.getItem(MOTION_KEY)
    if (!raw) return motions
    const parsed = JSON.parse(raw) as Partial<MotionMap>
    for (const character of ['face', 'robo', 'cat'] as const) {
      const saved = parsed[character]
      if (!saved) continue
      for (const mood of MOODS) {
        const clip = saved[mood.id]
        if (CLIP_CATALOG[character].some((item) => item.id === clip)) motions[character][mood.id] = clip
      }
    }
  } catch {
    // Keep the starting assignment.
  }
  return motions
}

export function ModelChatSettings({ transport }: { transport: AuthenticatedTransport }) {
  const [open, setOpen] = React.useState(false)
  const [webAccess, setWebAccess] = React.useState(true)
  const [wide, setWide] = React.useState(false)
  const [character, setCharacter] = React.useState<NoraCharacter>(readCharacter)
  const [characterOpen, setCharacterOpen] = React.useState(false)
  const [motions, setMotions] = React.useState(readMotions)
  const [avatarSize, setAvatarSize] = React.useState(readAvatarSize)
  const [modeFlash, setModeFlash] = React.useState(false)
  const modeTimerRef = React.useRef<number | null>(null)
  const webAccessRef = React.useRef(true)
  const [lines, setLines] = React.useState<ChatLine[]>([])
  const [note, setNote] = React.useState('')
  const [attaches, setAttaches] = React.useState<Attach[]>([])
  const [busy, setBusy] = React.useState(false)
  const abortRef = React.useRef<AbortController | null>(null)
  const scrollerRef = React.useRef<HTMLDivElement>(null)
  const reading = attaches.some((item) => !item.base64)
  const canSend = !busy && !reading && (note.trim().length > 0 || attaches.some((item) => item.base64))

  React.useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollTop = scroller.scrollHeight
  }, [lines, open])

  React.useEffect(
    () => () => {
      if (modeTimerRef.current != null) window.clearTimeout(modeTimerRef.current)
    },
    [],
  )

  function playModeGesture() {
    setModeFlash(true)
    if (modeTimerRef.current != null) window.clearTimeout(modeTimerRef.current)
    modeTimerRef.current = window.setTimeout(() => setModeFlash(false), 2200)
  }

  function openChat(next: boolean) {
    setOpen(next)
    if (!next) setCharacterOpen(false)
    if (next) setLines((current) => (current.length === 0 ? [helloLine()] : current))
  }

  function chooseCharacter(next: NoraCharacter) {
    setCharacter(next)
    try {
      localStorage.setItem(CHARACTER_KEY, next)
    } catch {
      // The choice still applies for this visit.
    }
  }

  function chooseAvatarSize(next: number) {
    const size = Math.min(AVATAR_SIZE_MAX, Math.max(AVATAR_SIZE_MIN, Math.round(next)))
    setAvatarSize(size)
    try {
      localStorage.setItem(AVATAR_SIZE_KEY, String(size))
    } catch {
      // The size still applies for this visit.
    }
  }

  function assignMotion(owner: NoraCharacter, mood: NoraMood, clip: string) {
    setMotions((current) => {
      const next = { ...current, [owner]: { ...current[owner], [mood]: clip } }
      try {
        localStorage.setItem(MOTION_KEY, JSON.stringify(next))
      } catch {
        // The choice still applies for this visit.
      }
      return next
    })
  }

  function dropPreviews(items: Attach[]) {
    for (const item of items) URL.revokeObjectURL(item.previewUrl)
  }

  function reset() {
    abortRef.current?.abort()
    abortRef.current = null
    setBusy(false)
    setLines([helloLine()])
    setNote('')
    setAttaches((current) => {
      dropPreviews(current)
      return []
    })
  }

  function acceptFiles(files: File[]) {
    if (busy || files.length === 0) return
    const room = Math.max(0, PHOTO_LIMIT - attaches.length)
    if (room === 0 || files.length > room) toast.message('В тестовом чате не больше 4 фото')
    for (const file of files.slice(0, room)) {
      queueMealImageFile(file, {
        onPicked: ({ id, file: picked }) => {
          setAttaches((current) => [
            ...current,
            {
              id,
              base64: '',
              mime: 'image/jpeg',
              name: picked.name,
              previewUrl: URL.createObjectURL(picked),
            },
          ])
        },
        onAttached: ({ id, base64, mime, name }) => {
          setAttaches((current) =>
            current.map((item) => (item.id === id ? { ...item, base64, mime, name } : item)),
          )
        },
        onPickFailed: (id) => {
          setAttaches((current) => {
            const failed = current.find((item) => item.id === id)
            if (failed) URL.revokeObjectURL(failed.previewUrl)
            return current.filter((item) => item.id !== id)
          })
        },
      })
    }
  }

  async function send() {
    const text = note.trim()
    const photos = attaches.filter((item) => item.base64)
    if (!canSend) return
    const images = photos.map((item) => ({ base64: item.base64, mime: item.mime }))
    const userLine: ChatLine = {
      id: lineId(),
      role: 'user',
      text,
      images: images.length > 0 ? images : undefined,
      previews: photos.map((item) => `data:${item.mime};base64,${item.base64}`),
    }
    const pendingId = lineId()
    const search = webAccessRef.current
    const history = [...lines.filter((line) => !line.local), userLine]
    setLines([
      ...history,
      {
        id: pendingId,
        role: 'assistant',
        text: search ? 'Nora отвечает…' : 'Nora отвечает без интернета…',
        local: true,
        pending: true,
        searching: search,
      },
    ])
    setNote('')
    setAttaches([])
    dropPreviews(attaches)
    setBusy(true)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const result = await chatWithNoraModel(
        transport,
        history.map((line) => ({
          role: line.role,
          text: line.text,
          ...(line.images?.length ? { images: line.images } : {}),
        })),
        controller.signal,
        search,
      )
      if (controller.signal.aborted) return
      setLines((current) =>
        current.map((line) =>
          line.id === pendingId
            ? { id: pendingId, role: 'assistant', text: result.reply, model: result.model, typing: true }
            : line,
        ),
      )
    } catch (error) {
      if (controller.signal.aborted) return
      setLines((current) =>
        current.map((line) =>
          line.id === pendingId
            ? { id: pendingId, role: 'assistant', text: replyError(error), local: true, failed: true, typing: true }
            : line,
        ),
      )
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setBusy(false)
      }
    }
  }

  return (
    <SettingsEntry
      description="Временный чат с текстовой моделью и моделью с картинками. Голос распознаёт речевая модель, текстовый ответ может искать в интернете. Сброс начинает разговор заново."
      descriptionClassName="max-w-none line-clamp-none overflow-visible"
      title="Проверка моделей"
    >
      <button
        className="cursor-pointer rounded-full bg-[var(--settings-field-bg,var(--nora-panel))] px-3"
        onClick={() => openChat(true)}
        type="button"
      >
        Открыть чат
      </button>
      <Dialog onOpenChange={openChat} open={open}>
        <DialogContent
          className={cn(
            MEAL_DIALOG_FRAME_CLASS,
            'md:transition-[width,max-width] md:duration-500 md:ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
            wide && 'md:w-[min(100%-2rem,920px)] md:max-w-[920px]',
          )}
          data-phone-full=""
          showCloseButton={false}
        >
          <DialogHeader className="min-w-0 shrink-0 gap-0 bg-[var(--nora-modal)] px-3 pt-3 text-left sm:px-4 sm:pt-3.5">
            <div className="relative flex min-h-9 items-center">
              <BrandMark className="rounded-full bg-black" />
              <div className="pointer-events-none absolute inset-x-0 flex justify-center">
                <div
                  aria-label="Доступ в интернет"
                  className="ios-float-pill pointer-events-auto relative z-10 flex h-9 shrink-0 items-center rounded-full p-1"
                  role="group"
                >
                  {(
                    [
                      { web: false, label: 'Офлайн', Icon: BrainIcon },
                      { web: true, label: 'Онлайн', Icon: GlobeIcon },
                    ] as const
                  ).map((option) => (
                    <button
                      aria-pressed={webAccess === option.web}
                      className="ios-float-seg nora-press-grow inline-flex h-full flex-none items-center justify-center gap-1 rounded-full px-3 text-[13px] font-normal leading-none text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)] data-active:text-[var(--nora-text)]"
                      data-active={webAccess === option.web || undefined}
                      key={option.label}
                      onClick={() => {
                        if (webAccessRef.current === option.web) return
                        webAccessRef.current = option.web
                        setWebAccess(option.web)
                        playModeGesture()
                      }}
                      type="button"
                    >
                      <option.Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <DialogTitle className="sr-only">Чат с моделью</DialogTitle>
              <div className="ml-auto flex items-center gap-1.5">
                <button
                  aria-expanded={characterOpen}
                  aria-label="Персонаж"
                  aria-pressed={characterOpen}
                  className={cn(
                    MEAL_DIALOG_OVERLAY_CHIP_CLASS,
                    'nora-press-grow size-8 shrink-0 bg-[var(--nora-inset)] text-[var(--nora-text-secondary)] shadow-[0_1px_2px_color-mix(in_srgb,var(--nora-text)_8%,transparent)]',
                    'hover:text-[var(--nora-text)] focus-visible:shadow-[var(--nora-shadow-focus)]',
                    characterOpen && 'bg-[var(--nora-text)] text-[var(--nora-panel)] hover:text-[var(--nora-panel)]',
                  )}
                  onClick={() => setCharacterOpen((current) => !current)}
                  type="button"
                >
                  <SettingsIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
                </button>
                <button
                  aria-label={wide ? 'Обычная ширина' : 'Сделать шире'}
                  aria-pressed={wide}
                  className={cn(
                    MEAL_DIALOG_OVERLAY_CHIP_CLASS,
                    'nora-press-grow hidden size-8 shrink-0 bg-[var(--nora-inset)] shadow-[0_1px_2px_color-mix(in_srgb,var(--nora-text)_8%,transparent)] md:inline-flex',
                    'hover:text-[var(--nora-text)] focus-visible:shadow-[var(--nora-shadow-focus)]',
                  )}
                  onClick={() => setWide((current) => !current)}
                  type="button"
                >
                  {wide ? (
                    <Minimize2Icon aria-hidden className="size-3.5" strokeWidth={1.75} />
                  ) : (
                    <Maximize2Icon aria-hidden className="size-3.5" strokeWidth={1.75} />
                  )}
                </button>
                <MealDialogCloseButton className="md:hidden" />
              </div>
            </div>
            <div aria-hidden className="mt-3 border-t border-[var(--nora-divider)]" />
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-2" ref={scrollerRef}>
            {characterOpen ? (
              <CharacterPicker
                avatarSize={avatarSize}
                character={character}
                motions={motions}
                onAssign={assignMotion}
                onChoose={chooseCharacter}
                onSize={chooseAvatarSize}
              />
            ) : null}
            {characterOpen && lines.length > 0 ? (
              <div aria-hidden className="my-3 border-t border-[var(--nora-divider)]" />
            ) : null}
            {lines.length === 0 && !characterOpen ? (
              <p className="py-8 text-center text-[13px] font-light leading-5 text-[var(--nora-text-tertiary)]">
                Напишите сообщение, продиктуйте его или прикрепите фото.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {lines.map((line, index) => {
                  const lastAssistant =
                    modeFlash && lines.slice(index + 1).every((item) => item.role !== 'assistant') && line.role === 'assistant'
                  const mood = lastAssistant ? 'mode' : faceMood(line)
                  return (
                  <ChatBubble
                    character={character}
                    clip={motions[character][mood]}
                    key={line.id}
                    line={line}
                    onTyped={
                      line.typing
                        ? () => {
                            setLines((current) =>
                              current.map((item) =>
                                item.id === line.id ? { ...item, typing: false } : item,
                              ),
                            )
                          }
                        : undefined
                    }
                    size={avatarSize}
                  />
                  )
                })}
              </div>
            )}
          </div>
          <div className="px-3 pt-2 pb-3">
            <ComposerPressSurface className={MEAL_COMPOSER_FIELD_CLASS}>
              <ComposerAttachChips
                disabled={busy}
                items={attaches.map((item) => ({
                  id: item.id,
                  name: item.name,
                  src: item.base64 ? `data:${item.mime};base64,${item.base64}` : item.previewUrl,
                }))}
                onRemove={(id) => {
                  setAttaches((current) => {
                    const removed = current.find((item) => item.id === id)
                    if (removed) URL.revokeObjectURL(removed.previewUrl)
                    return current.filter((item) => item.id !== id)
                  })
                }}
              />
              <textarea
                aria-label="Сообщение"
                className="field-sizing-content max-h-40 min-h-[20px] w-full resize-none overflow-y-auto border-0 bg-transparent p-0 font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text)] outline-none placeholder:font-light placeholder:font-[300] placeholder:text-[var(--nora-input-placeholder)] no-scrollbar"
                disabled={busy}
                onChange={(event) => setNote(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void send()
                  }
                }}
                onPaste={(event) => {
                  const files = pastedMealImageFiles(event)
                  if (files.length > 0) acceptFiles(files)
                }}
                placeholder="Начните печатать"
                rows={1}
                value={note}
              />
              <div className="flex items-center gap-2 pt-4">
                <MealAttachMenu disabled={busy} onAttached={() => undefined} onFiles={acceptFiles} />
                <button
                  className={cn(
                    MEAL_MODAL_CHIP_CLASS,
                    'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border-0 py-0 pr-3 pl-2.5 text-[13px] font-normal leading-none text-[var(--nora-text)] hover:bg-[var(--nora-input-bg)]',
                  )}
                  onClick={reset}
                  type="button"
                >
                  <HistoryIcon className="size-3.5" strokeWidth={1.75} />
                  Сбросить
                </button>
                <div className="flex-1" />
                <MealVoiceControls
                  disabled={busy}
                  encodeWav
                  onTranscript={(text) => setNote((current) => appendVoiceTranscript(current, text))}
                  transcribe={(audio) => transcribeModelChat(transport, audio)}
                  sendButton={
                    <MealComposerSendButton
                      idleLabel="Отправить"
                      onClick={() => void send()}
                      sendingLabel="Модель отвечает"
                      tone={mealComposerSendTone({ sending: busy, hasDraft: canSend })}
                    />
                  }
                  transport={transport}
                />
              </div>
            </ComposerPressSurface>
          </div>
        </DialogContent>
      </Dialog>
    </SettingsEntry>
  )
}

const ROBO_EVENT: Record<string, string | null> = {
  idle: null,
  think: 'thinkClick',
  jump: 'jumpClick',
  yes: 'yesClick',
  no: 'noClick',
  alert: 'alertClick',
}

function faceMood(line: ChatLine): NoraMood {
  if (line.pending) return line.searching ? 'search' : 'think'
  if (line.greeting) return 'greet'
  if (line.typing) return line.failed ? 'deny' : 'talk'
  return 'idle'
}

function motionReduced() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * AI robo by Maxence Chanel on LottieFiles, Lottie Simple License.
 * https://lottiefiles.com/free-animation/ai-robo-ldhczFXzZC
 * Gestures play once and return to idle, so a long mood starts the same gesture again.
 */
function NoraFace({ className, gesture, size }: { className?: string; gesture: string; size?: number }) {
  const gestureRef = React.useRef(gesture)
  const playerRef = React.useRef<DotLottie | null>(null)
  const actingRef = React.useRef(false)
  gestureRef.current = gesture

  const play = React.useCallback((instance: DotLottie) => {
    const event = ROBO_EVENT[gestureRef.current]
    if (!event || motionReduced()) return
    actingRef.current = true
    instance.stateMachineFireEvent(event)
  }, [])

  React.useEffect(() => {
    const instance = playerRef.current
    if (!instance?.isStateMachineRunning) return
    play(instance)
  }, [gesture, play])

  return (
    <AvatarSlot className={className} size={size}>
      <DotLottieReact
        autoplay
        backgroundColor="transparent"
        className="size-full"
        dotLottieRefCallback={(instance) => {
          playerRef.current = instance
          if (!instance) return
          instance.addEventListener('stateMachineStart', () => play(instance))
          instance.addEventListener('stateMachineStateEntered', (event) => {
            if (event.state !== 'idle' || !actingRef.current) return
            actingRef.current = false
            play(instance)
          })
          if (motionReduced()) instance.addEventListener('ready', () => instance.freeze())
        }}
        layout={{ fit: 'cover', align: [0.5, 0.5] }}
        loop
        src="/nora/ai-robo.lottie"
        stateMachineId="StateMachine1"
      />
    </AvatarSlot>
  )
}

function AvatarSlot({
  className,
  children,
  size,
}: {
  className?: string
  children: React.ReactNode
  size?: number
}) {
  return (
    <div
      aria-hidden
      className={cn('flex-none shrink-0 overflow-hidden rounded-full', size == null && 'size-16', className)}
      style={size != null ? { width: size, height: size, minWidth: size, minHeight: size } : undefined}
    >
      {children}
    </div>
  )
}

function faceVisual(clip: string): 'idle' | 'think' | 'talk' {
  if (clip === 'speak') return 'talk'
  if (clip === 'look') return 'think'
  return 'idle'
}

function ChatAvatar({
  character,
  className,
  clip,
  size,
}: {
  character: NoraCharacter
  className?: string
  clip: string
  size?: number
}) {
  if (character === 'face') return <ClassicFace className={className} mood={faceVisual(clip)} size={size} />
  if (character === 'cat') return <CatFace className={className} clip={clip} size={size} />
  return <NoraFace className={className} gesture={clip} size={size} />
}

/**
 * Cat clips, Lottie Simple License:
 * sleep — Cảnh Ngô; loading — Miroslav; rolling — wa.__.wa; drive — mahoga4886;
 * laugh and cry — Abdul Latif; thanks — Raiha Naqvi; love — el.
 */
function CatFace({ className, clip, size }: { className?: string; clip: string; size?: number }) {
  const src = CLIP_CATALOG.cat.find((item) => item.id === clip)?.src ?? CLIP_CATALOG.cat[0]?.src
  if (!src) return null
  return (
    <AvatarSlot className={className} size={size}>
      <DotLottieReact
        autoplay
        backgroundColor="transparent"
        className="size-full"
        key={src}
        layout={{ fit: 'cover', align: [0.5, 0.5] }}
        loop
        src={src}
      />
    </AvatarSlot>
  )
}
function ClassicFace({
  className,
  mood,
  size,
}: {
  className?: string
  mood: 'idle' | 'think' | 'talk'
  size?: number
}) {
  return (
    <span
      aria-hidden
      className={cn('nora-face inline-flex flex-none shrink-0', size == null && 'size-16', className)}
      data-mood={mood}
      style={size != null ? { width: size, height: size, minWidth: size, minHeight: size } : undefined}
    >
      <svg className="size-full" viewBox="0 0 32 32">
        <circle className="fill-sidebar-primary" cx="16" cy="16" r="14" />
        <g className="nora-face-eyes">
          <ellipse className="fill-sidebar-primary-foreground" cx="11.5" cy="15" rx="2.1" ry="3.1" />
          <ellipse className="fill-sidebar-primary-foreground" cx="20.5" cy="15" rx="2.1" ry="3.1" />
        </g>
        <path
          className="fill-none stroke-sidebar-primary-foreground"
          d="M12.4 20.2c1.05 1.15 2.25 1.7 3.6 1.7s2.55-.55 3.6-1.7"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      </svg>
    </span>
  )
}

const CHARACTERS = [
  { id: 'face', label: 'Лицо' },
  { id: 'robo', label: 'Робот' },
  { id: 'cat', label: 'Кот' },
] as const satisfies ReadonlyArray<{ id: NoraCharacter; label: string }>

function CharacterPicker({
  avatarSize,
  character,
  motions,
  onAssign,
  onChoose,
  onSize,
}: {
  avatarSize: number
  character: NoraCharacter
  motions: MotionMap
  onAssign: (owner: NoraCharacter, mood: NoraMood, clip: string) => void
  onChoose: (next: NoraCharacter) => void
  onSize: (next: number) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-[family-name:var(--nora-font)] text-[13px] font-medium leading-5 text-[var(--nora-text)]">
        Персонаж
      </p>
      <div className="grid grid-cols-3 gap-2">
        {CHARACTERS.map((option) => {
          const selected = character === option.id
          return (
            <button
              aria-pressed={selected}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-2 rounded-[18px] bg-[var(--nora-inset)] px-3 py-4',
                'font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5 text-[var(--nora-text)]',
                selected && 'shadow-[inset_0_0_0_1.5px_var(--nora-text)]',
              )}
              key={option.id}
              onClick={() => onChoose(option.id)}
              type="button"
            >
              <ChatAvatar character={option.id} className="size-14" clip={motions[option.id].idle} />
              {option.label}
            </button>
          )
        })}
      </div>
      <div className="flex flex-col gap-1.5 border-t border-[var(--nora-divider)] pt-3">
        <div className="flex items-center justify-between font-[family-name:var(--nora-font)] text-[13px] leading-5">
          <p className="font-medium text-[var(--nora-text)]">Размер</p>
          <p className="text-[var(--nora-text-secondary)]">{avatarSize}</p>
        </div>
        <NoraSlider
          aria-label="Размер персонажа"
          max={AVATAR_SIZE_MAX}
          min={AVATAR_SIZE_MIN}
          onChange={(event) => onSize(Number(event.target.value))}
          step={4}
          value={avatarSize}
        />
      </div>
      <div className="flex flex-col gap-2">
        {MOODS.map((mood) => {
          const clipId = motions[character][mood.id]
          const clips = CLIP_CATALOG[character]
          const current = clips.find((item) => item.id === clipId) ?? clips[0]
          return (
            <div
              className="relative flex items-center gap-3 rounded-[18px] bg-[var(--nora-inset)] px-3 py-3"
              key={mood.id}
            >
              <span className="absolute top-2 right-2 inline-flex h-[22px] items-center rounded-full bg-[var(--nora-text)] px-2 font-[family-name:var(--nora-font)] text-[11px] font-medium leading-none text-[var(--nora-panel)]">
                {mood.label}
              </span>
              <ChatAvatar character={character} clip={clipId} size={avatarSize} />
              <DropdownMenu>
                  <DropdownMenuTrigger
                    className="inline-flex h-[var(--nora-control-h,30px)] max-w-full cursor-pointer items-center gap-1 rounded-[var(--nora-radius-menu-item,12px)] bg-[var(--nora-panel)] px-2.5 font-[family-name:var(--nora-font)] text-[13px] font-normal leading-none text-[var(--nora-text)] outline-none focus-visible:shadow-[var(--nora-shadow-focus)]"
                    type="button"
                  >
                    <span className="truncate">{current?.label}</span>
                    <ChevronDownIcon aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="account-workspace-menu min-w-40 rounded-[16px]!" sideOffset={6}>
                    <DropdownMenuRadioGroup
                      onValueChange={(value) => {
                        if (typeof value === 'string') onAssign(character, mood.id, value)
                      }}
                      value={clipId}
                    >
                      {clips.map((clip) => (
                        <DropdownMenuRadioItem key={clip.id} value={clip.id}>
                          {clip.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ChatBubble({
  character,
  clip,
  line,
  onTyped,
  size,
}: {
  character: NoraCharacter
  clip: string
  line: ChatLine
  onTyped?: () => void
  size: number
}) {
  const mine = line.role === 'user'
  return (
    <div className={cn('flex w-full items-center gap-2', mine ? 'justify-end' : 'justify-start')}>
      {mine ? null : (
        <ChatAvatar character={character} clip={clip} size={size} />
      )}
      <div
        className={cn(
          'flex w-fit max-w-[85%] flex-col gap-1.5 rounded-[18px] px-3.5 py-2 font-[family-name:var(--nora-font)] text-[13px] font-normal leading-5',
          mine
            ? 'rounded-br-[6px] bg-[var(--nora-text)] text-[var(--nora-panel)]'
            : 'rounded-bl-[6px] bg-[color-mix(in_srgb,var(--nora-input-bg)_68%,var(--nora-panel))] text-[var(--nora-text-secondary)]',
        )}
      >
        {line.previews && line.previews.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {line.previews.map((src) => (
              <img alt="" className="size-14 rounded-[10px] object-cover" key={src} src={src} />
            ))}
          </div>
        ) : null}
        {line.text && line.role === 'assistant' && !line.pending ? (
          line.typing ? (
            <ComposerTypedText live onComplete={onTyped} text={line.text} />
          ) : (
            <ChatFormattedText text={line.text} />
          )
        ) : line.text ? (
          <p className="whitespace-pre-wrap">{line.text}</p>
        ) : null}
        {line.model && !line.typing ? (
          <p className="text-[11px] font-light text-[var(--nora-text-tertiary)]">{line.model}</p>
        ) : null}
      </div>
    </div>
  )
}

function ChatFormattedText({ text }: { text: string }) {
  const blocks = parseChatMarkdown(text)
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {blocks.map((block, index) => {
        if (block.kind === 'heading') {
          return (
            <p className="font-medium text-[var(--nora-text)]" key={index}>
              <ChatInlines parts={block.inlines} />
            </p>
          )
        }
        if (block.kind === 'list') {
          const Tag = block.ordered ? 'ol' : 'ul'
          return (
            <Tag
              className={cn('flex flex-col gap-1 pl-4', block.ordered ? 'list-decimal' : 'list-disc')}
              key={index}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <ChatInlines parts={item} />
                </li>
              ))}
            </Tag>
          )
        }
        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                <ChatInlines parts={line} />
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

function ChatInlines({ parts }: { parts: ChatInline[] }) {
  return parts.map((part, index) => {
    if (part.kind === 'strong') {
      return (
        <strong className="font-medium text-[var(--nora-text)]" key={index}>
          {part.text}
        </strong>
      )
    }
    if (part.kind === 'em') return <em key={index}>{part.text}</em>
    if (part.kind === 'code') {
      return (
        <code className="rounded bg-[var(--nora-inset)] px-1" key={index}>
          {part.text}
        </code>
      )
    }
    if (part.kind === 'link') {
      return (
        <a
          className="break-all text-[var(--nora-text)] underline underline-offset-2"
          href={part.href}
          key={index}
          rel="noopener noreferrer"
          target="_blank"
        >
          {part.text}
        </a>
      )
    }
    return <span key={index}>{part.text}</span>
  })
}
