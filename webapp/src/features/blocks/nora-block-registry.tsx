import * as React from "react"
import {
  ArrowUpIcon,
  BringToFrontIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardPasteIcon,
  ComponentIcon,
  CopyIcon,
  CopyPlusIcon,
  ExternalLinkIcon,
  EyeIcon,
  FileTextIcon,
  FolderIcon,
  FrameIcon,
  Grid3x3Icon,
  HashIcon,
  HomeIcon,
  ImageIcon,
  LayersIcon,
  LayoutGridIcon,
  LockIcon,
  MessageSquareIcon,
  MonitorIcon,
  PaintbrushIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  ScissorsIcon,
  SearchIcon,
  SendToBackIcon,
  SettingsIcon,
  SquareIcon,
  Trash2Icon,
  TypeIcon,
  XIcon,
} from "@/components/icons"

import { useTheme } from "@/components/theme-provider"
import {
  ColorWell,
  NumberStepper,
  PropertyRow,
  SegmentedControl,
} from "@/components/nora/property-controls"
import {
  NoraButton,
  NoraPreviewRoot,
  NoraSelect,
  NoraToast,
} from "@/components/nora/primitives"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

type Scheme = "editor-dark" | "editor-light" | "marketing" | null

/* ------------------------------------------------------------------ */
/* Block-only compositions. Shared primitives live in components/nora. */
/* ------------------------------------------------------------------ */

function NoraKbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="nora-kbd inline-flex h-4 min-w-4 items-center justify-center rounded px-1 font-[family-name:var(--nora-font)] text-[10px] font-medium bg-[var(--nora-kbd-bg)] text-[var(--nora-kbd-text)]">
      {children}
    </span>
  )
}

function NoraMenu({
  children,
  className,
  width = 230,
}: {
  children: React.ReactNode
  className?: string
  width?: number | string
}) {
  return (
    <div
      role="menu"
      className={cn(
        "flex flex-col gap-px rounded-[var(--nora-radius-lg,10px)] bg-[var(--nora-popover)] p-[5px] font-[family-name:var(--nora-font)] text-xs shadow-[var(--nora-shadow-popover)]",
        className
      )}
      style={width ? { width } : undefined}
    >
      {children}
    </div>
  )
}

function NoraMenuItem({
  children,
  active,
  selected,
  danger,
  disabled,
  checked,
  hint,
  shortcut,
  icon: Icon,
  onClick,
  onMouseEnter,
}: {
  children: React.ReactNode
  /** Hover / keyboard focus highlight — solid tint (Nora menu). */
  active?: boolean
  /** Persistent current item (e.g. workspace mode) — tint-dimmed. */
  selected?: boolean
  danger?: boolean
  disabled?: boolean
  checked?: boolean
  hint?: React.ReactNode
  shortcut?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  onClick?: () => void
  onMouseEnter?: () => void
}) {
  const highlighted = Boolean(active) && !danger
  const isSelected = Boolean(selected) && !danger && !highlighted

  return (
    <div
      role="menuitem"
      aria-disabled={disabled || undefined}
      aria-checked={checked ?? selected}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={disabled ? undefined : onMouseEnter}
      onKeyDown={
        onClick && !disabled
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      className={cn(
        "group/item flex h-[var(--nora-control-h,30px)] cursor-pointer items-center gap-2 rounded-[var(--nora-radius-sm,6px)] px-2 whitespace-nowrap outline-none transition-[background-color,color] duration-100",
        disabled && "pointer-events-none cursor-default opacity-40",
        danger
          ? "text-[var(--nora-error)] hover:bg-[var(--nora-error)] hover:text-white"
          : "text-[var(--nora-text)] hover:bg-[var(--nora-tint)] hover:text-white",
        isSelected &&
          "bg-[var(--nora-tint-dimmed)] text-[var(--nora-tint)] hover:bg-[var(--nora-tint)] hover:text-white",
        highlighted && "bg-[var(--nora-tint)] text-white"
      )}
    >
      {Icon ? (
        <Icon className="size-3.5 shrink-0 opacity-80 group-hover/item:opacity-100" />
      ) : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {checked ? (
        <CheckIcon
          className={cn(
            "size-3 shrink-0 opacity-90",
            isSelected && "text-[var(--nora-tint)] group-hover/item:text-white"
          )}
          aria-hidden
        />
      ) : null}
      {hint ? (
        <span
          className={cn(
            "shrink-0 text-[var(--nora-text-tertiary)] group-hover/item:text-white/80",
            isSelected && "text-[var(--nora-tint)]/70 group-hover/item:text-white/80",
            highlighted && "text-white/80"
          )}
        >
          {hint}
        </span>
      ) : null}
      {shortcut ? (
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-0.5",
            "group-hover/item:[&_.nora-kbd]:bg-[var(--nora-kbd-on-tint-bg)] group-hover/item:[&_.nora-kbd]:text-[var(--nora-kbd-on-tint-text)]",
            highlighted &&
              "[&_.nora-kbd]:bg-[var(--nora-kbd-on-tint-bg)] [&_.nora-kbd]:text-[var(--nora-kbd-on-tint-text)]",
            danger &&
              "group-hover/item:[&_.nora-kbd]:bg-[var(--nora-kbd-on-tint-bg)] group-hover/item:[&_.nora-kbd]:text-[var(--nora-kbd-on-tint-text)]"
          )}
        >
          {shortcut}
        </span>
      ) : null}
    </div>
  )
}

function NoraMenuDivider() {
  return <div className="my-1 h-px bg-[var(--nora-divider)]" />
}

function NoraMenuSub({
  label,
  icon: Icon,
  children,
  open,
  onOpen,
  width = 196,
}: {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  open?: boolean
  onOpen?: () => void
  width?: number | string
}) {
  return (
    <div className="relative" onMouseEnter={onOpen}>
      <NoraMenuItem
        icon={Icon}
        active={open}
        hint={<ChevronRightIcon className="size-3.5 opacity-70" />}
        onMouseEnter={onOpen}
      >
        {label}
      </NoraMenuItem>
      {open ? (
        <div className="absolute top-0 left-[calc(100%+4px)] z-10">
          <NoraMenu width={width}>{children}</NoraMenu>
        </div>
      ) : null}
    </div>
  )
}

function NoraPanel({
  children,
  className,
  width,
}: {
  children: React.ReactNode
  className?: string
  width?: number | string
}) {
  return (
    <div
      className={cn(
        "rounded-xl bg-[var(--nora-panel)] p-2.5 shadow-[0_0_0_1px_var(--nora-border)]",
        className
      )}
      style={width ? { width } : undefined}
    >
      {children}
    </div>
  )
}

function NoraPillTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: string[]
  active: string
  onChange?: (tab: string) => void
}) {
  return (
    <div className="flex h-[var(--nora-control-h,30px)] items-center gap-0.5 rounded-[var(--nora-radius-md,8px)] bg-[var(--nora-input-bg)] p-[3px]">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange?.(tab)}
          className={cn(
            "flex h-full flex-1 items-center justify-center rounded-[var(--nora-radius-sm,6px)] px-2 text-[11px] font-medium transition-[background-color,color,box-shadow] duration-[var(--nora-duration,0.15s)]",
            tab === active
              ? "bg-[var(--nora-panel)] text-[var(--nora-text)] shadow-[var(--nora-shadow-subtle)]"
              : "text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)]"
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

function NoraListItem({
  children,
  active,
  selected,
  depth = 0,
  count,
  component,
  icon: Icon,
  chevron,
  onClick,
  onChevronClick,
  onDelete,
}: {
  children: React.ReactNode
  active?: boolean
  selected?: boolean
  depth?: number
  count?: string | number
  component?: boolean
  icon?: React.ComponentType<{ className?: string }>
  chevron?: "open" | "closed"
  onClick?: () => void
  onChevronClick?: () => void
  onDelete?: () => void
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick || onDelete
          ? (e) => {
              if (onClick && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault()
                onClick()
              }
              if (
                onDelete &&
                (e.key === "Delete" || e.key === "Backspace")
              ) {
                e.preventDefault()
                e.stopPropagation()
                onDelete()
              }
            }
          : undefined
      }
      style={{ paddingLeft: `${8 + depth * 14}px` }}
      className={cn(
        "group/row flex h-[var(--nora-row-h,30px)] items-center gap-2 rounded-[var(--nora-radius-md,8px)] pr-1.5 font-[family-name:var(--nora-font)] text-xs font-medium transition-[background-color,color] duration-[var(--nora-duration,0.15s)] outline-none",
        onClick && "cursor-pointer focus-visible:shadow-[var(--nora-shadow-focus)]",
        !selected &&
          !active &&
          "text-[var(--nora-text-secondary)] hover:bg-[var(--nora-row-hover)] hover:text-[var(--nora-text)]",
        active &&
          !selected &&
          "bg-[var(--nora-row-active-bg)] text-[var(--nora-text)]",
        selected &&
          "bg-[var(--nora-tint-dimmed)] text-[var(--nora-tint)] hover:bg-[var(--nora-tint-dimmed)]",
        component && !selected && "text-[var(--nora-component)]"
      )}
    >
      {chevron ? (
        <button
          type="button"
          tabIndex={-1}
          aria-label={chevron === "open" ? "Collapse" : "Expand"}
          className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-[3px] text-[var(--nora-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--nora-text)_8%,transparent)] hover:text-[var(--nora-text-secondary)]"
          onClick={(e) => {
            e.stopPropagation()
            onChevronClick?.()
          }}
        >
          {chevron === "open" ? (
            <ChevronDownIcon className="size-3" />
          ) : (
            <ChevronRightIcon className="size-3" />
          )}
        </button>
      ) : depth > 0 ? (
        <span className="size-3.5 shrink-0" />
      ) : null}
      {Icon ? (
        <Icon className="size-3.5 shrink-0 opacity-80 [&_svg]:size-full" />
      ) : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {count != null ? (
        <span className="shrink-0 text-[10px] font-medium text-[var(--nora-text-tertiary)]">
          {count}
        </span>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Delete"
          title="Delete (⌫)"
          className={cn(
            "inline-flex size-5 shrink-0 items-center justify-center rounded-[var(--nora-radius-sm,6px)] text-[var(--nora-text-tertiary)] transition-[opacity,background-color,color] hover:bg-[color-mix(in_srgb,var(--nora-error)_12%,transparent)] hover:text-[var(--nora-error)]",
            selected
              ? "opacity-100"
              : "opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100"
          )}
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2Icon className="size-3" />
        </button>
      ) : null}
    </div>
  )
}

function NoraIconBtn({
  children,
  active,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  active?: boolean
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-lg text-[var(--nora-text-secondary)] transition-colors hover:bg-[var(--nora-row-hover)] hover:text-[var(--nora-text)]",
        active && "bg-[var(--nora-tint-dimmed)] text-[var(--nora-tint)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function NoraSearch({
  placeholder = "Search…",
  value,
  onChange,
}: {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
}) {
  return (
    <div
      className={cn(
        "flex h-[var(--nora-control-h,30px)] items-center gap-2 rounded-[var(--nora-radius-md,8px)] bg-[var(--nora-input-bg)] px-2 transition-[box-shadow] duration-[var(--nora-duration,0.15s)]",
        "focus-within:shadow-[var(--nora-shadow-focus)]"
      )}
    >
      <SearchIcon className="size-3 shrink-0 text-[var(--nora-text-tertiary)]" />
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-xs text-[var(--nora-input-text)] outline-none placeholder:text-[var(--nora-input-placeholder)]"
      />
    </div>
  )
}

function NoraBadge({
  children,
  variant = "blue",
}: {
  children: React.ReactNode
  variant?: "blue" | "green" | "purple"
}) {
  const colors = {
    blue: "bg-[var(--nora-tint-dimmed)] text-[var(--nora-tint)]",
    green: "bg-[var(--nora-success-dimmed)] text-[var(--nora-success)]",
    purple: "bg-[var(--nora-component-dimmed)] text-[var(--nora-component)]",
  }
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-md px-1.5 text-[10px] font-semibold",
        colors[variant]
      )}
    >
      {children}
    </span>
  )
}

