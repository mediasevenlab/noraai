export const MODAL_OVERLAY_STORAGE_KEY = 'nora-modal-overlay-v3'

export const MODAL_OVERLAYS = [
  {
    id: 'haze',
    label: 'Дымка · без блюра',
    bg: 'rgb(0 0 0 / 0.16)',
    blur: '0px',
    saturate: '100%',
  },
  {
    id: 'scrim',
    label: 'Шторка · как Material',
    bg: 'rgb(0 0 0 / 0.32)',
    blur: '0px',
    saturate: '100%',
  },
  {
    id: 'dim',
    label: 'Затемнение · классика',
    bg: 'rgb(0 0 0 / 0.48)',
    blur: '0px',
    saturate: '100%',
  },
  {
    id: 'ink',
    label: 'Чернила · фокус',
    bg: 'rgb(0 0 0 / 0.62)',
    blur: '0px',
    saturate: '100%',
  },
  {
    id: 'veil',
    label: 'Вуаль · молочная',
    bg: 'color-mix(in srgb, var(--nora-panel) 58%, transparent)',
    blur: '0px',
    saturate: '100%',
  },
  {
    id: 'mist',
    label: 'Туман · лёгкий иней',
    bg: 'rgb(0 0 0 / 0.14)',
    blur: '8px',
    saturate: '140%',
  },
  {
    id: 'frost',
    label: 'Иней · 2026 glass',
    bg: 'rgb(0 0 0 / 0.22)',
    blur: '12px',
    saturate: '160%',
  },
  {
    id: 'glass',
    label: 'Стекло · liquid',
    bg: 'color-mix(in srgb, var(--nora-panel) 28%, transparent)',
    blur: '16px',
    saturate: '180%',
  },
  {
    id: 'matte',
    label: 'Матовый · как сейчас',
    bg: 'color-mix(in srgb, #000 42%, color-mix(in srgb, var(--nora-panel) 22%, transparent))',
    blur: '16px',
    saturate: '100%',
  },
  {
    id: 'fog',
    label: 'Пелена · сильный блюр',
    bg: 'rgb(0 0 0 / 0.18)',
    blur: '24px',
    saturate: '120%',
  },
  {
    id: 'sheer',
    label: 'Просвет · почти нет',
    bg: 'rgb(0 0 0 / 0.08)',
    blur: '0px',
    saturate: '100%',
  },
  {
    id: 'paper',
    label: 'Бумага · тёплый холст',
    bg: 'color-mix(in srgb, var(--nora-canvas) 72%, transparent)',
    blur: '0px',
    saturate: '100%',
  },
  {
    id: 'silk',
    label: 'Шёлк · лёгкая дымка',
    bg: 'color-mix(in srgb, var(--nora-panel) 16%, transparent)',
    blur: '6px',
    saturate: '130%',
  },
  {
    id: 'opal',
    label: 'Опал · молочный иней',
    bg: 'color-mix(in srgb, var(--nora-panel) 40%, transparent)',
    blur: '10px',
    saturate: '150%',
  },
  {
    id: 'crystal',
    label: 'Кристалл · яркое стекло',
    bg: 'color-mix(in srgb, var(--nora-panel) 12%, transparent)',
    blur: '20px',
    saturate: '200%',
  },
  {
    id: 'linen',
    label: 'Лён · холст с блюром',
    bg: 'color-mix(in srgb, var(--nora-canvas) 48%, transparent)',
    blur: '14px',
    saturate: '110%',
  },
  {
    id: 'smoke',
    label: 'Дым · мягкая тень',
    bg: 'rgb(0 0 0 / 0.26)',
    blur: '10px',
    saturate: '100%',
  },
  {
    id: 'dusk',
    label: 'Сумерки · холодный тон',
    bg: 'color-mix(in srgb, #0f172a 18%, transparent)',
    blur: '12px',
    saturate: '140%',
  },
  {
    id: 'bloom',
    label: 'Сияние · saturated glass',
    bg: 'color-mix(in srgb, var(--nora-panel) 20%, rgb(255 255 255 / 0.08))',
    blur: '18px',
    saturate: '220%',
  },
  {
    id: 'film',
    label: 'Плёнка · киношный блюр',
    bg: 'color-mix(in srgb, #111 12%, color-mix(in srgb, var(--nora-panel) 18%, transparent))',
    blur: '22px',
    saturate: '90%',
  },
] as const

export type ModalOverlayId = (typeof MODAL_OVERLAYS)[number]['id']

export const DEFAULT_MODAL_OVERLAY: ModalOverlayId = 'dusk'

const MODAL_OVERLAY_IDS = new Set<string>(MODAL_OVERLAYS.map((overlay) => overlay.id))

export function parseModalOverlayId(value: string | null | undefined): ModalOverlayId {
  if (value && MODAL_OVERLAY_IDS.has(value)) return value as ModalOverlayId
  return DEFAULT_MODAL_OVERLAY
}

export function applyModalOverlayToDocument(overlay: ModalOverlayId) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-modal-overlay', overlay)
}
