import type { UserDto } from '@web-app-demo/contracts'
import { useNavigate } from '@tanstack/react-router'
import { BadgeCheck as BadgeCheckIcon, CameraIcon } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

import { useSettingsDraft, useSettingsMode } from '@/components/settings-canvas'
import { cn } from '@/lib/utils'

export type ProfileMobileTab = 'profile' | 'questionnaire'

const AVATAR_KEY = (userId: string) => `24nutrition.profile-avatar.${userId}`
const COVER_KEY = (userId: string) => `24nutrition.profile-cover.${userId}`

function readAvatar(userId: string) {
  try {
    return localStorage.getItem(AVATAR_KEY(userId))
  } catch {
    return null
  }
}

function readCover(userId: string) {
  try {
    return localStorage.getItem(COVER_KEY(userId))
  } catch {
    return null
  }
}

function writeCover(userId: string, value: string | null) {
  try {
    if (value) localStorage.setItem(COVER_KEY(userId), value)
    else localStorage.removeItem(COVER_KEY(userId))
  } catch {
    // The photo stays for this visit if storage is full.
  }
}

function writeAvatar(userId: string, value: string | null) {
  try {
    if (value) localStorage.setItem(AVATAR_KEY(userId), value)
    else localStorage.removeItem(AVATAR_KEY(userId))
  } catch {
    // The photo stays for this visit if storage is full.
  }
}

function coverIsDark(src: string) {
  return new Promise<boolean>((resolve) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      const width = 24
      const height = 24
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) {
        resolve(false)
        return
      }
      context.drawImage(
        image,
        0,
        image.height * 0.45,
        image.width,
        image.height * 0.55,
        0,
        0,
        width,
        height,
      )
      const pixels = context.getImageData(0, 0, width, height).data
      let sum = 0
      const count = pixels.length / 4
      for (let index = 0; index < pixels.length; index += 4) {
        sum += 0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2]
      }
      resolve(sum / count < 150)
    }
    image.onerror = () => resolve(false)
    image.src = src
  })
}

function initials(user: UserDto) {
  const source = user.displayName?.trim() || user.nickname?.trim() || user.email
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  const letters = parts.length >= 2
    ? `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`
    : source.slice(0, 2)
  return letters.toUpperCase()
}

function loadImage(file: File, maxSize: number) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('image'))
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
        const width = Math.max(1, Math.round(image.width * scale))
        const height = Math.max(1, Math.round(image.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('canvas'))
          return
        }
        context.drawImage(image, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.86))
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

