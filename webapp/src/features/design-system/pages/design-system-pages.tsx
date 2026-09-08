import * as React from "react"
import { Link } from "@tanstack/react-router"

import { DocsPage, DocsSection } from "../docs-page"
import { DemoBlock } from "@/components/docs/demo-block"
import { NoraIcon } from "@/components/nora-icon"
import {
  Swatch,
  TokenTable,
  copyText,
} from "@/components/docs/token-table"
import {
  NoraAvatar,
  NoraBadge,
  NoraButton,
  NoraCheckbox,
  NoraColorWell,
  NoraDivider,
  NoraInput,
  NoraMenu,
  NoraMenuItem,
  NoraPanel,
  NoraPanelRow,
  NoraProgress,
  NoraSearch,
  NoraSectionTitle,
  NoraSlider,
  NoraSpinner,
  NoraStepper,
  NoraSwitch,
  NoraTooltip,
} from "@/components/nora"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NORA_ICONS, NORA_TOKENS } from "@/lib/nora-icons"
import { cn } from "@/lib/utils"

const ACCENT = [
  ["Blue / Tint", "#0099FF", "основной акцент, выделение, ссылки"],
  ["Blue Dark", "#0088FF", "hover основного акцента"],
  ["Purple / Component", "#8855FF", "компоненты и всё связанное с ними"],
  ["Purple Dark", "#7744FF", "hover фиолетового"],
  ["Red / Error", "#FF3366", "ошибки, разрушающие действия"],
  ["Yellow / Warning", "#FFBB00", "предупреждения"],
  ["Orange / Warning Text", "#FF9900", "текст предупреждений"],
  ["Green / Success", "#4CD963", "успех, статус Live"],
  ["Cyan", "#00CCFF", "дополнительный (графики, CMS)"],
  ["Lime (Marketing)", "#CBFF00", "акцент маркетингового сайта"],
] as const

const NEUTRALS = [
  "#000000",
  "#111111",
  "#171717",
  "#1F1F1F",
  "#242424",
  "#2B2B2B",
  "#333333",
  "#444444",
  "#555555",
  "#666666",
  "#777777",
  "#888888",
  "#999999",
  "#AAAAAA",
  "#BBBBBB",
  "#CCCCCC",
  "#DDDDDD",
  "#EEEEEE",
  "#F3F3F3",
  "#FFFFFF",
]

const SURFACE_PAIRS: [string, string][] = [
  ["canvasBackground", "канвас редактора"],
  ["panelBackground", "панели"],
  ["popoverBackground", "поповеры и меню"],
  ["inputBackground", "поля ввода"],
  ["buttonBackground", "кнопки"],
  ["buttonBackgroundHover", "кнопки (hover)"],
  ["panelTitle", "заголовок панели"],
  ["panelText", "текст панели"],
  ["panelSectionTitle", "подписи секций"],
  ["panelDivider", "разделители"],
  ["inputText", "текст в полях"],
  ["inputPlaceholder", "плейсхолдер"],
  ["menuBackground", "меню"],
  ["modalBackground", "модальные окна"],
  ["dashboardSidebarBackground", "сайдбар дашборда"],
  ["dashboardSidebarText", "текст сайдбара"],
  ["dashboardSidebarActiveBackground", "активный пункт"],
]

const MARKETING_PALETTE = [
  ["Background", "#000000"],
  ["Surface", "#111111"],
  ["Card", "#141414"],
  ["Elevated", "#1A1A1A"],
  ["Text", "#FFFFFF"],
  ["Text 80", "rgba(255,255,255,.8)"],
  ["Text 60", "rgba(255,255,255,.6)"],
  ["Text 40", "rgba(255,255,255,.4)"],
  ["Blue", "#0099FF"],
  ["Deep Blue", "#0055FF"],
  ["Purple", "#6600FF"],
  ["Magenta", "#9900FF"],
  ["Pink", "#FF0066"],
  ["Red", "#FF0022"],
  ["Orange", "#FD7702"],
  ["Yellow", "#FFBB00"],
  ["Cyan", "#00CCFF"],
  ["Teal", "#22DDDD"],
  ["Green", "#4CD963"],
  ["Lime", "#CBFF00"],
] as const

function tokenKey(name: string) {
  return `--nora-fresco-${name}-color`
}

function PaletteCell({
  name,
  value,
  note,
}: {
  name: string
  value: string
  note?: string
}) {
  return (
    <button
      type="button"
      onClick={() => copyText(value)}
      className="m-0 flex w-full flex-col overflow-hidden rounded-[10px] border-0 bg-card p-0 text-left ring-1 ring-border transition-shadow hover:ring-foreground/20"
      title="Клик — копировать"
    >
      {/* отдельный блок без padding — иначе у button появляется внутренний отступ */}
      <span
        className="block h-14 w-full shrink-0"
        style={{ background: value }}
        aria-hidden
      />
      <span className="block space-y-0.5 p-2.5">
        <span className="block text-[12px] font-semibold text-foreground">
          {name}
        </span>
        <span className="block font-mono text-[11px] text-muted-foreground">
          {value}
        </span>
        {note ? (
          <span className="block text-[11px] text-muted-foreground">{note}</span>
        ) : null}
      </span>
    </button>
  )
}

function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <code className={cn("font-mono text-[11px] text-muted-foreground", className)}>
      {children}
    </code>
  )
}

