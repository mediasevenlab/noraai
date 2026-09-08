import * as React from "react"
import { NORA_COMPONENT_REGISTRY } from "@/lib/nora-registry"
import {
  NoraAvatar,
  NoraAvatarStack,
  NoraBadge,
  NoraBreadcrumb,
  NoraButton,
  NoraCheckbox,
  NoraCollapsible,
  NoraColorWell,
  NoraDivider,
  NoraEmpty,
  NoraField,
  NoraIconButton,
  NoraInput,
  NoraKbd,
  NoraList,
  NoraListItem,
  NoraMenu,
  NoraMenuDivider,
  NoraMenuItem,
  NoraMenuLabel,
  NoraModal,
  NoraPanel,
  NoraPanelRow,
  NoraProgress,
  NoraSearch,
  NoraSectionTitle,
  NoraSegmented,
  NoraSelect,
  NoraSlider,
  NoraSpinner,
  NoraStepper,
  NoraSwitch,
  NoraTabs,
  NoraTextarea,
  NoraToast,
  NoraTooltip,
} from "@/components/nora/primitives"

import type { ComponentDoc, DemoExample } from "./demos/types"

/* ---------- Demo icons ---------- */

function PlusIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none">
      <path
        d="M6 2v8M2 6h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none">
      <path
        d="M4 2.8v8.4c0 .5.6.9 1 .6l6.6-4.2a.7.7 0 0 0 0-1.2L5 2.2c-.4-.3-1 .1-1 .6Z"
        fill="currentColor"
      />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none">
      <path
        d="M4 1v12M10 1v12M1 4h12M1 10h12"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function TextIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none">
      <path
        d="M2.5 3.5V2.5h9v1M7 2.5v9M5.5 11.5h3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function StackIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none">
      <rect
        x="2"
        y="2"
        width="10"
        height="4"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <rect
        x="2"
        y="8"
        width="10"
        height="4"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  )
}

/** Слайдер и степпер с общим значением */
function SliderWithStepperDemo() {
  const [value, setValue] = React.useState(30)
  return (
    <div className="flex w-[260px] items-center gap-2.5">
      <NoraSlider
        className="min-w-0 flex-1"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
      />
      <NoraStepper
        className="w-[96px] shrink-0"
        value={String(value)}
        onChange={(next) => {
          const n = Number.parseInt(next, 10)
          if (!Number.isNaN(n)) setValue(Math.min(100, Math.max(0, n)))
        }}
      />
    </div>
  )
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none">
      <rect
        x="1.5"
        y="1.5"
        width="11"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <circle cx="5" cy="5" r="1.2" fill="currentColor" />
      <path
        d="M2 10.5 5.5 7l3 3 1.5-1.5 2 2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M7 1.5v2M7 10.5v2M12.5 7h-2M3.5 7h-2M10.9 3.1 9.5 4.5M4.5 9.5l-1.4 1.4M10.9 10.9 9.5 9.5M4.5 4.5 3.1 3.1"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none">
      <circle cx="5" cy="5" r="3.75" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 8l3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none">
      <path
        d="m2 6.2 5-4.2 5 4.2V11a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 2 11V6.2Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PageIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none">
      <rect
        x="2.5"
        y="1.5"
        width="9"
        height="11"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M5 5h4M5 7.5h4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none">
      <path
        d="M1.5 3.5A1.5 1.5 0 0 1 3 2h2.3c.4 0 .8.2 1 .5l.8 1H11A1.5 1.5 0 0 1 12.5 5v5.5A1.5 1.5 0 0 1 11 12H3a1.5 1.5 0 0 1-1.5-1.5v-7Z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  )
}

function ComponentIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect
        x="4.6"
        y="4.6"
        width="4.8"
        height="4.8"
        rx="1"
        transform="rotate(45 7 7)"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none">
      <rect
        x="4.5"
        y="4.5"
        width="8"
        height="8"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M9.5 4.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  )
}

function PasteIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none">
      <rect
        x="2.5"
        y="1.5"
        width="9"
        height="11"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M5 5h4M5 7.5h4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none">
      <path
        d="M2.5 3.5h9M5.5 3.5v-1a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M4 3.5l.5 8a1 1 0 0 0 1 .9h3a1 1 0 0 0 1-.9l.5-8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

type DemoDef = { code: string; render: () => React.ReactNode }

