import {
  NORA_BLOCK_REGISTRY,
  NORA_COMPONENT_REGISTRY,
} from "@/lib/nora-registry"

export type ComponentMeta = {
  id: string
  name: string
  description: string
  isNew?: boolean
  /**
   * Доп. демо (`nora-*`), встроенные в страницу компонента.
   * Для уникальных паттернов без Base-аналога = [собственный id].
   */
  extraDemoIds?: string[]
}

/** Метаданные расширенных / уникальных паттернов Nora (дубли вшиваются в страницы Base) */
export const NORA_COMPONENTS: ComponentMeta[] = NORA_COMPONENT_REGISTRY.map(
  (c) => ({
    id: `nora-${c.id}`,
    name: c.name,
    description: c.desc,
    extraDemoIds: [`nora-${c.id}`],
  })
)

function stripNoraPrefix(id: string) {
  return id.replace(/^nora-/, "")
}

const NORA_BY_RAW_ID = Object.fromEntries(
  NORA_COMPONENTS.map((c) => [stripNoraPrefix(c.id), c])
)

/**
 * Дубли → вшиваются в страницу Base (не отдельные пункты сайдбара).
 * Ключ — id Base, значение — raw id из nora-components.json.
 */
export const NORA_AFTER_BASE: Record<string, string[]> = {
  button: ["button"],
  input: ["input"],
  select: ["select"],
  checkbox: ["checkbox"],
  switch: ["switch"],
  slider: ["slider"],
  badge: ["badge"],
  tooltip: ["tooltip"],
  kbd: ["kbd"],
  "dropdown-menu": ["menu"],
  tabs: ["tabs", "segmented-control"],
  item: ["list-item"],
  dialog: ["modal"],
  sonner: ["toast"],
  avatar: ["avatar"],
  progress: ["progress"],
  breadcrumb: ["breadcrumb"],
  empty: ["empty-state"],
  separator: ["divider"],
  collapsible: ["collapsible"],
}

/** Уникальные паттерны — нет прямого Base-аналога; в конце единого списка */
export const NORA_UNIQUE_RAW_IDS = [
  "icon-button",
  "stepper",
  "panel-row",
  "search",
  "color-well",
] as const

export const NORA_UNIQUE_COMPONENTS: ComponentMeta[] =
  NORA_UNIQUE_RAW_IDS.map((id) => NORA_BY_RAW_ID[id]).filter(
    Boolean
  ) as ComponentMeta[]

/** Base id для URL `/components/nora-*` при смерженном дубле (редирект) */
export function getBaseIdForNoraDoc(docId: string): string | undefined {
  const raw = stripNoraPrefix(docId)
  for (const [baseId, rawIds] of Object.entries(NORA_AFTER_BASE)) {
    if (rawIds.includes(raw)) return baseId
  }
  return undefined
}

export function isNoraOnlyComponent(id: string): boolean {
  return NORA_UNIQUE_COMPONENTS.some((c) => c.id === id)
}

function buildComponentsNav(): ComponentMeta[] {
  const usedNora = new Set<string>()
  const out: ComponentMeta[] = []

  for (const base of UI_COMPONENTS) {
    const rawIds = NORA_AFTER_BASE[base.id] ?? []
    const extraDemoIds: string[] = []
    for (const rawId of rawIds) {
      const extra = NORA_BY_RAW_ID[rawId]
      if (!extra || usedNora.has(extra.id)) continue
      usedNora.add(extra.id)
      extraDemoIds.push(extra.id)
    }
    if (extraDemoIds.length) {
      out.push({ ...base, extraDemoIds })
    } else {
      out.push(base)
    }
  }

  for (const rawId of NORA_UNIQUE_RAW_IDS) {
    const extra = NORA_BY_RAW_ID[rawId]
    if (!extra || usedNora.has(extra.id)) continue
    usedNora.add(extra.id)
    out.push(extra)
  }

  for (const extra of NORA_COMPONENTS) {
    if (usedNora.has(extra.id)) continue
    out.push(extra)
  }

  return out
}