function NoraLogo({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="20"
      viewBox="0 0 256 384"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M0 0h256v128H128L0 0Zm0 128h128l128 128H128v128L0 256V128Z" />
    </svg>
  )
}

function wrapBlock(Component: React.ComponentType, scheme: Scheme = null) {
  return () => (
    <NoraPreviewRoot scheme={scheme}>
      <Component />
    </NoraPreviewRoot>
  )
}

/* ------------------------------------------------------------------ */
/* Editor blocks                                                       */
/* ------------------------------------------------------------------ */

function NoraToolbar() {
  const tools = [Grid3x3Icon, TypeIcon, ImageIcon, LayoutGridIcon]
  return (
    <div className="flex h-11 w-full max-w-[860px] items-center gap-2 rounded-xl bg-[var(--nora-panel)] px-2.5 shadow-[0_0_0_1px_var(--nora-border)]">
      <NoraIconBtn>
        <NoraLogo />
      </NoraIconBtn>
      <div className="h-5 w-px bg-[var(--nora-divider)]" />
      <Button size="sm" className="h-[var(--nora-control-h)] gap-1 rounded-lg px-2 text-xs">
        <PlusIcon className="size-3" /> Insert
      </Button>
      {tools.map((Icon, i) => (
        <NoraIconBtn key={i} active={i === 3}>
          <Icon className="size-3.5" />
        </NoraIconBtn>
      ))}
      <div className="flex flex-1 items-center justify-center gap-1.5 text-xs font-semibold">
        True Points{" "}
        <span className="font-medium text-[var(--nora-text-dimmed)]">— Draft</span>
      </div>
      <div className="flex -space-x-1.5">
        <Avatar className="size-6 border-2 border-[var(--nora-panel)]">
          <AvatarFallback className="text-[9px]">NK</AvatarFallback>
        </Avatar>
        <Avatar className="size-6 border-2 border-[var(--nora-panel)]">
          <AvatarFallback className="bg-gradient-to-br from-[var(--nora-error)] to-[var(--nora-warning)] text-[9px] text-white">
            EV
          </AvatarFallback>
        </Avatar>
      </div>
      <NoraIconBtn>
        <PlayIcon className="size-3.5 fill-current" />
      </NoraIconBtn>
      <Button size="sm" className="h-[var(--nora-control-h)] rounded-lg px-3 text-xs">
        Publish
      </Button>
    </div>
  )
}

type LeftTab = "Pages" | "Layers" | "Assets"

type PageRow = {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  count?: string
  home?: boolean
}

type LayerRow = {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  depth: number
  component?: boolean
  folder?: boolean
  parentId?: string
}

function NoraLeftPanel({ initialTab = "Pages" }: { initialTab?: LeftTab } = {}) {
  const [tab, setTab] = React.useState<LeftTab>(initialTab)
  const [pages, setPages] = React.useState<PageRow[]>([
    { id: "home", name: "Home", icon: HomeIcon, home: true },
    { id: "about", name: "About", icon: FileTextIcon },
    { id: "pricing", name: "Pricing", icon: MonitorIcon },
    { id: "blog", name: "Blog", icon: FolderIcon, count: "12" },
    { id: "contacts", name: "Contacts", icon: MessageSquareIcon },
    { id: "404", name: "404", icon: HashIcon },
  ])
  const [cms] = React.useState([
    { id: "cms-posts", name: "Blog Posts", count: "24" },
    { id: "cms-authors", name: "Authors", count: "5" },
  ])
  const [selectedPage, setSelectedPage] = React.useState("pricing")
  const [currentPage, setCurrentPage] = React.useState("home")

  const [layers] = React.useState<LayerRow[]>([
    { id: "desktop", name: "Desktop", icon: Grid3x3Icon, depth: 0, folder: true },
    {
      id: "hero",
      name: "Hero Section",
      icon: LayoutGridIcon,
      depth: 1,
      folder: true,
      parentId: "desktop",
    },
    {
      id: "heading",
      name: "Heading",
      icon: TypeIcon,
      depth: 2,
      parentId: "hero",
    },
    {
      id: "subtitle",
      name: "Subtitle",
      icon: TypeIcon,
      depth: 2,
      parentId: "hero",
    },
    {
      id: "btn",
      name: "Button Primary",
      icon: SquareIcon,
      depth: 2,
      component: true,
      parentId: "hero",
    },
    {
      id: "features",
      name: "Features Grid",
      icon: LayoutGridIcon,
      depth: 1,
      folder: true,
      parentId: "desktop",
    },
    {
      id: "feat-card",
      name: "Feature Card",
      icon: SquareIcon,
      depth: 2,
      component: true,
      parentId: "features",
    },
    {
      id: "bg",
      name: "Background",
      icon: ImageIcon,
      depth: 1,
      parentId: "desktop",
    },
    {
      id: "nav",
      name: "Navbar",
      icon: SquareIcon,
      depth: 1,
      component: true,
      parentId: "desktop",
    },
  ])
  const [selectedLayer, setSelectedLayer] = React.useState("heading")
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({
    desktop: true,
    hero: true,
    features: false,
  })

  const assets = [
    { id: "comp-btn", name: "Button", icon: SquareIcon, section: "Components", component: true },
    { id: "comp-nav", name: "Navbar", icon: SquareIcon, section: "Components", component: true },
    { id: "comp-card", name: "Card", icon: LayoutGridIcon, section: "Components", component: true },
    { id: "style-h1", name: "Heading / H1", icon: TypeIcon, section: "Text Styles" },
    { id: "style-body", name: "Body / Default", icon: TypeIcon, section: "Text Styles" },
    { id: "color-tint", name: "Tint / Primary", icon: FrameIcon, section: "Color Styles" },
    { id: "color-bg", name: "Background", icon: FrameIcon, section: "Color Styles" },
  ]
  const [selectedAsset, setSelectedAsset] = React.useState("comp-btn")

  const visibleLayers = layers.filter((layer) => {
    if (!layer.parentId) return true
    let parent: string | undefined = layer.parentId
    while (parent) {
      if (!expanded[parent]) return false
      parent = layers.find((l) => l.id === parent)?.parentId
    }
    return true
  })

  function addPage() {
    const n = pages.filter((p) => p.name.startsWith("Untitled")).length + 1
    const id = `untitled-${Date.now()}`
    setPages((prev) => [
      ...prev,
      { id, name: n === 1 ? "Untitled" : `Untitled ${n}`, icon: FileTextIcon },
    ])
    setSelectedPage(id)
    setCurrentPage(id)
  }

  function deletePage(id: string) {
    const page = pages.find((p) => p.id === id)
    if (!page || page.home) return
    const idx = pages.findIndex((p) => p.id === id)
    const next =
      pages[idx + 1] ?? pages[idx - 1] ?? pages.find((p) => p.id !== id)
    setPages((prev) => prev.filter((p) => p.id !== id))
    if (selectedPage === id && next) {
      setSelectedPage(next.id)
      setCurrentPage(next.id)
    }
  }

  return (
    <NoraPanel width={240} className="flex min-h-[320px] flex-col gap-1">
      <NoraPillTabs
        tabs={["Pages", "Layers", "Assets"]}
        active={tab}
        onChange={(t) => setTab(t as LeftTab)}
      />

      {tab === "Pages" ? (
        <>
          <div className="mt-1.5 flex flex-col gap-px">
            {pages.map((p) => (
              <NoraListItem
                key={p.id}
                active={currentPage === p.id && selectedPage !== p.id}
                selected={selectedPage === p.id}
                count={p.count}
                icon={p.icon}
                onClick={() => {
                  setSelectedPage(p.id)
                  setCurrentPage(p.id)
                }}
                onDelete={p.home ? undefined : () => deletePage(p.id)}
              >
                {p.name}
              </NoraListItem>
            ))}
          </div>
          <div className="mt-1.5 flex h-[var(--nora-row-h,30px)] items-center px-2 text-[11px] font-semibold text-[var(--nora-text-tertiary)]">
            CMS
          </div>
          <div className="flex flex-col gap-px">
            {cms.map((item) => (
              <NoraListItem
                key={item.id}
                icon={LayoutGridIcon}
                count={item.count}
                selected={selectedPage === item.id}
                onClick={() => {
                  setSelectedPage(item.id)
                  setCurrentPage(item.id)
                }}
              >
                {item.name}
              </NoraListItem>
            ))}
          </div>
          <button
            type="button"
            onClick={addPage}
            className="mt-0.5 flex h-[var(--nora-row-h,30px)] items-center gap-1.5 rounded-[var(--nora-radius-md,8px)] px-2 text-xs font-medium text-[var(--nora-text-secondary)] transition-colors hover:bg-[var(--nora-row-hover)] hover:text-[var(--nora-text)]"
          >
            <PlusIcon className="size-3.5" />
            New Page
          </button>
        </>
      ) : null}

      {tab === "Layers" ? (
        <div className="mt-1.5 flex flex-col gap-px">
          {visibleLayers.map((layer) => (
            <NoraListItem
              key={layer.id}
              icon={layer.icon}
              depth={layer.depth}
              component={layer.component}
              selected={selectedLayer === layer.id}
              chevron={
                layer.folder
                  ? expanded[layer.id]
                    ? "open"
                    : "closed"
                  : undefined
              }
              onChevronClick={
                layer.folder
                  ? () =>
                      setExpanded((prev) => ({
                        ...prev,
                        [layer.id]: !prev[layer.id],
                      }))
                  : undefined
              }
              onClick={() => {
                setSelectedLayer(layer.id)
                if (layer.folder) {
                  setExpanded((prev) => ({ ...prev, [layer.id]: true }))
                }
              }}
            >
              {layer.name}
            </NoraListItem>
          ))}
        </div>
      ) : null}

      {tab === "Assets" ? (
        <div className="mt-1.5 flex flex-col gap-1">
          {(["Components", "Text Styles", "Color Styles"] as const).map(
            (section) => (
              <div key={section} className="flex flex-col gap-px">
                <div className="flex h-[var(--nora-row-h,30px)] items-center px-2 text-[11px] font-semibold text-[var(--nora-text-tertiary)]">
                  {section}
                </div>
                {assets
                  .filter((a) => a.section === section)
                  .map((a) => (
                    <NoraListItem
                      key={a.id}
                      icon={a.icon}
                      component={a.component}
                      selected={selectedAsset === a.id}
                      onClick={() => setSelectedAsset(a.id)}
                    >
                      {a.name}
                    </NoraListItem>
                  ))}
              </div>
            )
          )}
        </div>
      ) : null}
    </NoraPanel>
  )
}