const COMPONENT_DEMOS: Record<string, DemoDef[]> = {
  button: [
    {
      code: `import { NoraButton } from "@/components/nora/primitives"

<NoraButton>Default</NoraButton>
<NoraButton variant="primary">Primary</NoraButton>
<NoraButton variant="component">Component</NoraButton>
<NoraButton variant="tinted">Tinted</NoraButton>
<NoraButton variant="destructive">Delete</NoraButton>
<NoraButton variant="destructiveSecondary">Remove</NoraButton>
<NoraButton variant="ghost">Ghost</NoraButton>
<NoraButton disabled>Disabled</NoraButton>`,
      render: () => (
        <>
          <NoraButton>Default</NoraButton>
          <NoraButton variant="primary">Primary</NoraButton>
          <NoraButton variant="component">Component</NoraButton>
          <NoraButton variant="tinted">Tinted</NoraButton>
          <NoraButton variant="destructive">Delete</NoraButton>
          <NoraButton variant="destructiveSecondary">Remove</NoraButton>
          <NoraButton variant="ghost">Ghost</NoraButton>
          <NoraButton disabled>Disabled</NoraButton>
        </>
      ),
    },
    {
      code: `import { NoraButton } from "@/components/nora/primitives"

<NoraButton size="sm" variant="primary">Small</NoraButton>
<NoraButton variant="primary">Default</NoraButton>
<NoraButton size="lg" variant="primary">Large</NoraButton>
<NoraButton size="xl" variant="primary">Extra Large</NoraButton>`,
      render: () => (
        <>
          <NoraButton size="sm" variant="primary">
            Small
          </NoraButton>
          <NoraButton variant="primary">Default</NoraButton>
          <NoraButton size="lg" variant="primary">
            Large
          </NoraButton>
          <NoraButton size="xl" variant="primary">
            Extra Large
          </NoraButton>
        </>
      ),
    },
    {
      code: `import { NoraButton } from "@/components/nora/primitives"

<NoraButton variant="primary" depth>
  <PlusIcon /> Insert
</NoraButton>
<NoraButton depth>
  <PlayIcon /> Preview
</NoraButton>
<NoraButton variant="primary" depth size="pill">
  Publish
</NoraButton>`,
      render: () => (
        <>
          <NoraButton variant="primary" depth>
            <PlusIcon /> Insert
          </NoraButton>
          <NoraButton depth>
            <PlayIcon /> Preview
          </NoraButton>
          <NoraButton variant="primary" depth size="pill">
            Publish
          </NoraButton>
        </>
      ),
    },
    {
      code: `import { NoraButton } from "@/components/nora/primitives"

<NoraButton variant="mk">Start for Free</NoraButton>
<NoraButton variant="mkBlue">Get Started</NoraButton>
<NoraButton variant="mkOutline">Contact Sales</NoraButton>`,
      render: () => (
        <>
          <NoraButton variant="mk">Start for Free</NoraButton>
          <NoraButton variant="mkBlue">Get Started</NoraButton>
          <NoraButton variant="mkOutline">Contact Sales</NoraButton>
        </>
      ),
    },
  ],
  "icon-button": [
    {
      code: `import { NoraIconButton } from "@/components/nora/primitives"

<NoraIconButton><GridIcon /></NoraIconButton>
<NoraIconButton><TextIcon /></NoraIconButton>
<NoraIconButton active><StackIcon /></NoraIconButton>
<NoraIconButton><ImageIcon /></NoraIconButton>
<NoraIconButton><SettingsIcon /></NoraIconButton>`,
      render: () => (
        <>
          <NoraIconButton>
            <GridIcon />
          </NoraIconButton>
          <NoraIconButton>
            <TextIcon />
          </NoraIconButton>
          <NoraIconButton active>
            <StackIcon />
          </NoraIconButton>
          <NoraIconButton>
            <ImageIcon />
          </NoraIconButton>
          <NoraIconButton>
            <SettingsIcon />
          </NoraIconButton>
        </>
      ),
    },
  ],
  input: [
    {
      code: `import { NoraInput } from "@/components/nora/primitives"

<div className="w-[200px]">
  <NoraInput placeholder="Placeholder" />
</div>
<div className="w-[200px]">
  <NoraInput defaultValue="Заполненное поле" />
</div>
<div className="w-[200px]">
  <NoraInput error defaultValue="Ошибка валидации" />
</div>`,
      render: () => (
        <>
          <div className="w-[200px]">
            <NoraInput placeholder="Placeholder" />
          </div>
          <div className="w-[200px]">
            <NoraInput defaultValue="Заполненное поле" />
          </div>
          <div className="w-[200px]">
            <NoraInput error defaultValue="Ошибка валидации" />
          </div>
        </>
      ),
    },
    {
      code: `import { NoraField, NoraInput } from "@/components/nora/primitives"

<NoraField className="w-[220px]" icon={<SearchIcon />}>
  <NoraInput placeholder="Поиск по проекту…" />
</NoraField>`,
      render: () => (
        <NoraField className="w-[220px]" icon={<SearchIcon />}>
          <NoraInput placeholder="Поиск по проекту…" />
        </NoraField>
      ),
    },
    {
      code: `import { NoraTextarea } from "@/components/nora/primitives"

<div className="w-[280px]">
  <NoraTextarea placeholder="Опишите, что нужно сгенерировать…" />
</div>`,
      render: () => (
        <div className="w-[280px]">
          <NoraTextarea placeholder="Опишите, что нужно сгенерировать…" />
        </div>
      ),
    },
  ],
  select: [
    {
      code: `import { NoraSelect } from "@/components/nora/primitives"

<NoraSelect
  className="w-[160px]"
  defaultValue="fixed"
  items={[
    { value: "fixed", label: "Fixed" },
    { value: "relative", label: "Relative" },
    { value: "absolute", label: "Absolute" },
    { value: "sticky", label: "Sticky" },
  ]}
/>
<NoraSelect
  className="w-[160px]"
  defaultValue="inter"
  items={[
    { value: "inter", label: "Inter" },
    { value: "inter-display", label: "Inter Display" },
    { value: "input-mono", label: "Input Mono" },
  ]}
/>`,
      render: () => (
        <>
          <NoraSelect
            className="w-[160px]"
            defaultValue="fixed"
            items={[
              { value: "fixed", label: "Fixed" },
              { value: "relative", label: "Relative" },
              { value: "absolute", label: "Absolute" },
              { value: "sticky", label: "Sticky" },
            ]}
          />
          <NoraSelect
            className="w-[160px]"
            defaultValue="inter"
            items={[
              { value: "inter", label: "Inter" },
              { value: "inter-display", label: "Inter Display" },
              { value: "input-mono", label: "Input Mono" },
            ]}
          />
        </>
      ),
    },
  ],
  "segmented-control": [
    {
      code: `import { NoraSegmented } from "@/components/nora/primitives"

<NoraSegmented options={["Design", "CMS", "Analytics"]} defaultValue="Design" />
<NoraSegmented options={["Left", "Center", "Right"]} defaultValue="Center" />`,
      render: () => (
        <>
          <NoraSegmented
            options={["Design", "CMS", "Analytics"]}
            defaultValue="Design"
          />
          <NoraSegmented options={["Left", "Center", "Right"]} defaultValue="Center" />
        </>
      ),
    },
    {
      code: `import { NoraSegmented } from "@/components/nora/primitives"

<NoraSegmented
  className="w-[280px]"
  options={["Desktop", "Tablet", "Phone"]}
  defaultValue="Desktop"
/>`,
      render: () => (
        <NoraSegmented
          className="w-[280px]"
          options={["Desktop", "Tablet", "Phone"]}
          defaultValue="Desktop"
        />
      ),
    },
  ],
  checkbox: [
    {
      code: `import { NoraCheckbox } from "@/components/nora/primitives"

<NoraCheckbox defaultChecked label="Показывать сетку" />
<NoraCheckbox label="Привязка к пикселям" />`,
      render: () => (
        <>
          <NoraCheckbox defaultChecked label="Показывать сетку" />
          <NoraCheckbox label="Привязка к пикселям" />
        </>
      ),
    },
  ],
  switch: [
    {
      code: `import { NoraSwitch } from "@/components/nora/primitives"

<NoraSwitch defaultChecked />
<NoraSwitch />
<span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--nora-text)]">
  <NoraSwitch defaultChecked /> Auto-save
</span>`,
      render: () => (
        <>
          <NoraSwitch defaultChecked />
          <NoraSwitch />
          <span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--nora-text)]">
            <NoraSwitch defaultChecked /> Auto-save
          </span>
        </>
      ),
    },
  ],
  slider: [
    {
      code: `import { NoraSlider } from "@/components/nora/primitives"

<div className="w-[220px]">
  <NoraSlider defaultValue={60} />
</div>`,
      render: () => (
        <div className="w-[220px]">
          <NoraSlider defaultValue={60} />
        </div>
      ),
    },
    {
      code: `const [value, setValue] = useState(30)

<div className="flex w-[260px] items-center gap-2.5">
  <NoraSlider
    className="min-w-0 flex-1"
    value={value}
    onChange={(e) => setValue(Number(e.target.value))}
  />
  <NoraStepper
    className="w-[96px] shrink-0"
    value={String(value)}
    onChange={(v) => setValue(Number(v) || 0)}
  />
</div>`,
      render: () => <SliderWithStepperDemo />,
    },
  ],
  stepper: [
    {
      code: `import { NoraStepper } from "@/components/nora/primitives"

<NoraStepper defaultValue="120" />
<NoraStepper defaultValue="1fr" showButtons={false} />
<NoraStepper defaultValue="16px" />`,
      render: () => (
        <>
          <NoraStepper defaultValue="120" />
          <NoraStepper defaultValue="1fr" showButtons={false} />
          <NoraStepper defaultValue="16px" />
        </>
      ),
    },
  ],
  badge: [
    {
      code: `import { NoraBadge } from "@/components/nora/primitives"

<NoraBadge variant="neutral">Draft</NoraBadge>
<NoraBadge variant="blue">Pro</NoraBadge>
<NoraBadge variant="purple">Component</NoraBadge>
<NoraBadge variant="green">Published</NoraBadge>
<NoraBadge variant="red">Error</NoraBadge>
<NoraBadge variant="yellow">Beta</NoraBadge>`,
      render: () => (
        <>
          <NoraBadge variant="neutral">Draft</NoraBadge>
          <NoraBadge variant="blue">Pro</NoraBadge>
          <NoraBadge variant="purple">Component</NoraBadge>
          <NoraBadge variant="green">Published</NoraBadge>
          <NoraBadge variant="red">Error</NoraBadge>
          <NoraBadge variant="yellow">Beta</NoraBadge>
        </>
      ),
    },
  ],
  tooltip: [
    {
      code: `import { NoraKbd, NoraTooltip } from "@/components/nora/primitives"

<NoraTooltip>Insert Frame</NoraTooltip>
<NoraTooltip>
  Preview <NoraKbd>⌘</NoraKbd>
  <NoraKbd>P</NoraKbd>
</NoraTooltip>
<NoraTooltip tint>375 × 812</NoraTooltip>`,
      render: () => (
        <>
          <NoraTooltip>Insert Frame</NoraTooltip>
          <NoraTooltip>
            Preview <NoraKbd>⌘</NoraKbd>
            <NoraKbd>P</NoraKbd>
          </NoraTooltip>
          <NoraTooltip tint>375 × 812</NoraTooltip>
        </>
      ),
    },
  ],
  kbd: [
    {
      code: `import { NoraKbd } from "@/components/nora/primitives"

<span className="inline-flex gap-0.5">
  <NoraKbd>⌘</NoraKbd>
  <NoraKbd>C</NoraKbd>
</span>
<span className="inline-flex gap-0.5">
  <NoraKbd>⌥</NoraKbd>
  <NoraKbd>⇧</NoraKbd>
  <NoraKbd>K</NoraKbd>
</span>
<span className="inline-flex gap-0.5">
  <NoraKbd>Esc</NoraKbd>
</span>`,
      render: () => (
        <>
          <span className="inline-flex gap-0.5">
            <NoraKbd>⌘</NoraKbd>
            <NoraKbd>C</NoraKbd>
          </span>
          <span className="inline-flex gap-0.5">
            <NoraKbd>⌥</NoraKbd>
            <NoraKbd>⇧</NoraKbd>
            <NoraKbd>K</NoraKbd>
          </span>
          <span className="inline-flex gap-0.5">
            <NoraKbd>Esc</NoraKbd>
          </span>
        </>
      ),
    },
  ],
  menu: [
    {
      code: `import { NoraKbd, NoraMenu, NoraMenuDivider, NoraMenuItem } from "@/components/nora/primitives"

<NoraMenu>
  <NoraMenuItem icon={<CopyIcon />} shortcut={<><NoraKbd>⌘</NoraKbd><NoraKbd>C</NoraKbd></>}>
    Copy
  </NoraMenuItem>
  <NoraMenuItem active icon={<PasteIcon />} shortcut={<><NoraKbd>⌘</NoraKbd><NoraKbd>V</NoraKbd></>}>
    Paste
  </NoraMenuItem>
  <NoraMenuItem icon={<StackIcon />} shortcut={<><NoraKbd>⌘</NoraKbd><NoraKbd>D</NoraKbd></>}>
    Duplicate
  </NoraMenuItem>
  <NoraMenuDivider />
  <NoraMenuItem>Add to Component</NoraMenuItem>
  <NoraMenuItem>Wrap in Stack</NoraMenuItem>
  <NoraMenuDivider />
  <NoraMenuItem danger icon={<DeleteIcon />} shortcut={<NoraKbd>⌫</NoraKbd>}>
    Delete
  </NoraMenuItem>
</NoraMenu>`,
      render: () => (
        <NoraMenu>
          <NoraMenuItem
            icon={<CopyIcon />}
            shortcut={
              <>
                <NoraKbd>⌘</NoraKbd>
                <NoraKbd>C</NoraKbd>
              </>
            }
          >
            Copy
          </NoraMenuItem>
          <NoraMenuItem
            active
            icon={<PasteIcon />}
            shortcut={
              <>
                <NoraKbd>⌘</NoraKbd>
                <NoraKbd>V</NoraKbd>
              </>
            }
          >
            Paste
          </NoraMenuItem>
          <NoraMenuItem
            icon={<StackIcon />}
            shortcut={
              <>
                <NoraKbd>⌘</NoraKbd>
                <NoraKbd>D</NoraKbd>
              </>
            }
          >
            Duplicate
          </NoraMenuItem>
          <NoraMenuDivider />
          <NoraMenuItem>Add to Component</NoraMenuItem>
          <NoraMenuItem>Wrap in Stack</NoraMenuItem>
          <NoraMenuDivider />
          <NoraMenuItem
            danger
            icon={<DeleteIcon />}
            shortcut={<NoraKbd>⌫</NoraKbd>}
          >
            Delete
          </NoraMenuItem>
        </NoraMenu>
      ),
    },
    {
      code: `import { NoraAvatar, NoraMenu, NoraMenuDivider, NoraMenuItem, NoraMenuLabel } from "@/components/nora/primitives"

<NoraMenu className="min-w-[240px]">
  <NoraMenuLabel>Workspace</NoraMenuLabel>
  <NoraMenuItem checked icon={<NoraAvatar size="sm">TP</NoraAvatar>}>
    True Points
  </NoraMenuItem>
  <NoraMenuItem
    icon={
      <NoraAvatar size="sm" style={{ background: "linear-gradient(135deg,#ff3366,#ff9900)" }}>
        AC
      </NoraAvatar>
    }
  >
    Acme Corp
  </NoraMenuItem>
  <NoraMenuDivider />
  <NoraMenuItem>Settings…</NoraMenuItem>
  <NoraMenuItem>Log Out</NoraMenuItem>
</NoraMenu>`,
      render: () => (
        <NoraMenu className="min-w-[240px]">
          <NoraMenuLabel>Workspace</NoraMenuLabel>
          <NoraMenuItem checked icon={<NoraAvatar size="sm">TP</NoraAvatar>}>
            True Points
          </NoraMenuItem>
          <NoraMenuItem
            icon={
              <NoraAvatar
                size="sm"
                style={{ background: "linear-gradient(135deg,#ff3366,#ff9900)" }}
              >
                AC
              </NoraAvatar>
            }
          >
            Acme Corp
          </NoraMenuItem>
          <NoraMenuDivider />
          <NoraMenuItem>Settings…</NoraMenuItem>
          <NoraMenuItem>Log Out</NoraMenuItem>
        </NoraMenu>
      ),
    },
  ],
  tabs: [
    {
      code: `import { NoraTabs } from "@/components/nora/primitives"

<NoraTabs
  className="w-[320px]"
  tabs={["General", "Domains", "Redirects", "Plugins"]}
  defaultValue="General"
/>`,
      render: () => (
        <NoraTabs
          className="w-[320px]"
          tabs={["General", "Domains", "Redirects", "Plugins"]}
          defaultValue="General"
        />
      ),
    },
    {
      code: `import { NoraTabs } from "@/components/nora/primitives"

<NoraTabs
  variant="pill"
  tabs={["Pages", "Layers", "Assets"]}
  defaultValue="Pages"
/>`,
      render: () => (
        <NoraTabs
          variant="pill"
          tabs={["Pages", "Layers", "Assets"]}
          defaultValue="Pages"
        />
      ),
    },
  ],
  "list-item": [
    {
      code: `import { NoraList, NoraListItem } from "@/components/nora/primitives"

<NoraList className="w-[220px]">
  <NoraListItem active icon={<HomeIcon />}>Home</NoraListItem>
  <NoraListItem icon={<PageIcon />}>About</NoraListItem>
  <NoraListItem selected icon={<PageIcon />}>Pricing</NoraListItem>
  <NoraListItem icon={<FolderIcon />} suffix={<span className="text-[10px] text-[var(--nora-text-dimmed)]">12</span>}>
    Blog
  </NoraListItem>
  <NoraListItem icon={<SettingsIcon />}>404</NoraListItem>
</NoraList>`,
      render: () => (
        <NoraList className="w-[220px]">
          <NoraListItem active icon={<HomeIcon />}>
            Home
          </NoraListItem>
          <NoraListItem icon={<PageIcon />}>About</NoraListItem>
          <NoraListItem selected icon={<PageIcon />}>
            Pricing
          </NoraListItem>
          <NoraListItem
            icon={<FolderIcon />}
            suffix={
              <span className="text-[10px] text-[var(--nora-text-dimmed)]">12</span>
            }
          >
            Blog
          </NoraListItem>
          <NoraListItem icon={<SettingsIcon />}>404</NoraListItem>
        </NoraList>
      ),
    },
    {
      code: `import { NoraList, NoraListItem } from "@/components/nora/primitives"

<NoraList className="w-[220px]">
  <NoraListItem icon={<GridIcon />}>Hero Section</NoraListItem>
  <NoraListItem selected icon={<TextIcon />} style={{ paddingLeft: 24 }}>
    Heading
  </NoraListItem>
  <NoraListItem icon={<ImageIcon />} style={{ paddingLeft: 24 }}>
    Cover Image
  </NoraListItem>
  <NoraListItem icon={<ComponentIcon />} className="text-[var(--nora-component)]" style={{ paddingLeft: 24 }}>
    Button Component
  </NoraListItem>
</NoraList>`,
      render: () => (
        <NoraList className="w-[220px]">
          <NoraListItem icon={<GridIcon />}>Hero Section</NoraListItem>
          <NoraListItem selected icon={<TextIcon />} style={{ paddingLeft: 24 }}>
            Heading
          </NoraListItem>
          <NoraListItem icon={<ImageIcon />} style={{ paddingLeft: 24 }}>
            Cover Image
          </NoraListItem>
          <NoraListItem
            icon={<ComponentIcon />}
            className="text-[var(--nora-component)]"
            style={{ paddingLeft: 24 }}
          >
            Button Component
          </NoraListItem>
        </NoraList>
      ),
    },
  ],
  "panel-row": [
    {
      code: `import {
  NoraColorWell,
  NoraDivider,
  NoraPanel,
  NoraPanelRow,
  NoraSectionTitle,
  NoraSelect,
  NoraStepper,
  NoraSwitch,
} from "@/components/nora/primitives"

<NoraPanel>
  <NoraSectionTitle>Layout</NoraSectionTitle>
  <NoraPanelRow label="Position">
    <NoraSelect
      defaultValue="relative"
      items={[
        { value: "relative", label: "Relative" },
        { value: "absolute", label: "Absolute" },
      ]}
    />
  </NoraPanelRow>
  <NoraPanelRow label="Size">
    <div className="flex w-full gap-1.5">
      <NoraStepper className="min-w-0 flex-1" defaultValue="375" showButtons={false} />
      <NoraStepper className="min-w-0 flex-1" defaultValue="812" showButtons={false} />
    </div>
  </NoraPanelRow>
  <NoraPanelRow label="Radius">
    <NoraStepper defaultValue="12" />
  </NoraPanelRow>
  <NoraPanelRow label="Visible">
    <NoraSwitch defaultChecked />
  </NoraPanelRow>
  <NoraDivider className="my-2.5" />
  <NoraSectionTitle>Fill</NoraSectionTitle>
  <NoraPanelRow label="Color">
    <NoraColorWell color="#0099ff" label="0099FF" />
  </NoraPanelRow>
</NoraPanel>`,
      render: () => (
        <NoraPanel>
          <NoraSectionTitle>Layout</NoraSectionTitle>
          <NoraPanelRow label="Position">
            <NoraSelect
              defaultValue="relative"
              items={[
                { value: "relative", label: "Relative" },
                { value: "absolute", label: "Absolute" },
              ]}
            />
          </NoraPanelRow>
          <NoraPanelRow label="Size">
            <div className="flex w-full gap-1.5">
              <NoraStepper
                className="min-w-0 flex-1"
                defaultValue="375"
                showButtons={false}
              />
              <NoraStepper
                className="min-w-0 flex-1"
                defaultValue="812"
                showButtons={false}
              />
            </div>
          </NoraPanelRow>
          <NoraPanelRow label="Radius">
            <NoraStepper defaultValue="12" />
          </NoraPanelRow>
          <NoraPanelRow label="Visible">
            <NoraSwitch defaultChecked />
          </NoraPanelRow>
          <NoraDivider className="my-2.5" />
          <NoraSectionTitle>Fill</NoraSectionTitle>
          <NoraPanelRow label="Color">
            <NoraColorWell color="#0099ff" label="0099FF" />
          </NoraPanelRow>
        </NoraPanel>
      ),
    },
  ],
  modal: [
    {
      code: `import { NoraButton, NoraModal } from "@/components/nora/primitives"

<NoraModal
  title="Delete Page?"
  footer={
    <>
      <NoraButton>Cancel</NoraButton>
      <NoraButton variant="destructive">Delete</NoraButton>
    </>
  }
>
  Страница «Pricing» и все её брейкпоинты будут удалены. Это действие нельзя отменить.
</NoraModal>`,
      render: () => (
        <NoraModal
          title="Delete Page?"
          footer={
            <>
              <NoraButton>Cancel</NoraButton>
              <NoraButton variant="destructive">Delete</NoraButton>
            </>
          }
        >
          Страница «Pricing» и все её брейкпоинты будут удалены. Это действие нельзя
          отменить.
        </NoraModal>
      ),
    },
    {
      code: `import { NoraButton, NoraInput, NoraModal, NoraSelect } from "@/components/nora/primitives"

<NoraModal
  title="Add Custom Domain"
  footer={
    <>
      <NoraButton>Cancel</NoraButton>
      <NoraButton variant="primary">Add Domain</NoraButton>
    </>
  }
>
  <div className="flex flex-col gap-2.5">
    <NoraInput placeholder="example.com" />
    <NoraSelect
      defaultValue="primary"
      items={[
        { value: "primary", label: "Primary domain" },
        { value: "redirect", label: "Redirect" },
      ]}
    />
  </div>
</NoraModal>`,
      render: () => (
        <NoraModal
          title="Add Custom Domain"
          footer={
            <>
              <NoraButton>Cancel</NoraButton>
              <NoraButton variant="primary">Add Domain</NoraButton>
            </>
          }
        >
          <div className="flex flex-col gap-2.5">
            <NoraInput placeholder="example.com" />
            <NoraSelect
              defaultValue="primary"
              items={[
                { value: "primary", label: "Primary domain" },
                { value: "redirect", label: "Redirect" },
              ]}
            />
          </div>
        </NoraModal>
      ),
    },
  ],
  toast: [
    {
      code: `import { NoraButton, NoraToast } from "@/components/nora/primitives"

<NoraToast variant="success" action={<NoraButton>Open</NoraButton>}>
  Site published
</NoraToast>
<NoraToast variant="error" action={<NoraButton>Retry</NoraButton>}>
  Failed to save changes
</NoraToast>
<NoraToast>Copied to clipboard</NoraToast>`,
      render: () => (
        <div className="flex flex-wrap items-center gap-2.5">
          <NoraToast variant="success" action={<NoraButton>Open</NoraButton>}>
            Site published
          </NoraToast>
          <NoraToast variant="error" action={<NoraButton>Retry</NoraButton>}>
            Failed to save changes
          </NoraToast>
          <NoraToast>Copied to clipboard</NoraToast>
        </div>
      ),
    },
  ],
  avatar: [
    {
      code: `import { NoraAvatar } from "@/components/nora/primitives"

<NoraAvatar size="sm">A</NoraAvatar>
<NoraAvatar>NK</NoraAvatar>
<NoraAvatar size="lg">TP</NoraAvatar>`,
      render: () => (
        <>
          <NoraAvatar size="sm">A</NoraAvatar>
          <NoraAvatar>NK</NoraAvatar>
          <NoraAvatar size="lg">TP</NoraAvatar>
        </>
      ),
    },
    {
      code: `import { NoraAvatar, NoraAvatarStack } from "@/components/nora/primitives"

<NoraAvatarStack>
  <NoraAvatar>NK</NoraAvatar>
  <NoraAvatar style={{ background: "linear-gradient(135deg,#ff3366,#ff9900)" }}>EV</NoraAvatar>
  <NoraAvatar style={{ background: "linear-gradient(135deg,#4cd963,#0cf)" }}>MD</NoraAvatar>
  <NoraAvatar className="bg-[var(--nora-surface)] text-[var(--nora-text-secondary)]">+3</NoraAvatar>
</NoraAvatarStack>`,
      render: () => (
        <NoraAvatarStack>
          <NoraAvatar>NK</NoraAvatar>
          <NoraAvatar
            style={{ background: "linear-gradient(135deg,#ff3366,#ff9900)" }}
          >
            EV
          </NoraAvatar>
          <NoraAvatar style={{ background: "linear-gradient(135deg,#4cd963,#0cf)" }}>
            MD
          </NoraAvatar>
          <NoraAvatar className="bg-[var(--nora-surface)] text-[var(--nora-text-secondary)]">
            +3
          </NoraAvatar>
        </NoraAvatarStack>
      ),
    },
  ],
  progress: [
    {
      code: `import { NoraProgress } from "@/components/nora/primitives"

<div className="w-[220px]">
  <NoraProgress value={65} />
</div>`,
      render: () => (
        <div className="w-[220px]">
          <NoraProgress value={65} />
        </div>
      ),
    },
    {
      code: `import { NoraSpinner } from "@/components/nora/primitives"

<NoraSpinner />
<span className="text-xs font-medium text-[var(--nora-text-secondary)]">Publishing…</span>`,
      render: () => (
        <>
          <NoraSpinner />
          <span className="text-xs font-medium text-[var(--nora-text-secondary)]">
            Publishing…
          </span>
        </>
      ),
    },
  ],
  breadcrumb: [
    {
      code: `import { NoraBreadcrumb } from "@/components/nora/primitives"

<NoraBreadcrumb
  items={[
    { label: "True Points" },
    { label: "CMS" },
    { label: "Blog Posts" },
    { label: "How to launch", current: true },
  ]}
/>`,
      render: () => (
        <NoraBreadcrumb
          items={[
            { label: "True Points" },
            { label: "CMS" },
            { label: "Blog Posts" },
            { label: "How to launch", current: true },
          ]}
        />
      ),
    },
  ],
  "empty-state": [
    {
      code: `import { NoraButton, NoraEmpty } from "@/components/nora/primitives"

<NoraEmpty
  className="w-[260px]"
  icon={<SearchIcon />}
  title="No results"
  description='Ничего не найдено по запросу «navbar». Попробуйте другой запрос.'
  action={
    <NoraButton variant="tinted" className="mt-1">
      Clear Search
    </NoraButton>
  }
/>`,
      render: () => (
        <NoraEmpty
          className="w-[260px]"
          icon={<SearchIcon />}
          title="No results"
          description="Ничего не найдено по запросу «navbar». Попробуйте другой запрос."
          action={
            <NoraButton variant="tinted" className="mt-1">
              Clear Search
            </NoraButton>
          }
        />
      ),
    },
  ],
  divider: [
    {
      code: `import { NoraDivider } from "@/components/nora/primitives"

<div className="flex w-[260px] flex-col gap-[18px]">
  <NoraDivider />
  <NoraDivider title="Advanced" />
</div>`,
      render: () => (
        <div className="flex w-[260px] flex-col gap-[18px]">
          <NoraDivider />
          <NoraDivider title="Advanced" />
        </div>
      ),
    },
  ],
  collapsible: [
    {
      code: `import { NoraCollapsible } from "@/components/nora/primitives"

<div className="w-[260px]">
  <NoraCollapsible title="Effects" defaultOpen>
    Настройки теней, блюра и трансформаций слоя.
  </NoraCollapsible>
  <NoraCollapsible title="Styles">
    Связанные текстовые и цветовые стили.
  </NoraCollapsible>
  <NoraCollapsible title="Code Overrides">
    Подключение кода к слою.
  </NoraCollapsible>
</div>`,
      render: () => (
        <div className="w-[260px]">
          <NoraCollapsible title="Effects" defaultOpen>
            Настройки теней, блюра и трансформаций слоя.
          </NoraCollapsible>
          <NoraCollapsible title="Styles">
            Связанные текстовые и цветовые стили.
          </NoraCollapsible>
          <NoraCollapsible title="Code Overrides">
            Подключение кода к слою.
          </NoraCollapsible>
        </div>
      ),
    },
  ],
  search: [
    {
      code: `import { NoraSearch } from "@/components/nora/primitives"

<NoraSearch className="w-[240px]" icon={<SearchIcon />} placeholder="Search components…" />`,
      render: () => (
        <NoraSearch
          className="w-[240px]"
          icon={<SearchIcon />}
          placeholder="Search components…"
        />
      ),
    },
  ],
  "color-well": [
    {
      code: `import { NoraColorWell } from "@/components/nora/primitives"

<NoraColorWell color="#0099ff" label="0099FF" />
<NoraColorWell color="#8855ff" label="8855FF" />
<NoraColorWell
  label="Linear"
  chipStyle={{ background: "linear-gradient(135deg,#09f,#8855ff)" }}
/>
<NoraColorWell
  label="None"
  chipStyle={{
    backgroundImage:
      "linear-gradient(45deg,#666 25%,transparent 25%,transparent 75%,#666 75%),linear-gradient(45deg,#666 25%,transparent 25%,transparent 75%,#666 75%)",
    backgroundSize: "8px 8px",
    backgroundPosition: "0 0,4px 4px",
  }}
/>`,
      render: () => (
        <>
          <NoraColorWell color="#0099ff" label="0099FF" />
          <NoraColorWell color="#8855ff" label="8855FF" />
          <NoraColorWell
            label="Linear"
            chipStyle={{ background: "linear-gradient(135deg,#09f,#8855ff)" }}
          />
          <NoraColorWell
            label="None"
            chipStyle={{
              backgroundImage:
                "linear-gradient(45deg,#666 25%,transparent 25%,transparent 75%,#666 75%),linear-gradient(45deg,#666 25%,transparent 25%,transparent 75%,#666 75%)",
              backgroundSize: "8px 8px",
              backgroundPosition: "0 0,4px 4px",
            }}
          />
        </>
      ),
    },
  ],
}

function buildExamples(componentId: string, registryExamples: { title: string; note?: string }[]): DemoExample[] {
  const demos = COMPONENT_DEMOS[componentId]
  if (!demos) {
    throw new Error(`Missing React demos for Nora component: ${componentId}`)
  }
  if (demos.length !== registryExamples.length) {
    throw new Error(
      `Demo count mismatch for ${componentId}: registry=${registryExamples.length}, demos=${demos.length}`
    )
  }
  return registryExamples.map((example, index) => ({
    title: example.title,
    description: example.note,
    code: demos[index].code,
    render: demos[index].render,
  }))
}

/**
 * Доки для 26 оригинальных компонентов Nora DS.
 * Примеры рендерятся через Nora React-примитивы (без HTML-снапшотов).
 */
export const NORA_COMPONENT_DOCS: ComponentDoc[] = NORA_COMPONENT_REGISTRY.map(
  (component) => ({
    id: `nora-${component.id}`,
    examples: buildExamples(component.id, component.examples),
  })
)