/** Примитивы UI (Base UI), тема Nora */
export const UI_COMPONENTS: ComponentMeta[] = [
  {
    id: "nora-icon",
    name: "Icon",
    description: "SVG-иконки Nora UI. Наследуют currentColor.",
  },
  {
    id: "accordion",
    name: "Accordion",
    description: "A vertically stacked set of interactive headings that each reveal a section of content.",
  },
  {
    id: "alert",
    name: "Alert",
    description: "Displays a callout for user attention.",
  },
  {
    id: "alert-dialog",
    name: "Alert Dialog",
    description: "A modal dialog that interrupts the user with important content and expects a response.",
  },
  {
    id: "aspect-ratio",
    name: "Aspect Ratio",
    description: "Displays content within a desired ratio.",
  },
  {
    id: "attachment",
    name: "Attachment",
    description:
      "Превью файла с метаданными и действиями. Цвета и фокус Nora UI.",
    isNew: true,
  },
  {
    id: "avatar",
    name: "Avatar",
    description: "An image element with a fallback for representing the user.",
  },
  {
    id: "badge",
    name: "Badge",
    description: "Displays a badge or a component that looks like a badge.",
  },
  {
    id: "breadcrumb",
    name: "Breadcrumb",
    description: "Displays the path to the current resource using a hierarchy of links.",
  },
  {
    id: "bubble",
    name: "Bubble",
    description:
      "Чат-пузырь для conversational UI. Цвета и фокус Nora UI.",
    isNew: true,
  },
  {
    id: "button",
    name: "Button",
    description: "Displays a button or a component that looks like a button.",
  },
  {
    id: "button-group",
    name: "Button Group",
    description: "A container that groups related buttons together.",
  },
  {
    id: "calendar",
    name: "Calendar",
    description:
      "Выбор даты и диапазона (DayPicker). Стили и демо Nora UI.",
  },
  {
    id: "card",
    name: "Card",
    description: "Displays a card with header, content, and footer.",
  },
  {
    id: "carousel",
    name: "Carousel",
    description: "A carousel with motion and swipe built using Embla.",
  },
  {
    id: "chart",
    name: "Chart",
    description: "Beautiful charts built using Recharts.",
  },
  {
    id: "checkbox",
    name: "Checkbox",
    description: "A control that allows the user to toggle between checked and not checked.",
  },
  {
    id: "collapsible",
    name: "Collapsible",
    description: "An interactive component which expands/collapses a panel.",
  },
  {
    id: "combobox",
    name: "Combobox",
    description: "Autocomplete input and command palette with a list of suggestions.",
  },
  {
    id: "command",
    name: "Command",
    description: "Fast, composable command menu for React.",
  },
  {
    id: "context-menu",
    name: "Context Menu",
    description: "Displays a menu triggered by a right-click or long-press.",
  },
  {
    id: "data-table",
    name: "Data Table",
    description: "Powerful table and datagrids built using TanStack Table.",
  },
  {
    id: "date-picker",
    name: "Date Picker",
    description: "A date picker component with range and presets.",
  },
  {
    id: "dialog",
    name: "Dialog",
    description: "Nora modal: 340px, tint shadow, header / body / footer.",
  },
  {
    id: "direction",
    name: "Direction",
    description: "Utilities for controlling text and layout direction (LTR/RTL).",
  },
  {
    id: "drawer",
    name: "Drawer",
    description: "Nora sheet: modal surface, grab handle, side panels.",
  },
  {
    id: "dropdown-menu",
    name: "Dropdown Menu",
    description: "Displays a menu to the user — such as a set of actions or functions — triggered by a button.",
  },
  {
    id: "empty",
    name: "Empty",
    description: "Nora empty state: shopping plaque, 32px icon badge, 15/500 title.",
  },
  {
    id: "field",
    name: "Field",
    description: "Compose labels, controls, and help text into accessible form fields.",
  },
  {
    id: "hover-card",
    name: "Hover Card",
    description: "Nora popover preview on hover — link content without leaving the page.",
  },
  {
    id: "input",
    name: "Input",
    description: "Nora flat input: nora-input-bg, focus glow, error inset ring.",
  },
  {
    id: "input-group",
    name: "Input Group",
    description: "Nora input surface with icons, text, buttons, and kbd addons.",
  },
  {
    id: "input-otp",
    name: "Input OTP",
    description: "Nora OTP slots — flat surface, focus glow, separators.",
  },
  {
    id: "item",
    name: "Item",
    description: "Nora list rows — media, title, actions, dense groups.",
  },
  {
    id: "kbd",
    name: "Kbd",
    description: "Nora keyboard chips for shortcuts and tooltips.",
  },
  {
    id: "label",
    name: "Label",
    description: "Nora secondary label for form controls.",
  },
  {
    id: "marker",
    name: "Marker",
    description: "Nora thread markers — status, separators, borders.",
    isNew: true,
  },
  {
    id: "menubar",
    name: "Menubar",
    description: "Nora desktop menubar — tint menus and kbd shortcuts.",
  },
  {
    id: "message",
    name: "Message",
    description: "Nora chat rows — avatars, bubbles, timestamps.",
    isNew: true,
  },
  {
    id: "message-scroller",
    name: "Message Scroller",
    description: "Nora chat scroller — panel chrome, composer, markers.",
    isNew: true,
  },
  {
    id: "navigation-menu",
    name: "Navigation Menu",
    description: "Nora top nav — row hover, popover panels, link lists.",
  },
  {
    id: "pagination",
    name: "Pagination",
    description: "Nora page nav — dense links, inset active state.",
  },
  {
    id: "popover",
    name: "Popover",
    description: "Nora popover surface — solid panel, form content.",
  },
  {
    id: "progress",
    name: "Progress",
    description: "Nora progress — tint bar on input-bg track.",
  },
  {
    id: "radio-group",
    name: "Radio Group",
    description: "Nora tint radios — dense options and choice cards.",
  },
  {
    id: "resizable",
    name: "Resizable",
    description: "Nora resizable panels — divider handles, nested splits.",
  },
  {
    id: "scroll-area",
    name: "Scroll Area",
    description: "Nora scroll panels — custom thumb, vertical and horizontal.",
  },
  {
    id: "select",
    name: "Select",
    description: "Nora select — input trigger, tint menu, dense items.",
  },
  {
    id: "separator",
    name: "Separator",
    description: "Nora divider — horizontal and vertical rules.",
  },
  {
    id: "sheet",
    name: "Sheet",
    description: "Nora edge sheet — modal surface, header / body / footer.",
  },
  {
    id: "sidebar",
    name: "Sidebar",
    description: "Nora sidebar — dense menu rows, row hover/active.",
  },
  {
    id: "skeleton",
    name: "Skeleton",
    description: "Nora loading placeholders — soft pulse blocks.",
  },
  {
    id: "slider",
    name: "Slider",
    description: "Nora slider — tint range, panel thumb, focus glow.",
  },
  {
    id: "sonner",
    name: "Sonner",
    description: "Nora toasts via Sonner — toast surface, shadow, action chips.",
  },
  {
    id: "spinner",
    name: "Spinner",
    description: "Nora loading spinner — compact spin, tint via text color.",
  },
  {
    id: "switch",
    name: "Switch",
    description: "Nora toggle — tint track, input-bg off, panel thumb.",
  },

  {
    id: "table",
    name: "Table",
    description: "Nora data table — 30px rows, soft zebra, row-hover.",
  },
  {
    id: "tabs",
    name: "Tabs",
    description: "Nora tabs — 30px segments, tint line, card panels.",
  },
  {
    id: "textarea",
    name: "Textarea",
    description: "Nora multi-line input — flat input-bg, focus glow.",
  },

  {
    id: "toast",
    name: "Toast",
    description: "Nora toast messages — same Sonner surface as Sonner.",
  },

  {
    id: "toggle",
    name: "Toggle",
    description: "Nora toolbar toggle — tint-dimmed pressed, 22/26/30 sizes.",
  },
  {
    id: "toggle-group",
    name: "Toggle Group",
    description: "Nora toggle set — spaced or connected segment track.",
  },
  {
    id: "tooltip",
    name: "Tooltip",
    description: "Nora tooltip — dark surface, 11px, optional Kbd.",
  },
  {
    id: "typography",
    name: "Typography",
    description: "Nora type — Inter Display heads, 12/11 UI labels.",
  },

]