function NoraSectionTitle({
  children,
  action,
}: {
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex h-6 items-center justify-between px-0.5 font-[family-name:var(--nora-font)] text-xs font-semibold text-[var(--nora-text)]">
      {children}
      {action}
    </div>
  )
}

function NoraPropertiesPanel() {
  const [width, setWidth] = React.useState(1200)
  const [height, setHeight] = React.useState(640)
  const [gap, setGap] = React.useState(20)
  const [radius, setRadius] = React.useState(12)

  function updateRadius(next: number) {
    setRadius(Math.min(48, Math.max(0, Math.round(next))))
  }

  return (
    <NoraPanel width={260} className="flex flex-col gap-2.5 font-[family-name:var(--nora-font)]">
      <div className="flex h-[var(--nora-row-h,30px)] items-center gap-2 border-b border-[var(--nora-divider)] px-0.5 pb-2.5">
        <span className="inline-flex size-5 items-center justify-center rounded-[var(--nora-radius-sm,6px)] bg-[var(--nora-input-bg)] text-[var(--nora-text-secondary)]">
          <FrameIcon className="size-3" />
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--nora-text)]">
          Hero
        </span>
        <NoraIconBtn className="size-5" aria-label="Visibility">
          <EyeIcon className="size-3" />
        </NoraIconBtn>
      </div>

      <div className="flex flex-col gap-1.5">
        <NoraSectionTitle
          action={
            <NoraIconBtn className="size-5">
              <PlusIcon className="size-3" />
            </NoraIconBtn>
          }
        >
          Layout
        </NoraSectionTitle>
        <PropertyRow label="Position">
          <NoraSelect
            defaultValue="relative"
            items={[
              { value: "relative", label: "Relative" },
              { value: "absolute", label: "Absolute" },
              { value: "fixed", label: "Fixed" },
              { value: "sticky", label: "Sticky" },
            ]}
          />
        </PropertyRow>
        <PropertyRow label="Size">
          <div className="flex w-full gap-1">
            <NumberStepper value={width} onValueChange={setWidth} min={0} />
            <NumberStepper value={height} onValueChange={setHeight} min={0} />
          </div>
        </PropertyRow>
        <PropertyRow label="Direction">
          <SegmentedControl
            defaultValue="h"
            options={[
              { value: "h", label: "→" },
              { value: "v", label: "↓" },
              { value: "w", label: "⇄" },
            ]}
          />
        </PropertyRow>
        <PropertyRow label="Gap">
          <NumberStepper value={gap} onValueChange={setGap} min={0} />
        </PropertyRow>
      </div>

      <Separator className="bg-[var(--nora-divider)]" />

      <div className="flex flex-col gap-1.5">
        <NoraSectionTitle>Fill</NoraSectionTitle>
        <PropertyRow label="Color">
          <ColorWell defaultValue="#111111" />
        </PropertyRow>
      </div>

      <Separator className="bg-[var(--nora-divider)]" />

      <div className="flex flex-col gap-1.5">
        <NoraSectionTitle>Effects</NoraSectionTitle>
        <PropertyRow label="Shadow">
          <div className="flex w-full justify-end pr-0.5">
            <Switch defaultChecked />
          </div>
        </PropertyRow>
        <PropertyRow label="Radius">
          <div className="flex w-full items-center gap-2">
            <Slider
              value={radius}
              onValueChange={(v) =>
                updateRadius(Array.isArray(v) ? (v[0] ?? 0) : v)
              }
              min={0}
              max={48}
              step={1}
              className="min-w-0 flex-1"
            />
            <NumberStepper
              value={radius}
              onValueChange={updateRadius}
              min={0}
              max={48}
              className="w-[52px] shrink-0"
            />
          </div>
        </PropertyRow>
      </div>
    </NoraPanel>
  )
}

function NoraContextMenu() {
  const [active, setActive] = React.useState<string | null>("duplicate")
  const [locked, setLocked] = React.useState(false)
  const [submenu, setSubmenu] = React.useState<"arrange" | null>(null)

  function select(id: string) {
    setActive(id)
    if (id !== "front" && id !== "back") setSubmenu(null)
  }

  return (
    <div className="relative" onMouseLeave={() => setSubmenu(null)}>
      <NoraMenu width={228}>
        <NoraMenuItem
          icon={CopyIcon}
          active={active === "copy"}
          shortcut={
            <>
              <NoraKbd>⌘</NoraKbd>
              <NoraKbd>C</NoraKbd>
            </>
          }
          onClick={() => select("copy")}
          onMouseEnter={() => setSubmenu(null)}
        >
          Copy
        </NoraMenuItem>
        <NoraMenuItem
          icon={ClipboardPasteIcon}
          active={active === "paste"}
          shortcut={
            <>
              <NoraKbd>⌘</NoraKbd>
              <NoraKbd>V</NoraKbd>
            </>
          }
          onClick={() => select("paste")}
          onMouseEnter={() => setSubmenu(null)}
        >
          Paste
        </NoraMenuItem>
        <NoraMenuItem
          icon={CopyPlusIcon}
          active={active === "duplicate"}
          shortcut={
            <>
              <NoraKbd>⌘</NoraKbd>
              <NoraKbd>D</NoraKbd>
            </>
          }
          onClick={() => select("duplicate")}
          onMouseEnter={() => setSubmenu(null)}
        >
          Duplicate
        </NoraMenuItem>
        <NoraMenuItem
          icon={ScissorsIcon}
          active={active === "cut"}
          shortcut={
            <>
              <NoraKbd>⌘</NoraKbd>
              <NoraKbd>X</NoraKbd>
            </>
          }
          onClick={() => select("cut")}
          onMouseEnter={() => setSubmenu(null)}
        >
          Cut
        </NoraMenuItem>

        <NoraMenuDivider />

        <NoraMenuItem
          icon={PaintbrushIcon}
          active={active === "copy-style"}
          shortcut={
            <>
              <NoraKbd>⌥</NoraKbd>
              <NoraKbd>⌘</NoraKbd>
              <NoraKbd>C</NoraKbd>
            </>
          }
          onClick={() => select("copy-style")}
          onMouseEnter={() => setSubmenu(null)}
        >
          Copy Style
        </NoraMenuItem>
        <NoraMenuItem
          icon={PaintbrushIcon}
          disabled
          shortcut={
            <>
              <NoraKbd>⌥</NoraKbd>
              <NoraKbd>⌘</NoraKbd>
              <NoraKbd>V</NoraKbd>
            </>
          }
          onMouseEnter={() => setSubmenu(null)}
        >
          Paste Style
        </NoraMenuItem>

        <NoraMenuDivider />

        <NoraMenuItem
          icon={ComponentIcon}
          active={active === "component"}
          shortcut={
            <>
              <NoraKbd>⌥</NoraKbd>
              <NoraKbd>⌘</NoraKbd>
              <NoraKbd>K</NoraKbd>
            </>
          }
          onClick={() => select("component")}
          onMouseEnter={() => setSubmenu(null)}
        >
          Create Component
        </NoraMenuItem>
        <NoraMenuItem
          icon={LayersIcon}
          active={active === "stack"}
          onClick={() => select("stack")}
          onMouseEnter={() => setSubmenu(null)}
        >
          Wrap in Stack
        </NoraMenuItem>

        <NoraMenuDivider />

        <NoraMenuSub
          label="Arrange"
          icon={BringToFrontIcon}
          open={submenu === "arrange"}
          onOpen={() => setSubmenu("arrange")}
        >
          <NoraMenuItem
            icon={BringToFrontIcon}
            active={active === "front"}
            shortcut={
              <>
                <NoraKbd>⌥</NoraKbd>
                <NoraKbd>⌘</NoraKbd>
                <NoraKbd>]</NoraKbd>
              </>
            }
            onClick={() => select("front")}
          >
            Bring to Front
          </NoraMenuItem>
          <NoraMenuItem
            icon={SendToBackIcon}
            active={active === "back"}
            shortcut={
              <>
                <NoraKbd>⌥</NoraKbd>
                <NoraKbd>⌘</NoraKbd>
                <NoraKbd>[</NoraKbd>
              </>
            }
            onClick={() => select("back")}
          >
            Send to Back
          </NoraMenuItem>
        </NoraMenuSub>

        <NoraMenuItem
          icon={PencilIcon}
          active={active === "rename"}
          shortcut={<NoraKbd>↩</NoraKbd>}
          onClick={() => select("rename")}
          onMouseEnter={() => setSubmenu(null)}
        >
          Rename
        </NoraMenuItem>
        <NoraMenuItem
          icon={LockIcon}
          checked={locked}
          shortcut={
            <>
              <NoraKbd>⇧</NoraKbd>
              <NoraKbd>⌘</NoraKbd>
              <NoraKbd>L</NoraKbd>
            </>
          }
          onClick={() => {
            setLocked((v) => !v)
            setActive("lock")
            setSubmenu(null)
          }}
          onMouseEnter={() => setSubmenu(null)}
        >
          Locked
        </NoraMenuItem>

        <NoraMenuDivider />

        <NoraMenuItem
          icon={Trash2Icon}
          danger
          shortcut={<NoraKbd>⌫</NoraKbd>}
          onClick={() => select("delete")}
          onMouseEnter={() => setSubmenu(null)}
        >
          Delete
        </NoraMenuItem>
      </NoraMenu>
    </div>
  )
}

