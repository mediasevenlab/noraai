import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { ComponentDoc } from "./types"

function SelectGroups() {
  return (
    <Select defaultValue="banana">
      <SelectTrigger className="w-[200px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Fruits</SelectLabel>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Vegetables</SelectLabel>
          <SelectItem value="carrot">Carrot</SelectItem>
          <SelectItem value="broccoli">Broccoli</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

function SelectSizes() {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Select defaultValue="apple">
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="orange">Orange</SelectItem>
        </SelectContent>
      </Select>
      <Select defaultValue="apple">
        <SelectTrigger size="sm" className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="orange">Orange</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

function SelectWithLabel() {
  return (
    <Field className="w-[180px]">
      <FieldLabel htmlFor="select-fruit">Fruit</FieldLabel>
      <Select defaultValue="apple">
        <SelectTrigger id="select-fruit" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
          <SelectItem value="orange">Orange</SelectItem>
        </SelectContent>
      </Select>
    </Field>
  )
}

function SelectDisabled() {
  return (
    <Select disabled defaultValue="apple">
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
      </SelectContent>
    </Select>
  )
}

const timezones = [
  "Pacific Standard Time",
  "Mountain Standard Time",
  "Central Standard Time",
  "Eastern Standard Time",
  "Atlantic Standard Time",
  "Greenwich Mean Time",
  "Central European Time",
  "Eastern European Time",
  "India Standard Time",
  "China Standard Time",
  "Japan Standard Time",
  "Australia Eastern Time",
]

function SelectScrollable() {
  return (
    <Select>
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Timezone" />
      </SelectTrigger>
      <SelectContent>
        {timezones.map((tz) => (
          <SelectItem key={tz} value={tz}>
            {tz}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export const selectDoc: ComponentDoc = {
  id: "select",
  examples: [
    {
      title: "Groups",
      description: "Grouped options with labels.",
      code: `<SelectGroup>
  <SelectLabel>Fruits</SelectLabel>
  <SelectItem value="apple">Apple</SelectItem>
</SelectGroup>`,
      render: () => <SelectGroups />,
    },
    {
      title: "Sizes",
      description: "Default and sm trigger sizes.",
      code: `<SelectTrigger size="sm">…</SelectTrigger>`,
      render: () => <SelectSizes />,
    },
    {
      title: "With label",
      description: "Field + Select density.",
      code: `<Field>
  <FieldLabel>Fruit</FieldLabel>
  <Select>…</Select>
</Field>`,
      render: () => <SelectWithLabel />,
    },
    {
      title: "Disabled",
      description: "Disabled trigger state.",
      code: `<Select disabled defaultValue="apple">…</Select>`,
      render: () => <SelectDisabled />,
    },
    {
      title: "Scrollable",
      description: "Long list with scroll arrows.",
      code: `<SelectContent>
  {items.map(…)}
</SelectContent>`,
      render: () => <SelectScrollable />,
    },
  ],
}
