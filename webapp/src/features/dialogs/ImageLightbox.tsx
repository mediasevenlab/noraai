import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MinusIcon, PlusIcon, XIcon } from 'lucide-react'

const MIN_SCALE = 1
const MAX_SCALE = 5

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value))
}

/** A chat picture opens fitted to the screen. The wheel and the buttons move closer. */
export function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null)
  const stage = useRef<HTMLDivElement>(null)
  const scaleRef = useRef(scale)
  scaleRef.current = scale

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === '+' || event.key === '=') setScale((value) => clampScale(value * 1.25))
      if (event.key === '-' || event.key === '_') setScale((value) => clampScale(value / 1.25))
      if (event.key === '0') {
        setScale(1)
        setOffset({ x: 0, y: 0 })
      }
    }
    const frame = stage.current
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const next = clampScale(scaleRef.current * (event.deltaY < 0 ? 1.12 : 1 / 1.12))
      setScale(next)
      if (next === 1) setOffset({ x: 0, y: 0 })
    }
    window.addEventListener('keydown', onKey)
    frame?.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
      frame?.removeEventListener('wheel', onWheel)
    }
  }, [onClose])

  const zoom = (next: number) => {
    const scaleNext = clampScale(next)
    setScale(scaleNext)
    if (scaleNext === 1) setOffset({ x: 0, y: 0 })
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Изображение'}
    >
      <button
        aria-label="Закрыть изображение"
        className="absolute top-4 right-4 z-20 inline-flex size-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
        onClick={onClose}
        type="button"
      >
        <XIcon className="size-5" />
      </button>
      <div
        className="flex h-full w-full items-center justify-center overflow-hidden"
        ref={stage}
        onPointerDown={(event) => {
          if (scale === 1 || event.button !== 0) return
          if (event.target === event.currentTarget) return
          drag.current = { x: event.clientX, y: event.clientY, originX: offset.x, originY: offset.y }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          const current = drag.current
          if (!current) return
          setOffset({
            x: current.originX + event.clientX - current.x,
            y: current.originY + event.clientY - current.y,
          })
        }}
        onPointerUp={() => {
          drag.current = null
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
      >
        <img
          alt={alt}
          className="max-h-[calc(100dvh-7rem)] max-w-[calc(100vw-3rem)] object-contain select-none"
          draggable={false}
          onDoubleClick={() => zoom(scale > 1 ? 1 : 2)}
          src={src}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            cursor: scale > 1 ? 'grab' : 'zoom-in',
          }}
        />
      </div>
      <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
        <button
          aria-label="Уменьшить"
          className="inline-flex size-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 disabled:opacity-40"
          disabled={scale <= MIN_SCALE}
          onClick={() => zoom(scale / 1.25)}
          type="button"
        >
          <MinusIcon className="size-4" />
        </button>
        <button
          aria-label="Вписать изображение"
          className="min-w-16 rounded-full bg-white/15 px-3 py-1.5 text-[13px] text-white tabular-nums hover:bg-white/25"
          onClick={() => zoom(1)}
          type="button"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          aria-label="Приблизить"
          className="inline-flex size-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 disabled:opacity-40"
          disabled={scale >= MAX_SCALE}
          onClick={() => zoom(scale * 1.25)}
          type="button"
        >
          <PlusIcon className="size-4" />
        </button>
      </div>
    </div>,
    document.body,
  )
}
