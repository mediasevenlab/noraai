import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type FileGlyph = 'pdf' | 'lines' | 'grid' | 'slide' | 'play' | 'audio' | 'image' | 'code' | 'archive'

const AUDIO = new Set(['mp3', 'm4a', 'wav', 'aac', 'ogg', 'flac'])
const VIDEO = new Set(['mp4', 'webm', 'mov', 'mkv'])
const SHEET = new Set(['xls', 'xlsx', 'xlsm', 'csv'])
const WORD = new Set(['doc', 'docx', 'rtf'])
const SLIDES = new Set(['ppt', 'pptx'])
const IMAGE = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic'])
const CODE = new Set(['json', 'html', 'htm', 'xml', 'js', 'ts'])
const ARCHIVE = new Set(['zip', 'rar', '7z'])

const GLYPHS: Record<FileGlyph, ReactNode> = {
  pdf: <path d="M8.2 11.8h7.6c.55 0 .85.62.52 1.05L12.7 17.7a.7.7 0 0 1-1.12 0l-3.62-4.85c-.33-.43-.03-1.05.52-1.05z" fill="#fff" />,
  lines: (
    <>
      <rect x="7" y="11.4" width="9.2" height="1.35" rx="0.45" fill="#fff" />
      <rect x="7" y="14.15" width="7.4" height="1.35" rx="0.45" fill="#fff" />
      <rect x="7" y="16.9" width="5.2" height="1.35" rx="0.45" fill="#fff" />
    </>
  ),
  grid: (
    <>
      <rect x="7" y="11.6" width="4.1" height="3.1" rx="0.45" fill="#fff" />
      <rect x="12.1" y="11.6" width="4.1" height="3.1" rx="0.45" fill="#fff" />
      <rect x="7" y="15.7" width="4.1" height="3.1" rx="0.45" fill="#fff" />
      <rect x="12.1" y="15.7" width="4.1" height="3.1" rx="0.45" fill="#fff" />
    </>
  ),
  slide: <rect x="6.8" y="12.1" width="10.4" height="6.6" rx="1" fill="#fff" />,
  play: <path d="M10.1 11.7v6.4l5.6-3.2z" fill="#fff" />,
  audio: (
    <>
      <rect x="7.2" y="14.2" width="1.7" height="3.6" rx="0.5" fill="#fff" />
      <rect x="10.3" y="12.2" width="1.7" height="5.6" rx="0.5" fill="#fff" />
      <rect x="13.4" y="13.3" width="1.7" height="4.5" rx="0.5" fill="#fff" />
    </>
  ),
  image: (
    <>
      <circle cx="9.1" cy="13.2" r="1.15" fill="#fff" />
      <path d="M6.8 18.2 10.2 14.6l2.1 2.1 1.6-1.5 3.3 3H6.8z" fill="#fff" />
    </>
  ),
  code: (
    <path
      d="M10.2 12.1 7.4 14.9l2.8 2.8M13.8 12.1l2.8 2.8-2.8 2.8"
      fill="none"
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.4"
    />
  ),
  archive: <rect x="6.6" y="13.3" width="10.8" height="2.3" rx="0.5" fill="#fff" />,
}

export function fileTypeInfo(name: string) {
  const extension = name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? ''
  if (extension === 'pdf') return { color: '#E23B3B', glyph: 'pdf' as const, hint: 'Документ PDF' }
  if (WORD.has(extension)) return { color: '#3B7CFF', glyph: 'lines' as const, hint: 'Документ Word' }
  if (SHEET.has(extension)) {
    return { color: '#1F9D55', glyph: 'grid' as const, hint: extension === 'csv' ? 'Таблица CSV' : 'Таблица Excel' }
  }
  if (SLIDES.has(extension)) return { color: '#F08A24', glyph: 'slide' as const, hint: 'Презентация' }
  if (VIDEO.has(extension)) return { color: '#FF7A45', glyph: 'play' as const, hint: 'Видео' }
  if (AUDIO.has(extension)) return { color: '#7C5CFC', glyph: 'audio' as const, hint: 'Аудио' }
  if (IMAGE.has(extension)) return { color: '#2EB5C0', glyph: 'image' as const, hint: 'Изображение' }
  if (ARCHIVE.has(extension)) return { color: '#C2410C', glyph: 'archive' as const, hint: 'Архив' }
  if (CODE.has(extension)) return { color: '#64748B', glyph: 'code' as const, hint: 'Файл' }
  return { color: '#8B93A1', glyph: 'lines' as const, hint: 'Текстовый файл' }
}

export function FileTypeIcon({ name, className }: { name: string; className?: string }) {
  const info = fileTypeInfo(name)
  return (
    <svg aria-hidden className={cn('size-5 shrink-0', className)} viewBox="0 0 24 24">
      <path
        d="M6 2.2h7.15L20.2 9.15V19.6c0 1.22-.98 2.2-2.2 2.2H6c-1.22 0-2.2-.98-2.2-2.2V4.4c0-1.22.98-2.2 2.2-2.2z"
        fill={info.color}
      />
      <path d="M13.15 2.35v4.7c0 .83.67 1.5 1.5 1.5h4.85L13.15 2.35z" fill="#fff" fillOpacity="0.92" />
      {GLYPHS[info.glyph]}
    </svg>
  )
}