function NoraPublishModal() {
  const [tab, setTab] = React.useState("Production")
  const [progress, setProgress] = React.useState(80)
  const [publishing, setPublishing] = React.useState(true)

  React.useEffect(() => {
    if (!publishing) return
    const id = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          window.clearInterval(id)
          setPublishing(false)
          return 100
        }
        return Math.min(100, p + 4)
      })
    }, 320)
    return () => window.clearInterval(id)
  }, [publishing])

  const step = Math.min(10, Math.max(1, Math.ceil(progress / 10)))
  const domain =
    tab === "Staging"
      ? "truepoints-staging.Nora.app"
      : "truepoints.Nora.website"

  function startPublish() {
    setProgress(6)
    setPublishing(true)
  }

  return (
    <div className="w-[360px] overflow-hidden rounded-[var(--nora-radius-lg,10px)] bg-[var(--nora-modal)] font-[family-name:var(--nora-font)] text-[var(--nora-text)] shadow-[var(--nora-shadow-modal)]">
      <div className="flex h-11 items-center justify-between border-b border-[var(--nora-divider)] px-3.5">
        <span className="text-sm font-semibold tracking-tight">Publish</span>
        <NoraIconBtn className="size-6" aria-label="Close">
          <XIcon className="size-3.5" />
        </NoraIconBtn>
      </div>

      <div className="flex flex-col gap-3 p-3.5">
        <NoraPillTabs
          tabs={["Staging", "Production"]}
          active={tab}
          onChange={setTab}
        />

        <div className="flex items-center gap-2.5 rounded-[var(--nora-radius-md,8px)] bg-[var(--nora-surface)] p-2.5">
          <Avatar className="size-9 rounded-[var(--nora-radius-md,8px)]">
            <AvatarFallback className="rounded-[var(--nora-radius-md,8px)] bg-gradient-to-br from-[var(--nora-avatar-gradient-from)] to-[var(--nora-avatar-gradient-to)] text-[11px] font-semibold text-white">
              TP
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-semibold">{domain}</span>
              <button
                type="button"
                aria-label="Open site"
                className="inline-flex size-5 shrink-0 items-center justify-center rounded-[var(--nora-radius-sm,6px)] text-[var(--nora-text-tertiary)] transition-colors hover:bg-[var(--nora-row-hover)] hover:text-[var(--nora-text)]"
              >
                <ExternalLinkIcon className="size-3" />
              </button>
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--nora-text-tertiary)]">
              {tab === "Staging"
                ? "Last staged 12 minutes ago"
                : "Last published 2 hours ago"}
            </div>
          </div>
          <NoraBadge variant={tab === "Production" ? "green" : "blue"}>
            {tab === "Production" ? "Live" : "Staging"}
          </NoraBadge>
        </div>

        {publishing ? (
          <div className="flex flex-col gap-1.5">
            <Progress value={progress} className="w-full" />
            <div className="text-[11px] text-[var(--nora-text-tertiary)]">
              Optimizing images… {step} of 10
            </div>
          </div>
        ) : (
          <div className="rounded-[var(--nora-radius-md,8px)] bg-[var(--nora-input-bg)] px-2.5 py-2 text-[11px] text-[var(--nora-text-secondary)]">
            {progress >= 100
              ? "Published successfully — site is up to date."
              : tab === "Production"
                ? "Production is up to date with the latest version."
                : "Staging is ready — deploy to Production when you’re happy."}
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t border-[var(--nora-divider)] p-3">
        <Button
          variant="secondary"
          size="default"
          className="h-[var(--nora-row-h,30px)] px-3"
        >
          Add Domain
        </Button>
        <Button
          size="default"
          className="h-[var(--nora-row-h,30px)] flex-1 px-3"
          disabled={publishing}
          onClick={startPublish}
        >
          {publishing ? "Publishing…" : tab === "Staging" ? "Update Staging" : "Update"}
        </Button>
      </div>
    </div>
  )
}

function NoraAiChat() {
  const [draft, setDraft] = React.useState("")
  const canSend = draft.trim().length > 0

  return (
    <div className="flex w-[300px] flex-col overflow-hidden rounded-[14px] bg-[var(--nora-panel)] shadow-[0_0_0_1px_var(--nora-border)]">
      <div className="flex items-center justify-between border-b border-[var(--nora-divider)] px-3.5 py-3">
        <span className="text-xs font-semibold">New Chat</span>
        <NoraBadge variant="purple">AI</NoraBadge>
      </div>
      <div className="flex flex-col gap-2.5 p-3.5">
        <div className="ml-auto max-w-[85%] rounded-xl rounded-br-sm bg-[var(--nora-tint)] px-3 py-2 text-xs font-medium text-white">
          Сделай hero-блок с заголовком и CTA
        </div>
        <div className="mr-auto max-w-[85%] rounded-xl rounded-bl-sm bg-[var(--nora-surface)] px-3 py-2 text-xs">
          Готово — добавил секцию Hero с заголовком, подзаголовком и кнопкой. Хотите тёмный
          вариант?
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-[var(--nora-divider)] p-2.5">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask Nora AI…"
          className={cn(
            "min-h-11 resize-none rounded-lg bg-[var(--nora-input-bg)] px-2.5 py-2 text-xs text-[var(--nora-input-text)] outline-none transition-[box-shadow] duration-[var(--nora-duration,0.15s)] placeholder:text-[var(--nora-input-placeholder)]",
            "focus:shadow-[var(--nora-shadow-focus)]"
          )}
        />
        <div className="flex items-center justify-between">
          <NoraSelect
            className="w-[120px]"
            defaultValue="fast"
            items={[
              { value: "fast", label: "Fast" },
              { value: "quality", label: "Quality" },
            ]}
          />
          <Button
            size="icon-sm"
            className={cn(
              "size-[26px] rounded-full transition-opacity",
              !canSend && "opacity-40"
            )}
            disabled={!canSend}
            aria-label="Send"
          >
            <ArrowUpIcon className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function NoraDashboardSidebar() {
  const [active, setActive] = React.useState("All Projects")
  const [query, setQuery] = React.useState("")
  const items = [
    { name: "All Projects", icon: HomeIcon, count: "8" },
    { name: "Marketing", icon: LayersIcon, count: "3" },
    { name: "Product", icon: LayersIcon, count: "5" },
    { name: "Trash", icon: Trash2Icon },
  ]
  const visible = items.filter((item) =>
    item.name.toLowerCase().includes(query.trim().toLowerCase())
  )

  return (
    <NoraPanel
      width={240}
      className="flex flex-col gap-2.5 font-[family-name:var(--nora-font)]"
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-[var(--nora-radius-md,8px)] p-1 text-left transition-colors hover:bg-[var(--nora-row-hover)]"
      >
        <Avatar className="size-8 rounded-[var(--nora-radius-md,8px)]">
          <AvatarFallback className="rounded-[var(--nora-radius-md,8px)] bg-gradient-to-br from-[var(--nora-avatar-gradient-from)] to-[var(--nora-avatar-gradient-to)] text-[10px] font-semibold text-white">
            TP
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-[var(--nora-text)]">
            True Points
          </div>
          <div className="text-[10px] text-[var(--nora-text-tertiary)]">
            Pro Plan
          </div>
        </div>
        <ChevronDownIcon className="size-3.5 shrink-0 text-[var(--nora-text-tertiary)]" />
      </button>

      <NoraSearch
        placeholder="Search…"
        value={query}
        onChange={setQuery}
      />

      <div className="flex flex-col gap-px">
        {visible.length === 0 ? (
          <div className="px-2 py-3 text-[11px] text-[var(--nora-text-tertiary)]">
            No results
          </div>
        ) : (
          visible.map((item) => (
            <NoraListItem
              key={item.name}
              icon={item.icon}
              count={item.count}
              active={active === item.name}
              onClick={() => setActive(item.name)}
            >
              {item.name}
            </NoraListItem>
          ))
        )}
      </div>

      <Separator className="bg-[var(--nora-divider)]" />

      <div className="flex flex-col gap-px">
        <NoraListItem icon={SettingsIcon}>Settings</NoraListItem>
        <button
          type="button"
          className="flex h-[var(--nora-row-h,30px)] w-full items-center gap-2 rounded-[var(--nora-radius-md,8px)] px-2 text-left text-xs font-medium text-[var(--nora-tint)] transition-colors hover:bg-[var(--nora-tint-dimmed)]"
        >
          <span className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-full bg-[var(--nora-tint)] text-white">
            <ArrowUpIcon className="size-2.5" />
          </span>
          Upgrade
        </button>
      </div>
    </NoraPanel>
  )
}

function NoraAuthCard() {
  return (
    <div className="flex w-[300px] flex-col items-stretch gap-3.5 rounded-2xl bg-[var(--nora-modal)] p-6 shadow-[var(--nora-shadow-modal)]">
      <div className="mb-1 flex justify-center">
        <NoraLogo className="size-5 text-[var(--nora-text)]" />
      </div>
      <div className="text-center text-[15px] font-semibold">Welcome to Nora</div>
      <div className="-mt-2 text-center text-xs leading-relaxed text-[var(--nora-text-tertiary)]">
        Log in or create an account
      </div>
      <Button variant="secondary" className="h-9 w-full text-xs">
        Continue with Google
      </Button>
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--nora-text-tertiary)]">
        <div className="h-px flex-1 bg-[var(--nora-divider)]" />
        or
        <div className="h-px flex-1 bg-[var(--nora-divider)]" />
      </div>
      <Input
        placeholder="name@company.com"
        className="h-[var(--nora-row-h)] bg-[var(--nora-input-bg)] text-xs"
      />
      <Button className="h-9 w-full text-xs">Continue with Email</Button>
    </div>
  )
}