/** Единый список компонентов Nora UI */
export const COMPONENTS: ComponentMeta[] = buildComponentsNav()

export type BlockMeta = {
  id: string
  name: string
  description: string
}

/** Блоки редактора / продукта */
export const NORA_BLOCKS: BlockMeta[] = NORA_BLOCK_REGISTRY.map((b) => ({
  id: `nora-${b.id}`,
  name: b.name,
  description: b.desc,
}))

/** Составные блоки */
export const COMPOUND_BLOCKS: BlockMeta[] = [
  {
    id: "stats",
    name: "Stats Cards",
    description: "KPI metric cards with icons and trend labels.",
  },
  {
    id: "sidebar-layout",
    name: "Sidebar Layout",
    description: "App shell with collapsible sidebar and inset content.",
  },
  {
    id: "settings",
    name: "Settings Form",
    description: "Profile and preferences form with labeled fields.",
  },
  {
    id: "data-table",
    name: "Data Table",
    description: "Sortable table with search and row actions.",
  },
  {
    id: "empty-state",
    name: "Empty State",
    description: "Placeholder for empty lists with icon and CTA.",
  },
]

/** Единый список блоков Nora UI */
export const BLOCKS: BlockMeta[] = [...NORA_BLOCKS, ...COMPOUND_BLOCKS]
