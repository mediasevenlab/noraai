import {
  AlignCenterHorizontalIcon,
  AlignEndHorizontalIcon,
  AlignStartHorizontalIcon,
} from "@/components/icons"

import { NoraIcon } from "@/components/nora-icon"
import {
  ColorWell,
  NumberStepper,
  PropertyRow,
  SegmentedControl,
} from "@/components/nora/property-controls"
import { NORA_ICONS } from "@/lib/nora-icons"

import type { ComponentDoc } from "./types"

export const NoraIconDoc: ComponentDoc = {
  id: "nora-icon",
  examples: [
    {
      title: "Каталог",
      description: `Иконки из оригинального UI Nora (${NORA_ICONS.length} шт). Полный каталог с поиском — в разделе «Иконки» дизайн-системы.`,
      code: `import { NoraIcon } from "@/components/nora-icon"

// id — из каталога /ds/icons
<NoraIcon icon="c9c416b5e2db" className="size-5" />`,
      render: () => (
        <div className="grid w-full max-w-xl grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-12">
          {NORA_ICONS.slice(0, 24).map((icon) => (
            <div
              key={icon.id}
              className="flex aspect-square items-center justify-center rounded-lg border bg-card"
              title={icon.id}
            >
              <NoraIcon icon={icon.id} className="size-5" />
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Цвет и размер",
      description: "Иконки наследуют currentColor, размер задаётся утилитами size-*.",
      code: `<NoraIcon icon="c9c416b5e2db" className="size-4 text-primary" />
<NoraIcon icon="c9c416b5e2db" className="size-6 text-destructive" />
<NoraIcon icon="c9c416b5e2db" className="size-8 text-muted-foreground" />`,
      render: () => (
        <div className="flex h-10 items-center justify-center gap-4">
          <NoraIcon icon="c9c416b5e2db" className="size-4 text-primary" />
          <NoraIcon icon="c9c416b5e2db" className="size-6 text-destructive" />
          <NoraIcon icon="c9c416b5e2db" className="size-8 text-muted-foreground" />
        </div>
      ),
    },
  ],
}

export const propertyRowDoc: ComponentDoc = {
  id: "property-row",
  examples: [
    {
      title: "Панель свойств",
      description: "Строки «лейбл + контрол», из которых собираются панели редактора Nora.",
      code: `import {
  ColorWell,
  NumberStepper,
  PropertyRow,
  SegmentedControl,
} from "@/components/nora/property-controls"

<PropertyRow label="Opacity">
  <NumberStepper defaultValue={100} unit="%" />
</PropertyRow>
<PropertyRow label="Fill">
  <ColorWell defaultValue="#0099FF" />
</PropertyRow>`,
      render: () => (
        <div className="w-full max-w-[280px] space-y-1 rounded-xl border bg-sidebar p-3">
          <PropertyRow label="Position">
            <SegmentedControl
              options={[
                { value: "rel", label: "Relative" },
                { value: "abs", label: "Absolute" },
              ]}
            />
          </PropertyRow>
          <PropertyRow label="Opacity">
            <NumberStepper defaultValue={100} unit="%" />
          </PropertyRow>
          <PropertyRow label="Radius">
            <NumberStepper defaultValue={8} />
          </PropertyRow>
          <PropertyRow label="Fill">
            <ColorWell defaultValue="#0099FF" />
          </PropertyRow>
        </div>
      ),
    },
  ],
}

export const colorWellDoc: ComponentDoc = {
  id: "color-well",
  examples: [
    {
      title: "Базовый",
      description: "Свотч открывает нативный пикер, hex и alpha редактируются с клавиатуры.",
      code: `import { ColorWell } from "@/components/nora/property-controls"

<ColorWell defaultValue="#0099FF" defaultAlpha={100} />`,
      render: () => (
        <div className="w-full max-w-[200px] space-y-2">
          <ColorWell defaultValue="#0099FF" />
          <ColorWell defaultValue="#8855FF" defaultAlpha={80} />
          <ColorWell defaultValue="#FF3366" defaultAlpha={40} />
        </div>
      ),
    },
  ],
}

export const segmentedControlDoc: ComponentDoc = {
  id: "segmented-control",
  examples: [
    {
      title: "Текстовые сегменты",
      code: `import { SegmentedControl } from "@/components/nora/property-controls"

<SegmentedControl
  options={[
    { value: "fixed", label: "Fixed" },
    { value: "relative", label: "Relative" },
    { value: "fill", label: "Fill" },
  ]}
/>`,
      render: () => (
        <div className="w-full max-w-[240px]">
          <SegmentedControl
            options={[
              { value: "fixed", label: "Fixed" },
              { value: "relative", label: "Relative" },
              { value: "fill", label: "Fill" },
            ]}
          />
        </div>
      ),
    },
    {
      title: "Иконки",
      description: "Сегменты с иконками — выравнивание, как в панели Nora.",
      code: `<SegmentedControl
  options={[
    { value: "start", label: <AlignStartHorizontalIcon className="size-3.5" /> },
    { value: "center", label: <AlignCenterHorizontalIcon className="size-3.5" /> },
    { value: "end", label: <AlignEndHorizontalIcon className="size-3.5" /> },
  ]}
/>`,
      render: () => (
        <div className="w-full max-w-[160px]">
          <SegmentedControl
            defaultValue="center"
            options={[
              { value: "start", label: <AlignStartHorizontalIcon className="size-3.5" /> },
              { value: "center", label: <AlignCenterHorizontalIcon className="size-3.5" /> },
              { value: "end", label: <AlignEndHorizontalIcon className="size-3.5" /> },
            ]}
          />
        </div>
      ),
    },
  ],
}

export const numberStepperDoc: ComponentDoc = {
  id: "number-stepper",
  examples: [
    {
      title: "Размеры и единицы",
      description: "Стрелки появляются при наведении — как в инпутах панелей Nora.",
      code: `import { NumberStepper } from "@/components/nora/property-controls"

<NumberStepper defaultValue={1200} />
<NumberStepper defaultValue={100} unit="%" />
<NumberStepper defaultValue={16} unit="px" />`,
      render: () => (
        <div className="grid w-full max-w-[240px] grid-cols-2 gap-2">
          <NumberStepper defaultValue={1200} />
          <NumberStepper defaultValue={100} unit="%" />
          <NumberStepper defaultValue={16} unit="px" />
          <NumberStepper defaultValue={0.5} step={0.1} unit="s" />
        </div>
      ),
    },
  ],
}