function NoraToastStack() {
  const toasts: {
    msg: string
    action?: string
    variant?: "default" | "success" | "error"
  }[] = [
    { msg: "Site published", action: "Open", variant: "success" },
    { msg: "Component «Navbar» updated" },
    { msg: "Connection lost", action: "Retry", variant: "error" },
  ]

  return (
    <div className="grid w-full place-items-center">
      {/* Стек как внизу редактора Nora: одна колонка, выровненные капсулы */}
      <div className="flex w-[min(100%,280px)] flex-col items-stretch gap-2">
        {toasts.map((t) => (
          <NoraToast
            key={t.msg}
            variant={t.variant}
            className="w-full justify-between"
            action={
              t.action ? (
                <NoraButton size="sm">{t.action}</NoraButton>
              ) : undefined
            }
          >
            <span className="min-w-0 flex-1 truncate">{t.msg}</span>
          </NoraToast>
        ))}
      </div>
    </div>
  )
}

/** Nora-like insert glyphs (toolbar / Insert panel). */
function InsertGlyph({
  kind,
  className,
}: {
  kind: "frame" | "stack" | "grid" | "scroll" | "text" | "image" | "video" | "input" | "button" | "icon" | "section" | "nav"
  className?: string
}) {
  const stroke = "currentColor"
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-5", className)}
      aria-hidden
    >
      {kind === "frame" ? (
        <rect
          x="4.5"
          y="4.5"
          width="15"
          height="15"
          rx="2.5"
          stroke={stroke}
          strokeWidth="1.5"
        />
      ) : null}
      {kind === "stack" ? (
        <>
          <rect x="5" y="5" width="14" height="4" rx="1.2" stroke={stroke} strokeWidth="1.5" />
          <rect x="5" y="10" width="14" height="4" rx="1.2" stroke={stroke} strokeWidth="1.5" />
          <rect x="5" y="15" width="14" height="4" rx="1.2" stroke={stroke} strokeWidth="1.5" />
        </>
      ) : null}
      {kind === "grid" ? (
        <>
          <rect x="4.5" y="4.5" width="6.5" height="6.5" rx="1.2" stroke={stroke} strokeWidth="1.5" />
          <rect x="13" y="4.5" width="6.5" height="6.5" rx="1.2" stroke={stroke} strokeWidth="1.5" />
          <rect x="4.5" y="13" width="6.5" height="6.5" rx="1.2" stroke={stroke} strokeWidth="1.5" />
          <rect x="13" y="13" width="6.5" height="6.5" rx="1.2" stroke={stroke} strokeWidth="1.5" />
        </>
      ) : null}
      {kind === "scroll" ? (
        <>
          <rect
            x="5.5"
            y="3.5"
            width="13"
            height="17"
            rx="2.5"
            stroke={stroke}
            strokeWidth="1.5"
          />
          <path
            d="M15.5 8.5v7"
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="15.5" cy="11" r="1.1" fill={stroke} />
        </>
      ) : null}
      {kind === "text" ? (
        <path
          d="M7 7h10M12 7v10M9.5 17h5"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ) : null}
      {kind === "image" ? (
        <>
          <rect
            x="4.5"
            y="5.5"
            width="15"
            height="13"
            rx="2"
            stroke={stroke}
            strokeWidth="1.5"
          />
          <circle cx="9" cy="10" r="1.4" fill={stroke} />
          <path
            d="M5.5 15.5 9.5 12l3 2.5 2.5-2 3.5 3"
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : null}
      {kind === "video" ? (
        <>
          <rect
            x="3.5"
            y="6"
            width="13"
            height="12"
            rx="2"
            stroke={stroke}
            strokeWidth="1.5"
          />
          <path
            d="M16.5 10.2 20.5 8v8l-4-2.2"
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </>
      ) : null}
      {kind === "input" ? (
        <>
          <rect
            x="3.5"
            y="8"
            width="17"
            height="8"
            rx="2"
            stroke={stroke}
            strokeWidth="1.5"
          />
          <path d="M7 12h4" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : null}
      {kind === "button" ? (
        <rect
          x="4"
          y="8"
          width="16"
          height="8"
          rx="4"
          stroke={stroke}
          strokeWidth="1.5"
        />
      ) : null}
      {kind === "icon" ? (
        <>
          <circle cx="12" cy="12" r="7.25" stroke={stroke} strokeWidth="1.5" />
          <path
            d="M12 8.5v4.2l2.4 1.4"
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      ) : null}
      {kind === "section" ? (
        <>
          <rect
            x="3.5"
            y="4.5"
            width="17"
            height="15"
            rx="2"
            stroke={stroke}
            strokeWidth="1.5"
          />
          <path
            d="M6.5 8h11M6.5 11.5h7M6.5 15h9"
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      ) : null}
      {kind === "nav" ? (
        <>
          <rect
            x="3.5"
            y="7"
            width="17"
            height="10"
            rx="2"
            stroke={stroke}
            strokeWidth="1.5"
          />
          <circle cx="7.2" cy="12" r="1.1" fill={stroke} />
          <path
            d="M11 12h7"
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      ) : null}
    </svg>
  )
}

type InsertItem = {
  id: string
  label: string
  glyph: React.ComponentProps<typeof InsertGlyph>["kind"]
  shortcut?: string
  /** Mini wireframe preview for Sections / Navigation */
  preview?: "hero" | "features" | "footer" | "navbar" | "menu"
}

const INSERT_CATEGORIES: { id: string; label: string; items: InsertItem[] }[] = [
  {
    id: "sections",
    label: "Sections",
    items: [
      { id: "hero", label: "Hero", glyph: "section", preview: "hero" },
      { id: "features", label: "Features", glyph: "section", preview: "features" },
      { id: "footer", label: "Footer", glyph: "section", preview: "footer" },
      { id: "cta", label: "Call to Action", glyph: "section", preview: "hero" },
    ],
  },
  {
    id: "navigation",
    label: "Navigation",
    items: [
      { id: "navbar", label: "Navbar", glyph: "nav", preview: "navbar" },
      { id: "menu", label: "Menu", glyph: "nav", preview: "menu" },
      { id: "tabs", label: "Tabs", glyph: "nav" },
      { id: "breadcrumb", label: "Breadcrumb", glyph: "nav" },
    ],
  },
  {
    id: "layout",
    label: "Layout",
    items: [
      { id: "frame", label: "Frame", glyph: "frame", shortcut: "F" },
      { id: "stack", label: "Stack", glyph: "stack", shortcut: "S" },
      { id: "grid", label: "Grid", glyph: "grid" },
      { id: "scroll", label: "Scroll", glyph: "scroll" },
    ],
  },
  {
    id: "text",
    label: "Text",
    items: [
      { id: "heading", label: "Heading", glyph: "text", shortcut: "T" },
      { id: "paragraph", label: "Paragraph", glyph: "text" },
      { id: "list", label: "List", glyph: "stack" },
      { id: "link", label: "Link", glyph: "text" },
    ],
  },
  {
    id: "media",
    label: "Media",
    items: [
      { id: "image", label: "Image", glyph: "image", shortcut: "I" },
      { id: "video", label: "Video", glyph: "video" },
      { id: "gif", label: "GIF", glyph: "image" },
      { id: "audio", label: "Audio", glyph: "button" },
    ],
  },
  {
    id: "forms",
    label: "Forms",
    items: [
      { id: "input", label: "Input", glyph: "input" },
      { id: "textarea", label: "Text Area", glyph: "input" },
      { id: "select", label: "Select", glyph: "button" },
      { id: "submit", label: "Submit Button", glyph: "button" },
    ],
  },
  {
    id: "icons",
    label: "Icons",
    items: [
      { id: "phosphor", label: "Phosphor", glyph: "icon" },
      { id: "lucide", label: "Lucide", glyph: "icon" },
      { id: "feather", label: "Feather", glyph: "icon" },
      { id: "custom", label: "Custom SVG", glyph: "icon" },
    ],
  },
  {
    id: "interactive",
    label: "Interactive",
    items: [
      { id: "button", label: "Button", glyph: "button" },
      { id: "toggle", label: "Toggle", glyph: "button" },
      { id: "slider", label: "Slider", glyph: "input" },
      { id: "tooltip", label: "Tooltip", glyph: "icon" },
    ],
  },
]

function InsertPreviewSketch({
  kind,
}: {
  kind: NonNullable<InsertItem["preview"]>
}) {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-1 px-2.5 py-2">
      {kind === "hero" ? (
        <>
          <div className="mx-auto h-1 w-8 rounded-full bg-[var(--nora-text-tertiary)]/35" />
          <div className="mx-auto h-1.5 w-14 rounded-full bg-[var(--nora-text-tertiary)]/55" />
          <div className="mx-auto h-1 w-10 rounded-full bg-[var(--nora-text-tertiary)]/30" />
          <div className="mx-auto mt-0.5 flex gap-1">
            <div className="h-2 w-6 rounded-[3px] bg-[var(--nora-tint)]/70" />
            <div className="h-2 w-6 rounded-[3px] bg-[var(--nora-text-tertiary)]/25" />
          </div>
        </>
      ) : null}
      {kind === "features" ? (
        <div className="grid grid-cols-3 gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-0.5 rounded-[3px] bg-[var(--nora-text-tertiary)]/10 p-1"
            >
              <div className="h-2 w-full rounded-[2px] bg-[var(--nora-text-tertiary)]/30" />
              <div className="h-0.5 w-3/4 rounded-full bg-[var(--nora-text-tertiary)]/40" />
              <div className="h-0.5 w-full rounded-full bg-[var(--nora-text-tertiary)]/25" />
            </div>
          ))}
        </div>
      ) : null}
      {kind === "footer" ? (
        <>
          <div className="grid grid-cols-4 gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-0.5">
                <div className="h-0.5 w-full rounded-full bg-[var(--nora-text-tertiary)]/45" />
                <div className="h-0.5 w-4/5 rounded-full bg-[var(--nora-text-tertiary)]/25" />
                <div className="h-0.5 w-3/5 rounded-full bg-[var(--nora-text-tertiary)]/20" />
              </div>
            ))}
          </div>
          <div className="mt-1 h-px bg-[var(--nora-text-tertiary)]/15" />
          <div className="h-0.5 w-8 rounded-full bg-[var(--nora-text-tertiary)]/35" />
        </>
      ) : null}
      {kind === "navbar" ? (
        <div className="flex items-center gap-1.5 rounded-[4px] bg-[var(--nora-text-tertiary)]/10 px-1.5 py-1.5">
          <div className="size-2 rounded-[2px] bg-[var(--nora-text-tertiary)]/50" />
          <div className="h-0.5 flex-1 rounded-full bg-[var(--nora-text-tertiary)]/25" />
          <div className="h-2 w-5 rounded-[3px] bg-[var(--nora-tint)]/65" />
        </div>
      ) : null}
      {kind === "menu" ? (
        <div className="mx-auto w-[70%] space-y-1 rounded-[4px] bg-[var(--nora-text-tertiary)]/10 p-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-[2px]",
                i === 0
                  ? "bg-[var(--nora-tint)]/55"
                  : "bg-[var(--nora-text-tertiary)]/30"
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function NoraInsertPanel() {
  const [categoryId, setCategoryId] = React.useState("layout")
  const [selectedId, setSelectedId] = React.useState("frame")
  const [query, setQuery] = React.useState("")

  const category =
    INSERT_CATEGORIES.find((c) => c.id === categoryId) ?? INSERT_CATEGORIES[2]

  const items = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return category.items
    return INSERT_CATEGORIES.flatMap((c) => c.items).filter((item) =>
      item.label.toLowerCase().includes(q)
    )
  }, [category, query])

  return (
    <div className="flex h-[320px] w-[460px] flex-col overflow-hidden rounded-[var(--nora-radius-xl)] bg-[var(--nora-popover)] shadow-[var(--nora-shadow-popover)]">
      <div className="shrink-0 px-2.5 pt-2.5">
        <NoraSearch
          placeholder="Search…"
          value={query}
          onChange={(v) => {
            setQuery(v)
            if (v.trim()) setSelectedId("")
          }}
        />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[128px_1fr] gap-0 p-2">
        <div className="min-h-0 space-y-0.5 overflow-y-auto border-r border-[var(--nora-divider)] pr-1.5">
          {INSERT_CATEGORIES.map((cat) => (
            <NoraListItem
              key={cat.id}
              active={!query && cat.id === categoryId}
              onClick={() => {
                setQuery("")
                setCategoryId(cat.id)
                setSelectedId(cat.items[0]?.id ?? "")
              }}
            >
              {cat.label}
            </NoraListItem>
          ))}
        </div>
        <div className="min-h-0 overflow-y-auto pl-2">
          <div className="grid grid-cols-2 content-start gap-1.5">
            {items.map((item) => {
              const selected = item.id === selectedId
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    "group flex flex-col overflow-hidden rounded-[10px] text-left transition-[background-color,box-shadow,color] duration-[var(--nora-duration)]",
                    selected
                      ? "bg-[var(--nora-tint-dimmed)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--nora-tint)_45%,transparent)]"
                      : "bg-[var(--nora-surface)] hover:bg-[var(--nora-row-hover)]"
                  )}
                >
                  <div
                    className={cn(
                      "relative flex h-[72px] items-center justify-center",
                      selected
                        ? "text-[var(--nora-tint)]"
                        : "text-[var(--nora-text-tertiary)] group-hover:text-[var(--nora-text-secondary)]"
                    )}
                  >
                    {item.preview ? (
                      <InsertPreviewSketch kind={item.preview} />
                    ) : (
                      <InsertGlyph kind={item.glyph} />
                    )}
                    {item.shortcut ? (
                      <span
                        className={cn(
                          "absolute right-1.5 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-[4px] px-1 text-[9px] font-semibold",
                          selected
                            ? "bg-[color-mix(in_srgb,var(--nora-tint)_18%,transparent)] text-[var(--nora-tint)]"
                            : "bg-[var(--nora-panel)] text-[var(--nora-text-tertiary)]"
                        )}
                      >
                        {item.shortcut}
                      </span>
                    ) : null}
                  </div>
                  <div
                    className={cn(
                      "flex h-7 items-center justify-center border-t px-1.5 text-[11px] font-medium",
                      selected
                        ? "border-[color-mix(in_srgb,var(--nora-tint)_22%,transparent)] text-[var(--nora-tint)]"
                        : "border-[var(--nora-divider)] text-[var(--nora-text-secondary)]"
                    )}
                  >
                    <span className="truncate">{item.label}</span>
                  </div>
                </button>
              )
            })}
          </div>
          {items.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-[var(--nora-text-tertiary)]">
              No results
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function NoraMainMenu() {
  const modes = ["Canvas", "CMS", "Localization", "Analytics", "Settings"]
  const [mode, setMode] = React.useState("Canvas")
  const [submenu, setSubmenu] = React.useState<string | null>(null)

  const chevron = (
    <ChevronRightIcon className="size-3.5 opacity-70" aria-hidden />
  )

  const fileGroups: { label: string; shortcut?: React.ReactNode }[][] = [
    [
      {
        label: "New…",
        shortcut: (
          <>
            <NoraKbd>⌥</NoraKbd>
            <NoraKbd>⌘</NoraKbd>
            <NoraKbd>N</NoraKbd>
          </>
        ),
      },
      { label: "New Page" },
      { label: "New Page Folder" },
    ],
    [
      {
        label: "Import from Figma…",
        shortcut: (
          <>
            <NoraKbd>⇧</NoraKbd>
            <NoraKbd>⌘</NoraKbd>
            <NoraKbd>I</NoraKbd>
          </>
        ),
      },
      {
        label: "Upload Image…",
        shortcut: (
          <>
            <NoraKbd>⌥</NoraKbd>
            <NoraKbd>⌘</NoraKbd>
            <NoraKbd>I</NoraKbd>
          </>
        ),
      },
      { label: "Upload Video…" },
    ],
    [
      {
        label: "Publish Site",
        shortcut: (
          <>
            <NoraKbd>⇧</NoraKbd>
            <NoraKbd>⌘</NoraKbd>
            <NoraKbd>P</NoraKbd>
          </>
        ),
      },
      {
        label: "Open Site",
        shortcut: (
          <>
            <NoraKbd>⇧</NoraKbd>
            <NoraKbd>⌘</NoraKbd>
            <NoraKbd>O</NoraKbd>
          </>
        ),
      },
    ],
    [
      { label: "Duplicate" },
      { label: "Archive" },
      { label: "Transfer Project…" },
    ],
    [
      { label: "Copy Remix Link" },
      { label: "Invite Collaborators…" },
      {
        label: "Version History",
        shortcut: (
          <>
            <NoraKbd>⇧</NoraKbd>
            <NoraKbd>⌘</NoraKbd>
            <NoraKbd>H</NoraKbd>
          </>
        ),
      },
    ],
  ]

  return (
    <div
      className="relative flex min-h-[420px] w-full items-center justify-center"
      onMouseLeave={() => setSubmenu(null)}
    >
      <NoraMenu width={240}>
        {modes.map((m, i) => (
          <NoraMenuItem
            key={m}
            selected={mode === m}
            shortcut={
              <>
                <NoraKbd>⌥</NoraKbd>
                <NoraKbd>{i + 1}</NoraKbd>
              </>
            }
            onClick={() => {
              setMode(m)
              setSubmenu(null)
            }}
            onMouseEnter={() => setSubmenu(null)}
          >
            {m}
          </NoraMenuItem>
        ))}
        <NoraMenuDivider />
        <NoraMenuItem onMouseEnter={() => setSubmenu(null)}>
          Go to Dashboard
        </NoraMenuItem>
        <NoraMenuItem
          shortcut={
            <>
              <NoraKbd>⌘</NoraKbd>
              <NoraKbd>K</NoraKbd>
            </>
          }
          onMouseEnter={() => setSubmenu(null)}
        >
          Quick Actions
        </NoraMenuItem>
        <NoraMenuDivider />
        <NoraMenuSub
          label="File"
          width={260}
          open={submenu === "File"}
          onOpen={() => setSubmenu("File")}
        >
          {fileGroups.map((group, gi) => (
            <React.Fragment key={gi}>
              {gi > 0 ? <NoraMenuDivider /> : null}
              {group.map((item) => (
                <NoraMenuItem key={item.label} shortcut={item.shortcut}>
                  {item.label}
                </NoraMenuItem>
              ))}
            </React.Fragment>
          ))}
        </NoraMenuSub>
        {["Edit", "View", "Tool", "Layout", "Text", "Vector", "Component"].map(
          (s) => (
            <NoraMenuItem
              key={s}
              hint={chevron}
              active={submenu === s}
              onMouseEnter={() => setSubmenu(s)}
            >
              {s}
            </NoraMenuItem>
          )
        )}
        <NoraMenuDivider />
        {["Preferences", "Help", "Your Account"].map((s) => (
          <NoraMenuItem
            key={s}
            hint={chevron}
            active={submenu === s}
            onMouseEnter={() => setSubmenu(s)}
          >
            {s}
          </NoraMenuItem>
        ))}
      </NoraMenu>
    </div>
  )
}

function NoraZoomMenu() {
  const [hovered, setHovered] = React.useState<string | null>(null)
  const [fastZoom, setFastZoom] = React.useState(true)
  const [nudge, setNudge] = React.useState<1 | 10>(1)
  const [nudgeOpen, setNudgeOpen] = React.useState(false)

  const zoomItems: { id: string; label: string; shortcut: React.ReactNode }[] =
    [
      {
        id: "in",
        label: "Zoom In",
        shortcut: (
          <>
            <NoraKbd>⌘</NoraKbd>
            <NoraKbd>+</NoraKbd>
          </>
        ),
      },
      {
        id: "out",
        label: "Zoom Out",
        shortcut: (
          <>
            <NoraKbd>⌘</NoraKbd>
            <NoraKbd>−</NoraKbd>
          </>
        ),
      },
      {
        id: "100",
        label: "Zoom to 100%",
        shortcut: (
          <>
            <NoraKbd>⇧</NoraKbd>
            <NoraKbd>0</NoraKbd>
          </>
        ),
      },
      {
        id: "fit",
        label: "Zoom to Fit",
        shortcut: (
          <>
            <NoraKbd>⇧</NoraKbd>
            <NoraKbd>1</NoraKbd>
          </>
        ),
      },
      {
        id: "selection",
        label: "Zoom to Selection",
        shortcut: (
          <>
            <NoraKbd>⇧</NoraKbd>
            <NoraKbd>2</NoraKbd>
          </>
        ),
      },
    ]

  return (
    <div
      className="relative flex min-h-[280px] w-full items-center justify-center"
      onMouseLeave={() => {
        setHovered(null)
        setNudgeOpen(false)
      }}
    >
      <NoraMenu width={220}>
        <NoraMenuItem
          active={hovered === "zoom"}
          shortcut={<NoraKbd>Z</NoraKbd>}
          onMouseEnter={() => {
            setHovered("zoom")
            setNudgeOpen(false)
          }}
          onClick={() => setHovered("zoom")}
        >
          Zoom
        </NoraMenuItem>
        <NoraMenuDivider />
        {zoomItems.map((item) => (
          <NoraMenuItem
            key={item.id}
            active={hovered === item.id}
            shortcut={item.shortcut}
            onMouseEnter={() => {
              setHovered(item.id)
              setNudgeOpen(false)
            }}
            onClick={() => setHovered(item.id)}
          >
            {item.label}
          </NoraMenuItem>
        ))}
        <NoraMenuDivider />
        <div
          role="menuitem"
          tabIndex={0}
          onMouseEnter={() => {
            setHovered("fast")
            setNudgeOpen(false)
          }}
          onClick={() => setFastZoom((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setFastZoom((v) => !v)
            }
          }}
          className={cn(
            "group/item flex h-[var(--nora-control-h,30px)] cursor-pointer items-center justify-between gap-3 rounded-[var(--nora-radius-sm,6px)] px-2 text-[var(--nora-text)] outline-none transition-[background-color,color] duration-100",
            hovered === "fast"
              ? "bg-[var(--nora-tint)] text-white"
              : "hover:bg-[var(--nora-tint)] hover:text-white"
          )}
        >
          <span className="text-xs">Fast Zoom</span>
          <Switch
            size="sm"
            checked={fastZoom}
            onCheckedChange={setFastZoom}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              hovered === "fast" &&
                "data-checked:bg-white/90 data-unchecked:bg-white/25"
            )}
          />
        </div>
        <NoraMenuSub
          label="Nudge Amount"
          width={96}
          open={nudgeOpen}
          onOpen={() => {
            setHovered("nudge")
            setNudgeOpen(true)
          }}
        >
          {(
            [
              { value: 1 as const, label: "1" },
              { value: 10 as const, label: "10" },
            ] as const
          ).map((opt) => (
            <NoraMenuItem
              key={opt.value}
              checked={nudge === opt.value}
              onClick={() => setNudge(opt.value)}
            >
              {opt.label}
            </NoraMenuItem>
          ))}
        </NoraMenuSub>
      </NoraMenu>
    </div>
  )
}