/* ------------------------------------------------------------------ */
/*  Цвет                                                               */
/* ------------------------------------------------------------------ */

export function DsColorsPage() {
  const light = NORA_TOKENS.light
  const dark = NORA_TOKENS.dark

  return (
    <DocsPage
      title="Цвет"
      description={`Палитра Nora построена на нейтральной серой шкале и небольшом наборе функциональных акцентов. Каждый цвет существует в виде семантического токена с парой значений для светлой и тёмной темы — извлечено ${Object.keys(dark).length} токенов.`}
    >
      <DocsSection
        title="Акцентные и статусные цвета"
        description="Одинаковы во всех схемах — это константы бренда. Клик копирует hex."
      >
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {ACCENT.map(([n, v, note]) => (
            <PaletteCell key={n} name={n} value={v} note={note} />
          ))}
        </div>
      </DocsSection>

      <DocsSection
        title="Нейтральная шкала"
        description="Серые Nora идут с шагом hex-двойки (#111 → #222 → … → #EEE). Из них строятся все поверхности и текстовые уровни."
      >
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {NEUTRALS.map((v) => (
            <PaletteCell
              key={v}
              name={v}
              value={v}
              note="нейтральный · поверхности и текст"
            />
          ))}
        </div>
      </DocsSection>

      <DocsSection
        title="Семантические токены: светлая ↔ тёмная"
        description={
          <>
            Ключевые токены редактора (<Mono>--nora-fresco-*</Mono>) и их значения
            в обеих темах. Полный список — в разделе{" "}
            <Link
              params={{ pageId: 'tokens' }}
              to="/admin/ds/$pageId"
              className="text-primary hover:underline"
            >
              Все токены
            </Link>
            .
          </>
        }
      >
        <TokenTable headers={["Токен", "Editor Light", "Editor Dark", "Назначение"]}>
          {SURFACE_PAIRS.map(([name, note]) => {
            const key = tokenKey(name)
            const lv = light[key]
            const dv = dark[key]
            if (!lv && !dv) return null
            return (
              <tr key={name}>
                <td>
                  <button
                    type="button"
                    className="cursor-pointer font-mono text-[11px] text-foreground hover:text-primary"
                    onClick={() => copyText(key)}
                  >
                    {name}
                  </button>
                </td>
                <td>
                  {lv ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Swatch color={lv} />
                      <Mono>{lv}</Mono>
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {dv ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Swatch color={dv} />
                      <Mono>{dv}</Mono>
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="text-muted-foreground">{note}</td>
              </tr>
            )
          })}
        </TokenTable>
      </DocsSection>

      <DocsSection
        title="Палитра маркетингового сайта"
        description="Маркетинговый сайт живёт на чистом чёрном фоне и использует расширенный спектр акцентов."
      >
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {MARKETING_PALETTE.map(([n, v]) => (
            <PaletteCell key={n} name={n} value={v} />
          ))}
        </div>
      </DocsSection>

      <DocsSection title="Живой пример">
        <DemoBlock
          title="Панель в текущей схеме"
          description="переключите схему в шапке"
          code={`import { NoraPanel, NoraButton } from "@/components/nora"`}
        >
          <NoraPanel className="w-[230px]">
            <NoraSectionTitle>Fill</NoraSectionTitle>
            <NoraPanelRow label="Color">
              <NoraColorWell color="#0099FF" label="0099FF" />
            </NoraPanelRow>
            <NoraPanelRow label="Opacity">
              <NoraSlider defaultValue={80} />
            </NoraPanelRow>
            <div className="mt-2.5 flex gap-2">
              <NoraButton variant="primary" className="flex-1">
                Primary
              </NoraButton>
              <NoraButton variant="component" className="flex-1">
                Component
              </NoraButton>
            </div>
          </NoraPanel>
        </DemoBlock>
      </DocsSection>
    </DocsPage>
  )
}

/* ------------------------------------------------------------------ */
/*  Типографика                                                        */
/* ------------------------------------------------------------------ */

const TYPE_SCALE = [
  ["Caption", "10px", "600", "1.2", "метки секций, счётчики (капс, трекинг +6%)"],
  ["Small", "11px", "500", "1.3", "тултипы, подписи, сегменты"],
  ["Body", "12px", "500", "1.4", "основной кегль интерфейса редактора"],
  ["Body Large", "13px", "500", "1.4", "заголовки модалок, дашборд"],
  ["Subtitle", "14px", "600", "1.35", "заголовки секций настроек"],
  ["Title", "15px", "600", "1.3", "карточки, заголовки диалогов"],
  ["Heading", "18–20px", "600", "1.3", "заголовки страниц настроек"],
  ["Display S", "26px", "700", "1.2", "заголовки разделов сайта"],
  ["Display M", "36px", "700", "1.1", "подзаголовки hero"],
  ["Display L", "54px+", "700", "1.05", "hero маркетингового сайта"],
] as const

const SAMPLE = "Дизайн — это то, как это работает 0123456789"

export function DsTypographyPage() {
  return (
    <DocsPage
      title="Типографика"
      description="Nora использует три гарнитуры: Inter — интерфейс и числа (обычный ноль), Inter Display — крупные заголовки сайта, Input Mono — только код и hex. В интерфейсе редактора базовый кегль 12px/500."
    >
      <DocsSection title="Гарнитуры">
        <div className="flex flex-col gap-3">
          {[
            {
              name: "Inter",
              meta: "Веса 100–900 + италики · UI редактора и сайта",
              style: { font: "500 22px/1.3 Inter, var(--font-sans)" },
              sample: SAMPLE,
            },
            {
              name: "Inter Display",
              meta: "Веса 100–900 · Крупные заголовки, hero",
              style: {
                font: "700 26px/1.2 'Inter Display', Inter, var(--font-sans)",
                letterSpacing: "-0.02em",
              },
              sample: SAMPLE,
            },
            {
              name: "Input Mono",
              meta: "Веса 300–700 + италики · Код и hex (не для UI-чисел)",
              style: {
                font: "400 17px/1.4 'Input Mono', Menlo, monospace",
              },
              sample: "const Nora = design(0123456789)",
            },
          ].map((f) => (
            <div
              key={f.name}
              className="flex flex-col gap-3 rounded-[10px] bg-card p-4 ring-1 ring-border sm:flex-row sm:items-center"
            >
              <div className="w-44 shrink-0 text-[12px]">
                <div className="font-semibold">{f.name}</div>
                <div className="mt-0.5 text-muted-foreground">{f.meta}</div>
              </div>
              <div className="min-w-0 text-foreground" style={f.style}>
                {f.sample}
              </div>
            </div>
          ))}
        </div>
      </DocsSection>

      <DocsSection
        title="Шкала размеров"
        description="Собрана из реальных значений font-size в интерфейсе (частотный анализ: 12px и 14px — самые массовые)."
      >
        <TokenTable
          headers={["Стиль", "Кегль", "Вес", "Интерлиньяж", "Применение", "Пример"]}
        >
          {TYPE_SCALE.map(([n, size, w, lh, use]) => {
            const px = parseInt(size, 10)
            const display = px >= 26
            return (
              <tr key={n}>
                <td className="font-semibold text-foreground">{n}</td>
                <td>
                  <Mono>{size}</Mono>
                </td>
                <td>
                  <Mono>{w}</Mono>
                </td>
                <td>
                  <Mono>{lh}</Mono>
                </td>
                <td className="text-muted-foreground">{use}</td>
                <td
                  style={{
                    font: `${w} ${px > 24 ? 24 : px}px/1.2 ${display ? "'Inter Display'," : ""}Inter`,
                    letterSpacing: display ? "-0.02em" : "0",
                    color: "var(--nora-text)",
                  }}
                >
                  Nora
                </td>
              </tr>
            )
          })}
        </TokenTable>
      </DocsSection>

      <DocsSection title="Трекинг и интерлиньяж">
        <p className="max-w-[680px] text-[13px] leading-relaxed text-muted-foreground">
          Маркетинговые заголовки набираются плотно:{" "}
          <Mono>letter-spacing: -0.01em…-0.05em</Mono> (чем крупнее — тем
          плотнее) при <Mono>line-height: 1em–1.1em</Mono>. Текстовые абзацы
          сайта — <Mono>1.4em–1.6em</Mono>. В редакторе трекинг нулевой,
          интерлиньяж 1.2–1.4.
        </p>
      </DocsSection>

      <DocsSection title="Живой пример">
        <DemoBlock
          title="Типографическая иерархия"
          description="Inter Display / Inter / Input Mono"
          code={`font-family: var(--nora-font-display)`}
        >
          <div className="flex max-w-[460px] flex-col items-center gap-3.5 text-center">
            <div
              className="text-[34px] leading-[1.05] font-bold tracking-[-0.03em]"
              style={{
                fontFamily: "var(--nora-font-display)",
                color: "var(--nora-text)",
              }}
            >
              Ship sites with style
            </div>
            <div
              className="text-sm leading-relaxed font-medium"
              style={{ color: "var(--nora-text-secondary)" }}
            >
              Подзаголовок набирается Inter 14/1.6 вторичным цветом. Он спокойный
              и не спорит с заголовком.
            </div>
            <div
              className="text-xs font-medium"
              style={{ color: "var(--nora-text-tertiary)" }}
            >
              Третичный текст — метаданные и подписи · 12px
            </div>
            <code
              className="rounded-md px-2 py-1 text-xs"
              style={{
                fontFamily: "var(--nora-font-mono)",
                background: "var(--nora-surface)",
                color: "var(--nora-tint)",
              }}
            >
              --nora-fresco-tint-color: #0099ff
            </code>
          </div>
        </DemoBlock>
      </DocsSection>
    </DocsPage>
  )
}

/* ------------------------------------------------------------------ */
/*  Иконки                                                             */
/* ------------------------------------------------------------------ */

function IconGrid({
  icons,
  copied,
  onCopy,
}: {
  icons: typeof NORA_ICONS
  copied: string | null
  onCopy: (id: string, svg: string) => void
}) {
  return (
    <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-12">
      {icons.map((icon) => (
        <button
          key={icon.id}
          type="button"
          title={`${icon.id} · ${icon.w}×${icon.h}`}
          onClick={() => onCopy(icon.id, icon.svg)}
          className="relative flex aspect-square items-center justify-center rounded-lg bg-card text-muted-foreground ring-1 ring-border transition-colors hover:bg-muted hover:text-foreground"
        >
          <NoraIcon icon={icon.id} className="size-5" />
          {copied === icon.id ? (
            <span className="absolute inset-x-0 bottom-0 rounded-b-lg bg-primary py-0.5 text-center text-[9px] font-medium text-white">
              Copied
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

export function DsIconsPage() {
  const [copied, setCopied] = React.useState<string | null>(null)
  const editorIcons = NORA_ICONS.filter((i) => i.src === "editor")
  const mkIcons = NORA_ICONS.filter((i) => i.src === "marketing")

  async function onCopy(id: string, svg: string) {
    await copyText(svg)
    setCopied(id)
    window.setTimeout(() => setCopied(null), 1400)
  }

  return (
    <DocsPage
      title="Иконки"
      description={`${NORA_ICONS.length} уникальных SVG-иконок, извлечённых из сохранённых страниц: ${editorIcons.length} из редактора и ${mkIcons.length} из маркетинга. Основные размеры — 20×20 (тулбар), 12×12 (панели), 30×30 (крупные элементы). Клик по иконке копирует её SVG-код.`}
    >
      <DocsSection title="Принципы иконографики">
        <p className="max-w-[680px] text-[13px] leading-relaxed text-muted-foreground">
          Иконки Nora — линейные, со штрихом ≈1.3–1.5px на сетке 12–20px,
          скруглённые окончания (<Mono>stroke-linecap=&quot;round&quot;</Mono>).
          Цвет — всегда <Mono>currentColor</Mono>: в покое #999, при наведении
          наследуют цвет текста, в активном состоянии — tint.
        </p>
      </DocsSection>

      <DocsSection title={`Иконки редактора · ${editorIcons.length}`}>
        <IconGrid icons={editorIcons} copied={copied} onCopy={onCopy} />
      </DocsSection>

      <DocsSection title={`Иконки сайта · ${mkIcons.length}`}>
        <IconGrid icons={mkIcons} copied={copied} onCopy={onCopy} />
      </DocsSection>
    </DocsPage>
  )
}

/* ------------------------------------------------------------------ */
/*  Сетка и отступы                                                    */
/* ------------------------------------------------------------------ */

export function DsSpacingPage() {
  const scale = [5, 10, 15, 20, 25, 30, 40, 60]
  return (
    <DocsPage
      title="Сетка и отступы"
      description="Пространственная система Nora построена на базовой единице 5px. Частотный анализ значений gap и padding на сайте подтверждает шкалу: 10px — самый частый gap, затем 5, 15, 8, 20, 40px."
    >
      <DocsSection title="Шкала отступов">
        <div className="flex flex-col gap-2">
          {scale.map((v) => (
            <div key={v} className="flex items-center gap-3 text-[12px]">
              <span className="w-28 shrink-0 font-mono text-muted-foreground">
                space-{v} · {v}px
              </span>
              <span
                className="h-3 rounded-sm bg-primary/70"
                style={{ width: v * 3 }}
              />
            </div>
          ))}
        </div>
      </DocsSection>

      <DocsSection title="Плотность Nora (--nora-*)">
        <p className="mb-3 max-w-[680px] text-[13px] leading-relaxed text-muted-foreground">
          Контракт для продукта, демо и блоков: высоты только через токены.
          Docs shell (сайдбар приложения) может быть выше — это оболочка
          документации, не chrome редактора.
        </p>
        <TokenTable headers={["Токен", "Значение", "Назначение"]}>
          {[
            ["--nora-row-h", "30px", "строки панелей, list items, toolbar icon buttons"],
            ["--nora-control-h", "30px", "кнопки, инпуты, select, меню, segmented, switch"],
            ["--nora-control-h-sm", "22px", "compact chips / mini controls"],
            ["--nora-artboard-stroke", "scheme", "рамка artboard (мягче в light)"],
            ["--nora-kbd-bg / on-tint", "scheme", "шорткаты в меню, в т.ч. на tint"],
          ].map(([a, b, c]) => (
            <tr key={a}>
              <td className="font-semibold text-foreground">
                <Mono>{a}</Mono>
              </td>
              <td>
                <Mono>{b}</Mono>
              </td>
              <td className="text-muted-foreground">{c}</td>
            </tr>
          ))}
        </TokenTable>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-24 rounded-[var(--nora-radius-md)] bg-primary"
              style={{ height: "var(--nora-row-h)" }}
            />
            <span className="text-[10px] text-muted-foreground">row 30</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-24 rounded-[var(--nora-radius-md)] bg-primary/80"
              style={{ height: "var(--nora-control-h)" }}
            />
            <span className="text-[10px] text-muted-foreground">control 26</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-24 rounded-[var(--nora-radius-sm)] bg-primary/60"
              style={{ height: "var(--nora-control-h-sm)" }}
            />
            <span className="text-[10px] text-muted-foreground">sm 22</span>
          </div>
        </div>
      </DocsSection>

      <DocsSection title="Ключевые метрики редактора">
        <TokenTable headers={["Метрика", "Значение", "Где используется"]}>
          {[
            ["Строка панели", "var(--nora-row-h) · 30px", "строки свойств, пункты списков страниц и слоёв"],
            ["Контрол", "var(--nora-control-h) · 30px", "кнопки, инпуты, селекты, иконки-кнопки"],
            ["Пункт меню", "30px", "выпадающие и контекстные меню (как Framer filter/menu)"],
            ["Внутренний отступ панели", "10px", "панели, меню (5px), карточки (15px)"],
            ["Колонка меток", "72–84px", "левая колонка строк панели свойств"],
            ["Ширина левой панели", "260px", "Pages / Layers"],
            ["Высота тулбара", "51px", "верхняя панель редактора"],
          ].map(([a, b, c]) => (
            <tr key={a}>
              <td className="font-semibold text-foreground">{a}</td>
              <td>
                <Mono>{b}</Mono>
              </td>
              <td className="text-muted-foreground">{c}</td>
            </tr>
          ))}
        </TokenTable>
      </DocsSection>

      <DocsSection title="Сетка маркетингового сайта">
        <p className="max-w-[680px] text-[13px] leading-relaxed text-muted-foreground">
          Контент сайта живёт в контейнере с максимальной шириной ~1200px.
          Вертикальный ритм секций — 60–120px, gap внутри секций — 20–40px.
          Карточки используют внутренний отступ 20–25px.
        </p>
      </DocsSection>

      <DocsSection title="Живой пример">
        <DemoBlock
          title="Ритм 5px в действии"
          description="5 / 10 / 15 / 20"
          code={`gap: 10px · row height: 30px`}
        >
          <div className="flex w-[240px] flex-col gap-2.5">
            <NoraSearch placeholder="gap: 7px внутри контрола" />
            <div className="flex gap-2.5">
              <NoraButton className="flex-1">gap 10px</NoraButton>
              <NoraButton variant="primary" className="flex-1">
                между кнопками
              </NoraButton>
            </div>
            <NoraPanel className="w-full">
              <NoraPanelRow label="padding">
                <NoraStepper defaultValue="10px" />
              </NoraPanelRow>
              <NoraPanelRow label="row height">
                <NoraStepper defaultValue="30px" />
              </NoraPanelRow>
            </NoraPanel>
          </div>
        </DemoBlock>
      </DocsSection>
    </DocsPage>
  )
}

/* ------------------------------------------------------------------ */
/*  Скругления                                                         */
/* ------------------------------------------------------------------ */

const RADII = [
  ["radius-xs", "4px", "чекбоксы, чипы цвета, kbd"],
  ["radius-sm", "6px", "пункты меню, тултипы, сегменты"],
  ["radius-md", "8px", "кнопки, инпуты, строки списков"],
  ["radius-lg", "10px", "меню, поповеры, тосты"],
  ["radius-xl", "14px", "модальные окна, панели"],
  ["radius-2xl", "16–20px", "карточки сайта, крупные блоки"],
  ["radius-pill", "999px", "бейджи, свитчи, pill-кнопки"],
  ["radius-round", "50%", "аватары, точки статусов"],
] as const

export function DsRadiusPage() {
  return (
    <DocsPage
      title="Скругления"
      description="Радиусы растут вместе с размером элемента: от 4px у чекбокса до 16–20px у карточек сайта. Частотный анализ: 8px и 10px — самые массовые значения в редакторе, 20px — на маркетинговом сайте."
    >
      <DocsSection title="Шкала">
        <div className="flex flex-wrap gap-4">
          {RADII.slice(0, 6).map(([n, v]) => (
            <div key={n} className="flex w-20 flex-col items-center gap-2 text-center">
              <div
                className="size-14 bg-primary/20 ring-1 ring-primary/40"
                style={{ borderRadius: parseInt(v, 10) || 16 }}
              />
              <span className="font-mono text-[10px] text-muted-foreground">
                {n} · {v}
              </span>
            </div>
          ))}
          <div className="flex w-24 flex-col items-center gap-2 text-center">
            <div
              className="h-14 w-24 bg-primary/20 ring-1 ring-primary/40"
              style={{ borderRadius: 999 }}
            />
            <span className="font-mono text-[10px] text-muted-foreground">
              pill · 999px
            </span>
          </div>
          <div className="flex w-20 flex-col items-center gap-2 text-center">
            <div
              className="size-14 bg-primary/20 ring-1 ring-primary/40"
              style={{ borderRadius: "50%" }}
            />
            <span className="font-mono text-[10px] text-muted-foreground">
              round · 50%
            </span>
          </div>
        </div>
      </DocsSection>

      <TokenTable headers={["Токен", "Значение", "Применение"]}>
        {RADII.map(([n, v, use]) => (
          <tr key={n}>
            <td>
              <button
                type="button"
                className="cursor-pointer font-mono text-[11px] hover:text-primary"
                onClick={() => copyText(`var(--nora-${n})`)}
              >
                --nora-{n}
              </button>
            </td>
            <td>
              <Mono>{v}</Mono>
            </td>
            <td className="text-muted-foreground">{use}</td>
          </tr>
        ))}
      </TokenTable>

      <DocsSection title="Живой пример">
        <DemoBlock
          title="Радиус растёт с размером"
          description="4 → 6 → 8 → 10 → pill → round"
          code={`--nora-radius-xs … --nora-radius-pill`}
        >
          <NoraCheckbox defaultChecked label="4px" />
          <NoraTooltip>6px</NoraTooltip>
          <NoraButton variant="primary">8px</NoraButton>
          <NoraMenu className="min-w-[110px]">
            <NoraMenuItem>10px</NoraMenuItem>
          </NoraMenu>
          <NoraBadge variant="blue">pill</NoraBadge>
          <NoraAvatar className="size-8 text-[9px] leading-none tracking-tight">
            50%
          </NoraAvatar>
        </DemoBlock>
      </DocsSection>
    </DocsPage>
  )
}

/* ------------------------------------------------------------------ */
/*  Тени                                                               */
/* ------------------------------------------------------------------ */

const SHADOW_LEVELS = [
  ["Focus Ring", "inset 0 0 0 1px #09F, 0 0 5px #09F", "фокус полей ввода — фирменное синее свечение"],
  ["Button Depth (light)", "0 0 0 1px rgba(0,0,0,.02), 0 1px 3px rgba(0,0,0,.05)", "кнопки с «глубиной» в светлой теме"],
  ["Button Depth (dark)", "0 2px 4px rgba(0,0,0,.2)", "кнопки с «глубиной» в тёмной теме"],
  ["Primary Glow", "0 1px 2px rgba(0,153,255,.15), 0 2px 4px rgba(0,153,255,.2)", "синие CTA — цветная тень"],
  ["Selected", "0 2px 4px rgba(0,0,0,.1), 0 1px 2px rgba(0,0,0,.1)", "выбранный сегмент, приподнятые элементы"],
  ["Popover", "0 10px 30px rgba(0,0,0,.5) + hairline", "меню, дропдауны, поповеры"],
  ["Modal", "0 20px 60px rgba(0,0,0,.6) + hairline", "модальные окна"],
  ["Marketing Card", "0 26px 41px rgba(0,0,0,.2)", "карточки и медиа на сайте"],
  ["Marketing Hero", "0 40px 64px rgba(0,0,0,.2)", "крупные превью на сайте"],
] as const

export function DsShadowsPage() {
  return (
    <DocsPage
      title="Тени и высота"
      description="Nora использует тени экономно: у плоских контролов их нет вовсе, «высота» появляется у всплывающих слоёв. Отдельный приём — hairline-рамка внутри тени (0 0 0 1px) вместо border, и цветные тени у синих CTA."
    >
      <DocsSection title="Уровни высоты">
        <div className="flex flex-wrap gap-4">
          {[
            {
              label: "Focus Ring",
              style: {
                background: "var(--nora-input-bg,#2b2b2b)",
                boxShadow: "inset 0 0 0 1px #09f,0 0 5px #09f",
              },
            },
            {
              label: "Button Depth",
              style: {
                background: "var(--nora-button-bg)",
                boxShadow: "var(--nora-shadow-button)",
              },
            },
            {
              label: "Primary Glow",
              style: {
                background: "#0099ff",
                boxShadow:
                  "0 1px 2px rgba(0,153,255,.3),0 2px 4px rgba(0,153,255,.35)",
              },
            },
            {
              label: "Popover",
              style: {
                background: "var(--nora-popover)",
                boxShadow: "var(--nora-shadow-popover)",
              },
            },
            {
              label: "Modal",
              style: {
                background: "var(--nora-modal)",
                boxShadow: "var(--nora-shadow-modal)",
              },
            },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-2">
              <div className="size-16 rounded-[10px]" style={s.style} />
              <span className="text-[11px] text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </DocsSection>

      <TokenTable headers={["Уровень", "Значение", "Применение"]}>
        {SHADOW_LEVELS.map(([n, v, use]) => (
          <tr key={n}>
            <td className="font-semibold text-foreground">{n}</td>
            <td>
              <button
                type="button"
                className="cursor-pointer text-left font-mono text-[11px] text-muted-foreground hover:text-primary"
                onClick={() => copyText(v)}
              >
                {v}
              </button>
            </td>
            <td className="text-muted-foreground">{use}</td>
          </tr>
        ))}
      </TokenTable>

      <DocsSection title="Живой пример">
        <DemoBlock
          title="Тени в текущей схеме"
          description="shadow-focus / shadow-button / shadow-popover"
          code={`box-shadow: var(--nora-shadow-popover)`}
        >
          <NoraInput
            className="w-[150px]"
            style={{ boxShadow: "var(--nora-shadow-focus)" }}
            defaultValue="Focus ring"
            readOnly
          />
          <NoraButton variant="primary" depth>
            Primary CTA
          </NoraButton>
          <NoraMenu className="min-w-[130px]">
            <NoraMenuItem>Popover shadow</NoraMenuItem>
          </NoraMenu>
        </DemoBlock>
      </DocsSection>
    </DocsPage>
  )
}

/* ------------------------------------------------------------------ */
/*  Рамки                                                              */
/* ------------------------------------------------------------------ */

export function DsBordersPage() {
  return (
    <DocsPage
      title="Рамки и разделители"
      description="Вместо классических border Nora почти всегда использует hairline-тени (box-shadow: 0 0 0 1px) и полупрозрачные разделители. Это даёт идеально тонкие линии, не влияющие на layout."
    >
      <DocsSection title="Токены">
        <TokenTable
          headers={["Токен", "Editor Light", "Editor Dark", "Marketing", "Применение"]}
        >
          {[
            ["divider", "#EEEEEE", "rgba(255,255,255,.06)", "rgba(255,255,255,.06)", "разделители секций и строк"],
            ["border", "#EEEEEE", "#252525", "rgba(255,255,255,.1)", "границы панелей и карточек"],
            ["border-strong", "#DDDDDD", "#333333", "rgba(255,255,255,.16)", "рамки контролов (чекбокс, свитч)"],
            ["focus", "inset 0 0 0 1px #09F + glow", "—", "—", "кольцо фокуса"],
            ["selection", "2px solid #0099FF", "—", "—", "выделение слоя на канвасе"],
            ["component selection", "2px solid #8855FF", "—", "—", "выделение компонента на канвасе"],
          ].map(([a, b, c, d, e]) => (
            <tr key={a}>
              <td>
                <Mono className="text-foreground">{a}</Mono>
              </td>
              <td>
                <Mono>{b}</Mono>
              </td>
              <td>
                <Mono>{c}</Mono>
              </td>
              <td>
                <Mono>{d}</Mono>
              </td>
              <td className="text-muted-foreground">{e}</td>
            </tr>
          ))}
        </TokenTable>
      </DocsSection>

      <DocsSection title="Приёмы">
        <div className="flex flex-col gap-3 text-[13px] leading-relaxed text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">
              Hairline вместо border.
            </span>{" "}
            Панели и карточки:{" "}
            <Mono>box-shadow: 0 0 0 1px var(--border)</Mono> — линия не занимает
            места и корректно скругляется.
          </p>
          <p>
            <span className="font-semibold text-foreground">
              Полупрозрачные разделители.
            </span>{" "}
            В тёмных темах разделители задаются как белый с 6–10% непрозрачности —
            так они одинаково работают на любом фоне.
          </p>
          <p>
            <span className="font-semibold text-foreground">
              Рамка только по необходимости.
            </span>{" "}
            Плоские контролы различимы за счёт заливки; рамка появляется лишь у
            мелких элементов (чекбокс 14px), где заливки недостаточно.
          </p>
        </div>
      </DocsSection>

      <DocsSection title="Живой пример">
        <DemoBlock
          title="Рамки в текущей схеме"
          description="hairline / divider / selection"
          code={`box-shadow: 0 0 0 1px var(--nora-border)`}
        >
          <div className="flex w-[250px] flex-col gap-3.5">
            <div
              className="rounded-[10px] p-3 text-xs font-medium"
              style={{
                background: "var(--nora-panel)",
                boxShadow: "0 0 0 1px var(--nora-border)",
                color: "var(--nora-text)",
              }}
            >
              Панель с hairline-рамкой
            </div>
            <NoraDivider />
            <NoraDivider title="Разделитель с меткой" />
            <div
              className="flex h-14 items-center justify-center rounded-lg text-[11px] font-medium"
              style={{
                background: "var(--nora-surface)",
                boxShadow: "0 0 0 2px var(--nora-tint)",
                color: "var(--nora-tint)",
              }}
            >
              Выделение слоя 2px
            </div>
          </div>
        </DemoBlock>
      </DocsSection>
    </DocsPage>
  )
}

/* ------------------------------------------------------------------ */
/*  Анимация                                                           */
/* ------------------------------------------------------------------ */

export function DsMotionPage() {
  return (
    <DocsPage
      title="Анимация"
      description="Движение в Nora быстрое и утилитарное: hover-переходы 100–150ms, появление поповеров 150–200ms, крупные переходы 250ms. Из кода извлечены реальные значения transition."
    >
      <DocsSection title="Длительности">
        <TokenTable headers={["Токен", "Значение", "Применение"]}>
          {[
            ["duration-fast", "100ms", "hover пунктов меню, мгновенная реакция"],
            ["duration", "150ms", "кнопки, поля, цвет и фон (основная)"],
            ["duration-med", "160–200ms", "появление/скрытие оверлеев, opacity"],
            ["duration-slow", "250ms", "свитчи, панели, крупные переходы"],
          ].map(([a, b, c]) => (
            <tr key={a}>
              <td>
                <Mono className="text-foreground">{a}</Mono>
              </td>
              <td>
                <Mono>{b}</Mono>
              </td>
              <td className="text-muted-foreground">{c}</td>
            </tr>
          ))}
        </TokenTable>
      </DocsSection>

      <DocsSection title="Кривые">
        <TokenTable headers={["Кривая", "Значение", "Применение"]}>
          {[
            ["Ease (сайт)", "cubic-bezier(.44, 0, .56, 1)", "плавные переходы цвета и трансформаций"],
            ["Ease-out", "ease-out", "появление элементов (opacity .16s ease-out)"],
            ["Linear", "linear", "спиннеры, прогресс"],
          ].map(([a, b, c]) => (
            <tr key={a}>
              <td className="font-semibold text-foreground">{a}</td>
              <td>
                <button
                  type="button"
                  className="cursor-pointer font-mono text-[11px] text-muted-foreground hover:text-primary"
                  onClick={() => copyText(b)}
                >
                  {b}
                </button>
              </td>
              <td className="text-muted-foreground">{c}</td>
            </tr>
          ))}
        </TokenTable>
      </DocsSection>

      <DocsSection title="Типовые переходы из кода">
        <TokenTable headers={["CSS", "Где"]}>
          {[
            ["background-color .15s, box-shadow .15s, color .15s", "кнопки редактора"],
            ["opacity .16s ease-out", "появление оверлеев"],
            ["opacity .15s, visibility 0s linear 0s", "тултипы"],
            ["all .25s ease", "панели и крупные элементы"],
            ["color .1s, background-color .1s", "пункты меню"],
          ].map(([a, b]) => (
            <tr key={a}>
              <td>
                <Mono>{a}</Mono>
              </td>
              <td className="text-muted-foreground">{b}</td>
            </tr>
          ))}
        </TokenTable>
      </DocsSection>

      <DocsSection title="Живой пример">
        <DemoBlock
          title="Наведите и покликайте"
          description="150ms ease / 250ms bezier / linear"
          code={`transition: background-color .15s`}
        >
          <NoraButton variant="primary">Hover 150ms</NoraButton>
          <NoraSwitch />
          <NoraSpinner />
          <div className="w-[140px]">
            <NoraProgress value={60} />
          </div>
        </DemoBlock>
      </DocsSection>
    </DocsPage>
  )
}

/* ------------------------------------------------------------------ */
/*  Все токены                                                         */
/* ------------------------------------------------------------------ */

export function DsTokensPage() {
  const [scheme, setScheme] = React.useState<"light" | "dark">("dark")
  const [query, setQuery] = React.useState("")

  const light = NORA_TOKENS.light
  const dark = NORA_TOKENS.dark
  const keys = Object.keys(light).sort()
  const f = query.toLowerCase()

  const rows: { key: string; lv: string; dv: string }[] = []
  for (const k of keys) {
    const lv = light[k] || ""
    const dv = dark[k] || lv
    if (
      f &&
      !k.toLowerCase().includes(f) &&
      !lv.toLowerCase().includes(f) &&
      !dv.toLowerCase().includes(f)
    ) {
      continue
    }
    rows.push({ key: k, lv, dv })
    if (rows.length >= 400) break
  }

  const totalMatch = keys.filter((k) => {
    const lv = light[k] || ""
    const dv = dark[k] || lv
    if (!f) return true
    return (
      k.toLowerCase().includes(f) ||
      lv.toLowerCase().includes(f) ||
      dv.toLowerCase().includes(f)
    )
  }).length

  return (
    <DocsPage
      title="Все токены"
      description={`Источник правды для продукта — --nora-* в nora-ui.css. Ниже приведён reference-архив из ${Object.keys(dark).length} исторических токенов: он не участвует в рендеринге и не используется компонентами.`}
    >
      <DocsSection title="Nora runtime (--nora-*)">
        <p className="mb-3 max-w-[680px] text-[13px] leading-relaxed text-muted-foreground">
          Живые схемы <Mono>scheme-editor-dark</Mono> /{" "}
          <Mono>scheme-editor-light</Mono> / <Mono>scheme-marketing</Mono> на{" "}
          <Mono>html</Mono>. Компоненты используют только эти переменные —
          см. AGENTS.md и страницу «Сетка и отступы».
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            "--nora-control-h",
            "--nora-row-h",
            "--nora-tint",
            "--nora-kbd-on-tint-bg",
            "--nora-artboard-stroke",
          ].map((t) => (
            <code
              key={t}
              className="rounded-[var(--nora-radius-sm)] bg-muted px-2 py-1 text-[11px] font-medium"
            >
              {t}
            </code>
          ))}
        </div>
      </DocsSection>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Tabs
          value={scheme}
          onValueChange={(v) => setScheme(v as "light" | "dark")}
        >
          <TabsList>
            <TabsTrigger value="light">Light</TabsTrigger>
            <TabsTrigger value="dark">Dark</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          placeholder="Фильтр: button, panel, tint, #0099ff…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs text-[12px]"
        />
      </div>

      <p className="mb-2 text-[12px] text-muted-foreground">
        Показано: {Math.min(rows.length, 400)}
        {totalMatch > 400
          ? " (уточните фильтр — совпадений больше)"
          : ` из ${totalMatch}`}
      </p>

      <DocsSection
        title="Reference archive (не runtime)"
        description="Исторические значения оставлены только для сопоставления. Новые компоненты и темы используют исключительно --nora-*."
      >
      <TokenTable headers={["Архивный токен", "Light", "Dark"]}>
        {rows.map(({ key, lv, dv }) => {
          const isColor = /-color$/.test(key) || key.includes("color")
          const show = scheme === "light" ? lv : dv
          return (
            <tr key={key}>
              <td>
                <button
                  type="button"
                  className="max-w-[320px] cursor-pointer truncate font-mono text-[11px] hover:text-primary"
                  onClick={() => copyText(key)}
                  title={key}
                >
                  {key.replace(/^--nora-fresco-/, "")}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  className="inline-flex max-w-[220px] cursor-pointer items-center gap-1.5 truncate text-left hover:text-primary"
                  onClick={() => copyText(lv)}
                >
                  {isColor && lv ? <Swatch color={lv} size={14} /> : null}
                  <Mono>{lv.length > 44 ? `${lv.slice(0, 44)}…` : lv}</Mono>
                </button>
              </td>
              <td>
                <button
                  type="button"
                  className="inline-flex max-w-[220px] cursor-pointer items-center gap-1.5 truncate text-left hover:text-primary"
                  onClick={() => copyText(dv)}
                >
                  {isColor && show ? <Swatch color={dv} size={14} /> : null}
                  <Mono>{dv.length > 44 ? `${dv.slice(0, 44)}…` : dv}</Mono>
                </button>
              </td>
            </tr>
          )
        })}
      </TokenTable>
      </DocsSection>
    </DocsPage>
  )
}
