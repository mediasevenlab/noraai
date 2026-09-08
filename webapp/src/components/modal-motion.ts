export const MODAL_MOTION_STORAGE_KEY = 'nora-modal-motion'

export const MODAL_MOTIONS = [
  { id: 'near', label: 'Едва · 1%', scale: '0.99', radius: '6px' },
  { id: 'hint', label: 'Чуть · 3%', scale: '0.97', radius: '8px' },
  { id: 'soft', label: 'Слабо · 5%', scale: '0.95', radius: '10px' },
  { id: 'mid', label: 'Средне · 7%', scale: '0.93', radius: '10px' },
  { id: 'ios', label: 'Как iOS · 8%', scale: '0.92', radius: '12px' },
  { id: 'clear', label: 'Заметно · 10%', scale: '0.90', radius: '14px' },
  { id: 'strong', label: 'Сильно · 14%', scale: '0.86', radius: '16px' },
  { id: 'deep', label: 'Глубоко · 18%', scale: '0.82', radius: '18px' },
  { id: 'far', label: 'Далеко · 24%', scale: '0.76', radius: '22px' },
  { id: 'max', label: 'Максимум · 30%', scale: '0.70', radius: '26px' },
] as const

export type ModalMotionId = (typeof MODAL_MOTIONS)[number]['id']

export const DEFAULT_MODAL_MOTION: ModalMotionId = 'ios'

const MODAL_MOTION_IDS = new Set<string>(MODAL_MOTIONS.map((motion) => motion.id))

export function parseModalMotionId(value: string | null | undefined): ModalMotionId {
  if (value && MODAL_MOTION_IDS.has(value)) return value as ModalMotionId
  return DEFAULT_MODAL_MOTION
}

export function applyModalMotionToDocument(motion: ModalMotionId) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-modal-motion', motion)
}