function NoraModelPicker() {
  const models = [
    { name: "GPT 5.6 Sol", cost: "1×" },
    { name: "GPT 5.6 Terra", cost: "0.6×" },
    { name: "GPT 5.6 Luna", cost: "0.4×" },
    { name: "Fable 5", cost: "2×" },
    { name: "Opus 4.8", cost: "1.2×" },
    { name: "Sonnet 5", cost: "0.6×" },
  ]
  const [selected, setSelected] = React.useState(models[0].name)
  const [hovered, setHovered] = React.useState<string | null>(null)

  return (
    <div className="flex w-full items-center justify-center">
      <NoraMenu width={200} className="h-fit">
        <div className="px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--nora-text-tertiary)]">
          Model
        </div>
        {models.map((m) => {
          const isSelected = selected === m.name
          const isActive = hovered === m.name
          return (
            <button
              key={m.name}
              type="button"
              onMouseEnter={() => setHovered(m.name)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setSelected(m.name)}
              className={cn(
                "flex h-[var(--nora-control-h,30px)] w-full items-center gap-2 rounded-[var(--nora-radius-sm,6px)] px-2 text-left outline-none transition-[background-color,color] duration-100",
                isActive
                  ? "bg-[var(--nora-tint)] text-white"
                  : "text-[var(--nora-text)]"
              )}
            >
              <span className="min-w-0 flex-1 truncate text-xs font-medium">
                {m.name}
              </span>
              <span
                className={cn(
                  "shrink-0 text-[11px] tabular-nums",
                  isActive
                    ? "text-white/75"
                    : "text-[var(--nora-text-tertiary)]"
                )}
              >
                {m.cost}
              </span>
              <span className="inline-flex size-3 shrink-0 items-center justify-center">
                {isSelected ? (
                  <CheckIcon
                    className={cn(
                      "size-3",
                      isActive ? "text-white" : "text-[var(--nora-tint)]"
                    )}
                  />
                ) : null}
              </span>
            </button>
          )
        })}
      </NoraMenu>
    </div>
  )
}