export function ProfileMobileMasthead({
  onTab,
  tab,
  user,
}: {
  onTab: (tab: ProfileMobileTab) => void
  tab: ProfileMobileTab
  user: UserDto
}) {
  const mode = useSettingsMode()
  const navigate = useNavigate()
  const mastheadRef = useRef<HTMLDivElement>(null)
  const dragOrigin = useRef<number | null>(null)
  const avatarRef = useRef<HTMLInputElement>(null)
  const coverRef = useRef<HTMLInputElement>(null)
  const [committedAvatar, setCommittedAvatar] = useState(() => readAvatar(user.id))
  const [avatar, setAvatar] = useState(committedAvatar)
  const [committedCover, setCommittedCover] = useState(() => readCover(user.id))
  const [cover, setCover] = useState(() => readCover(user.id))
  const [coverDark, setCoverDark] = useState(false)
  const name = user.displayName?.trim() || user.nickname?.trim() || user.email
  const nickname = user.nickname?.trim()

  useSettingsDraft({
    id: 'profile-avatar',
    disabled: false,
    pending: false,
    save: async () => {
      writeAvatar(user.id, avatar)
      writeCover(user.id, cover)
      setCommittedAvatar(avatar)
      setCommittedCover(cover)
      return true
    },
    reset: () => {
      setAvatar(committedAvatar)
      setCover(committedCover)
    },
  })

  useEffect(() => {
    if (!cover) {
      setCoverDark(false)
      return
    }
    let cancelled = false
    void coverIsDark(cover).then((dark) => {
      if (!cancelled) setCoverDark(dark)
    })
    return () => {
      cancelled = true
    }
  }, [cover])

  const pick = async (file: File | undefined, kind: 'avatar' | 'cover') => {
    if (!file || !file.type.startsWith('image/')) return
    try {
      const url = await loadImage(file, kind === 'avatar' ? 256 : 960)
      if (kind === 'avatar') setAvatar(url)
      else setCover(url)
    } catch {
      // Keep the current photo if the file cannot be read.
    }
  }

  const growCover = (distance: number) => {
    const masthead = mastheadRef.current
    if (!masthead) return
    masthead.style.paddingBottom = `${64 + distance}px`
  }

  const onHandleDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    dragOrigin.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
    const masthead = mastheadRef.current
    if (masthead) masthead.style.transition = 'none'
  }

  const onHandleMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragOrigin.current == null) return
    growCover(Math.max(0, event.clientY - dragOrigin.current))
  }

  const onHandleUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragOrigin.current == null) return
    const distance = Math.max(0, event.clientY - dragOrigin.current)
    dragOrigin.current = null
    if (distance > 72) {
      void navigate({ to: '/app/general' })
      return
    }
    const masthead = mastheadRef.current
    if (masthead) {
      masthead.style.transition = 'padding-bottom 180ms ease'
      masthead.style.paddingBottom = ''
    }
  }

  return (
    <div
      className="relative -mx-3 -mt-3 flex flex-col items-center overflow-hidden px-5 pt-5 pb-16 text-center sm:-mx-6 sm:px-8 md:-mx-10 md:-mt-12 md:px-12 md:pt-14"
      ref={mastheadRef}
    >
      {cover ? (
        <div
          aria-hidden
          className="absolute inset-0 scale-105 bg-cover bg-center blur-[2px]"
          style={{ backgroundImage: `url(${cover})` }}
        />
      ) : null}
      {mode.editing ? (
        <div className="absolute top-3 right-3 z-[1] flex items-center gap-1.5">
          {avatar ? (
            <button
              className="nora-press-grow inline-flex h-8 cursor-pointer items-center rounded-full bg-black/55 px-3 text-[12px] font-medium text-white"
              onClick={() => setAvatar(null)}
              type="button"
            >
              Без фото
            </button>
          ) : null}
          {cover ? (
            <button
              className="nora-press-grow inline-flex h-8 cursor-pointer items-center rounded-full bg-black/55 px-3 text-[12px] font-medium text-white"
              onClick={() => setCover(null)}
              type="button"
            >
              Без фона
            </button>
          ) : null}
          <button
            className="nora-press-grow inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-black/55 px-3 text-[12px] font-medium text-white"
            onClick={() => coverRef.current?.click()}
            type="button"
          >
            <CameraIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
            Фон
          </button>
        </div>
      ) : null}
      <div className="relative">
        <button
          className={cn(
            'profile-avatar relative size-24 overflow-hidden rounded-full bg-[var(--nora-tint)] text-[22px] font-semibold text-white',
            mode.editing ? 'cursor-pointer' : 'cursor-default',
          )}
          disabled={!mode.editing}
          onClick={() => avatarRef.current?.click()}
          type="button"
        >
          {avatar ? (
            <img alt="" className="size-full object-cover" src={avatar} />
          ) : (
            <span className="flex size-full items-center justify-center">{initials(user)}</span>
          )}
        </button>
        {mode.editing ? (
          <span className="pointer-events-none absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full bg-[var(--nora-panel)] text-[var(--nora-text)] shadow-[0_2px_8px_rgba(0,0,0,0.16)]">
            <CameraIcon aria-hidden className="size-4" strokeWidth={1.75} />
          </span>
        ) : null}
      </div>
      <input
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          void pick(event.target.files?.[0], 'avatar')
          event.target.value = ''
        }}
        ref={avatarRef}
        type="file"
      />
      <input
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          void pick(event.target.files?.[0], 'cover')
          event.target.value = ''
        }}
        ref={coverRef}
        type="file"
      />
      <p className={cn('relative mt-3 flex items-center justify-center gap-1 font-heading text-[22px] leading-tight font-bold tracking-[-0.03em]', coverDark ? 'text-white' : 'text-[var(--nora-text)]')}>
        {name}
        <span className="relative inline-flex size-6 shrink-0 items-center justify-center text-[var(--nora-tint)]">
          <BadgeCheckIcon aria-hidden className="size-6 fill-current" strokeWidth={0} />
          <svg aria-hidden className="absolute size-3 text-white" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.2" viewBox="0 0 24 24">
            <path d="M5 12.5 10 17.5 19 7.5" />
          </svg>
        </span>
      </p>
      {nickname ? (
        <p className={cn('relative mt-0.5 text-[13px] font-light', coverDark ? 'text-white/80' : 'text-[var(--nora-text-tertiary)]')}>@{nickname}</p>
      ) : null}
      <div className="relative mt-4 flex items-center gap-2">
        <ProfileTab active={tab === 'profile'} onClick={() => onTab('profile')}>
          Профиль
        </ProfileTab>
        <ProfileTab active={tab === 'questionnaire'} onClick={() => onTab('questionnaire')}>
          Анкета
        </ProfileTab>
      </div>
      <button
        aria-label="Закрыть раздел"
        className="absolute bottom-6 left-1/2 z-[3] flex h-6 w-16 -translate-x-1/2 cursor-grab touch-none items-end justify-center pb-0.5"
        onPointerCancel={onHandleUp}
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        type="button"
      >
        <span className="block h-1 w-10 rounded-full bg-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" />
      </button>
    </div>
  )
}

function ProfileTab({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: string
  onClick: () => void
}) {
  return (
    <button
      className="profile-masthead-tab nora-press-grow inline-flex h-9 w-[6.75rem] cursor-pointer items-center justify-center rounded-full text-[13px] font-medium"
      data-active={active ? '' : undefined}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}