function NoraBreakpointBar() {
  const presets = [
    { id: "desktop", label: "Desktop", width: 1200, frameW: 148, frameH: 92 },
    { id: "tablet", label: "Tablet", width: 810, frameW: 88, frameH: 112 },
    { id: "phone", label: "Phone", width: 390, frameW: 48, frameH: 104 },
  ] as const
  const [active, setActive] = React.useState<(typeof presets)[number]["id"]>(
    "desktop"
  )

  return (
    <div className="grid w-full place-items-center">
      <div className="flex items-end gap-5">
        {presets.map((bp) => {
          const isActive = active === bp.id
          return (
            <button
              key={bp.id}
              type="button"
              onClick={() => setActive(bp.id)}
              className="group flex flex-col items-center gap-1.5 outline-none"
            >
              <span
                className={cn(
                  "inline-flex h-6 items-center gap-1.5 rounded-[8px] px-1.5 text-[11px] font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-[var(--nora-tint-dimmed)] text-[var(--nora-tint)]"
                    : "text-[var(--nora-text-tertiary)] group-hover:text-[var(--nora-text-secondary)]"
                )}
              >
                {bp.label}
                <span className="text-[10px] tabular-nums opacity-70">
                  {bp.width}
                </span>
              </span>
              <span
                className={cn(
                  "block rounded-[8px] bg-[var(--nora-panel)] transition-[box-shadow]",
                  isActive
                    ? "shadow-[0_0_0_1.5px_var(--nora-tint),0_8px_20px_rgba(0,0,0,0.08)]"
                    : "shadow-[0_0_0_1px_var(--nora-border)] group-hover:shadow-[0_0_0_1px_var(--nora-border-strong)]"
                )}
                style={{ width: bp.frameW, height: bp.frameH }}
              />
            </button>
          )
        })}
        <button
          type="button"
          aria-label="Add breakpoint"
          title="Add breakpoint"
          className="self-center inline-flex size-6 shrink-0 items-center justify-center rounded-[7px] text-[var(--nora-tint)] transition-colors hover:bg-[var(--nora-tint-dimmed)]"
        >
          <PlusIcon className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Marketing blocks                                                    */
/* ------------------------------------------------------------------ */

function NoraMkNavbar() {
  const { scheme } = useTheme()
  const light = scheme === "editor-light"
  const links = ["Product", "Teams", "Resources", "Pricing"]

  return (
    <div
      className={cn(
        "flex h-14 w-full max-w-[860px] items-center gap-6 rounded-[14px] px-5 backdrop-blur-md",
        light
          ? "bg-black/[0.04] text-[var(--nora-text)] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
          : "bg-white/5 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
      )}
    >
      <NoraLogo className="text-current" />
      <nav
        className={cn(
          "flex gap-5 text-[13px] font-medium",
          light ? "text-[var(--nora-text-secondary)]" : "text-white/80"
        )}
      >
        {links.map((link) => (
          <span
            key={link}
            className={cn(
              "cursor-pointer transition-colors",
              light
                ? "hover:text-[var(--nora-text)]"
                : "hover:text-white",
              link === "Pricing" &&
                (light ? "text-[var(--nora-text)]" : "text-white")
            )}
          >
            {link}
          </span>
        ))}
      </nav>
      <div className="flex-1" />
      <span
        className={cn(
          "cursor-pointer text-[13px] font-medium transition-colors",
          light
            ? "text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)]"
            : "text-white/80 hover:text-white"
        )}
      >
        Login
      </span>
      <button
        type="button"
        className={cn(
          "h-9 rounded-[10px] px-3.5 text-[13px] font-semibold transition-colors",
          light
            ? "bg-[var(--nora-text)] text-white hover:bg-black"
            : "bg-white text-black hover:bg-white/90"
        )}
      >
        Sign up
      </button>
    </div>
  )
}

function NoraMkHero() {
  const { scheme } = useTheme()
  const light = scheme === "editor-light"

  return (
    <div
      className={cn(
        "flex w-full max-w-[640px] flex-col items-center gap-[18px] rounded-[20px] px-5 py-[30px] text-center",
        light
          ? "bg-[var(--nora-panel)] text-[var(--nora-text)] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
          : "bg-black text-white"
      )}
    >
      <NoraBadge variant="blue">New: Nora AI</NoraBadge>
      <h1
        className={cn(
          "font-[family-name:var(--nora-font-display,var(--nora-font))] text-[44px] font-bold leading-[1.05] tracking-[-0.03em]",
          light ? "text-[var(--nora-text)]" : "text-white"
        )}
      >
        The website builder loved by designers
      </h1>
      <p
        className={cn(
          "max-w-[440px] text-[15px] font-medium leading-relaxed",
          light ? "text-[var(--nora-text-secondary)]" : "text-white/60"
        )}
      >
        Design, scale and publish a production-ready site — no code required.
      </p>
      <div className="mt-1.5 flex gap-2.5">
        <button
          type="button"
          className={cn(
            "h-10 rounded-[10px] px-4 text-sm font-semibold transition-colors",
            light
              ? "bg-[var(--nora-text)] text-white hover:bg-black"
              : "bg-white text-black hover:bg-white/90"
          )}
        >
          Start for Free
        </button>
        <button
          type="button"
          className={cn(
            "h-10 rounded-[10px] border px-4 text-sm font-semibold transition-colors",
            light
              ? "border-[var(--nora-border-strong)] text-[var(--nora-text)] hover:bg-[var(--nora-row-hover)]"
              : "border-white/20 text-white hover:bg-white/5"
          )}
        >
          Watch Demo
        </button>
      </div>
    </div>
  )
}

function NoraMkPricing() {
  const { scheme } = useTheme()
  const light = scheme === "editor-light"
  const features = [
    "Custom domain",
    "10 000 visitors",
    "CMS — 1 000 items",
    "Password protection",
    "Analytics",
  ]
  return (
    <div
      className={cn(
        "flex w-[260px] flex-col gap-3.5 rounded-2xl bg-[var(--nora-panel)] p-[22px]",
        light
          ? "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
          : "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-sm font-semibold",
            light ? "text-[var(--nora-text)]" : "text-white"
          )}
        >
          Pro
        </span>
        <NoraBadge variant="blue">Popular</NoraBadge>
      </div>
      <div
        className={cn(
          "text-[34px] font-bold leading-none tracking-[-0.02em]",
          light ? "text-[var(--nora-text)]" : "text-white"
        )}
      >
        $20
        <span
          className={cn(
            "text-[13px] font-medium",
            light ? "text-[var(--nora-text-tertiary)]" : "text-white/50"
          )}
        >
          {" "}
          /month
        </span>
      </div>
      <div
        className={cn("h-px", light ? "bg-[var(--nora-border)]" : "bg-white/10")}
      />
      <div
        className={cn(
          "flex flex-col gap-2 text-[12.5px] font-medium",
          light ? "text-[var(--nora-text-secondary)]" : "text-white/75"
        )}
      >
        {features.map((f) => (
          <span key={f}>✓ {f}</span>
        ))}
      </div>
      <button
        type="button"
        className="h-10 w-full rounded-[10px] bg-[var(--nora-tint)] text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Get Started
      </button>
    </div>
  )
}

function NoraMkFooter() {
  const { scheme } = useTheme()
  const light = scheme === "editor-light"
  const columns = [
    { title: "Product", links: ["Agents", "Design", "CMS", "Hosting", "SEO", "Publish"] },
    { title: "Resources", links: ["Academy", "Guides", "Blog", "Newsletter", "Stories", "Support"] },
    { title: "Community", links: ["Marketplace", "Templates", "Plugins", "Gallery", "Meetups", "Members"] },
    { title: "Compare", links: ["Webflow", "Figma", "Wix", "Squarespace", "WordPress", "Readymag"] },
  ]
  return (
    <div
      className={cn(
        "flex w-full max-w-[860px] flex-col gap-7 rounded-2xl p-[30px]",
        light
          ? "bg-[var(--nora-panel)] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
          : "bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
      )}
    >
      <div className="grid grid-cols-4 gap-5">
        {columns.map((col) => (
          <div key={col.title} className="flex flex-col gap-2">
            <div
              className={cn(
                "mb-0.5 text-xs font-semibold",
                light ? "text-[var(--nora-text)]" : "text-white"
              )}
            >
              {col.title}
            </div>
            {col.links.map((link) => (
              <span
                key={link}
                className={cn(
                  "cursor-pointer text-xs font-medium transition-colors",
                  light
                    ? "text-[var(--nora-text-secondary)] hover:text-[var(--nora-text)]"
                    : "text-white/55 hover:text-white/80"
                )}
              >
                {link}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div
        className={cn(
          "flex items-center justify-between border-t pt-5",
          light ? "border-[var(--nora-border)]" : "border-white/10"
        )}
      >
        <NoraLogo
          className={light ? "text-[var(--nora-text)]" : "text-white"}
        />
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium",
            light ? "text-[var(--nora-text-secondary)]" : "text-white/60"
          )}
        >
          <span className="size-1.5 rounded-full bg-[var(--nora-success)]" />
          All systems normal
        </span>
      </div>
    </div>
  )
}

function NoraTemplateCard() {
  const { scheme } = useTheme()
  const light = scheme === "editor-light"
  const cards = [
    {
      title: "Portfolio X",
      author: "Studio Nova",
      price: "$49",
      gradient: "from-[var(--nora-tint)] to-[var(--nora-component)]",
      badge: "blue" as const,
    },
    {
      title: "Launchpad",
      author: "Nora Team",
      price: "Free",
      gradient: light
        ? "from-[var(--nora-surface)] to-[var(--nora-border-strong)]"
        : "from-[#2a2a2a] to-[#111]",
      badge: "green" as const,
    },
  ]
  return (
    <div className="flex gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className={cn(
            "w-[230px] cursor-pointer overflow-hidden rounded-[14px] bg-[var(--nora-panel)]",
            light
              ? "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
              : "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]"
          )}
        >
          <div
            className={cn(
              "flex h-[120px] items-center justify-center bg-gradient-to-br",
              card.gradient
            )}
          >
            <span
              className={cn(
                "text-xl font-bold tracking-[-0.02em]",
                card.title === "Launchpad" && light
                  ? "text-[var(--nora-text)]"
                  : "text-white/90"
              )}
            >
              {card.title}
            </span>
          </div>
          <div className="flex items-center justify-between px-3.5 py-3">
            <div>
              <div
                className={cn(
                  "text-[12.5px] font-semibold",
                  light ? "text-[var(--nora-text)]" : "text-white"
                )}
              >
                {card.title}
              </div>
              <div
                className={cn(
                  "text-[11px] font-medium",
                  light
                    ? "text-[var(--nora-text-tertiary)]"
                    : "text-white/45"
                )}
              >
                by {card.author}
              </div>
            </div>
            <NoraBadge variant={card.badge}>{card.price}</NoraBadge>
          </div>
        </div>
      ))}
    </div>
  )
}

function NoraMkFaq() {
  const { scheme } = useTheme()
  const light = scheme === "editor-light"
  const items = [
    {
      q: "What counts as a visitor?",
      a: "Уникальный посетитель за календарный месяц. Повторные заходы с того же устройства не учитываются.",
      open: true,
    },
    {
      q: "Can I use a custom domain?",
      a: "Да, на любом платном тарифе можно подключить свой домен.",
    },
    { q: "Do you offer refunds?", a: "Возврат возможен в течение 14 дней после оплаты." },
    {
      q: "What happens if I exceed my plan limits?",
      a: "Мы уведомим заранее и предложим перейти на следующий тариф.",
    },
  ]
  return (
    <div
      className={cn(
        "flex w-[420px] flex-col rounded-2xl px-4 py-1",
        light
          ? "bg-[var(--nora-panel)] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
          : "bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
      )}
    >
      {items.map((item) => (
        <details
          key={item.q}
          open={item.open}
          className={cn(
            "group border-b py-3 last:border-b-0",
            light ? "border-[var(--nora-border)]" : "border-white/10"
          )}
        >
          <summary
            className={cn(
              "flex cursor-pointer list-none items-center justify-between text-[13px] font-medium [&::-webkit-details-marker]:hidden",
              light ? "text-[var(--nora-text)]" : "text-white"
            )}
          >
            {item.q}
            <ChevronRightIcon
              className={cn(
                "size-3.5 shrink-0 transition-transform group-open:rotate-90",
                light
                  ? "text-[var(--nora-text-tertiary)]"
                  : "text-white/50"
              )}
            />
          </summary>
          <p
            className={cn(
              "mt-2 text-xs leading-relaxed",
              light
                ? "text-[var(--nora-text-secondary)]"
                : "text-white/55"
            )}
          >
            {item.a}
          </p>
        </details>
      ))}
    </div>
  )
}

function NoraMkCta() {
  const { scheme } = useTheme()
  const light = scheme === "editor-light"

  return (
    <div
      className={cn(
        "flex w-full max-w-[720px] flex-col items-center gap-5 rounded-[20px] px-10 py-14 text-center",
        light
          ? "bg-[var(--nora-panel)] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
          : "bg-gradient-to-b from-[var(--nora-surface)] to-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]"
      )}
    >
      <h2
        className={cn(
          "text-[38px] font-bold leading-[1.1] tracking-[-0.03em]",
          light ? "text-[var(--nora-text)]" : "text-white"
        )}
      >
        Start your dream site today
      </h2>
      <p
        className={cn(
          "max-w-[380px] text-sm font-medium leading-relaxed",
          light ? "text-[var(--nora-text-secondary)]" : "text-white/55"
        )}
      >
        Design, publish and scale — everything you need in one tool.
      </p>
      <div className="mt-1 flex gap-2.5">
        <button
          type="button"
          className={cn(
            "h-10 rounded-[10px] px-4 text-sm font-semibold transition-colors",
            light
              ? "bg-[var(--nora-text)] text-white hover:bg-black"
              : "bg-white text-black hover:bg-white/90"
          )}
        >
          Start for Free
        </button>
        <button
          type="button"
          className={cn(
            "h-10 rounded-[10px] border px-4 text-sm font-semibold transition-colors",
            light
              ? "border-[var(--nora-border-strong)] text-[var(--nora-text)] hover:bg-[var(--nora-row-hover)]"
              : "border-white/20 text-white hover:bg-white/5"
          )}
        >
          Talk to Sales
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Registry — keyed by nav id (nora-*)                                   */
/* ------------------------------------------------------------------ */

export const NORA_BLOCK_RENDERERS: Record<string, () => React.ReactNode> = {
  "nora-toolbar": wrapBlock(NoraToolbar),
  "nora-left-panel": wrapBlock(NoraLeftPanel),
  "nora-properties-panel": wrapBlock(NoraPropertiesPanel),
  "nora-context-menu": wrapBlock(NoraContextMenu),
  "nora-publish-modal": wrapBlock(NoraPublishModal),
  "nora-ai-chat": wrapBlock(NoraAiChat),
  "nora-dashboard-sidebar": wrapBlock(NoraDashboardSidebar),
  "nora-auth-card": wrapBlock(NoraAuthCard),
  "nora-mk-navbar": wrapBlock(NoraMkNavbar),
  "nora-mk-hero": wrapBlock(NoraMkHero),
  "nora-mk-pricing": wrapBlock(NoraMkPricing),
  "nora-toast-stack": wrapBlock(NoraToastStack),
  "nora-insert-panel": wrapBlock(NoraInsertPanel),
  "nora-main-menu": wrapBlock(NoraMainMenu),
  "nora-zoom-menu": wrapBlock(NoraZoomMenu),
  "nora-model-picker": wrapBlock(NoraModelPicker),
  "nora-breakpoint-bar": wrapBlock(NoraBreakpointBar),
  "nora-mk-footer": wrapBlock(NoraMkFooter),
  "nora-template-card": wrapBlock(NoraTemplateCard),
  "nora-mk-faq": wrapBlock(NoraMkFaq),
  "nora-mk-cta": wrapBlock(NoraMkCta),
}

export {
  NoraToolbar,
  NoraLeftPanel,
  NoraPropertiesPanel,
  NoraContextMenu,
  NoraPublishModal,
  NoraAiChat,
  NoraDashboardSidebar,
  NoraAuthCard,
  NoraMkNavbar,
  NoraMkHero,
  NoraMkPricing,
  NoraToastStack,
  NoraInsertPanel,
  NoraMainMenu,
  NoraZoomMenu,
  NoraModelPicker,
  NoraBreakpointBar,
  NoraMkFooter,
  NoraTemplateCard,
  NoraMkFaq,
  NoraMkCta,
}
