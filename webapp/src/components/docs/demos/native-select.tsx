import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { ComponentDoc } from "./types"

/**
 * Бывший Native Select: в Nora UI нативные <select> не используются.
 * Демо — shadcn Select на Nora-токенах.
 */

export const nativeSelectDoc: ComponentDoc = {
  id: "native-select",
  examples: [
    {
      title: "Basic",
      description: "Use Select instead of native <select>.",
      code: `import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

<Select defaultValue="apple">
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Fruit" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="apple">Apple</SelectItem>
  </SelectContent>
</Select>`,
      render: () => (
        <Select defaultValue="apple">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Fruit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
            <SelectItem value="blueberry">Blueberry</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      title: "Groups & size",
      description: "Opt groups via SelectGroup + sm trigger.",
      code: `<SelectGroup>
  <SelectLabel>Fruits</SelectLabel>
  <SelectItem value="apple">Apple</SelectItem>
</SelectGroup>`,
      render: () => (
        <div className="flex flex-wrap items-center gap-2.5">
          <Select defaultValue="carrot">
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Fruits</SelectLabel>
                <SelectItem value="apple">Apple</SelectItem>
                <SelectItem value="banana">Banana</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Vegetables</SelectLabel>
                <SelectItem value="carrot">Carrot</SelectItem>
                <SelectItem value="broccoli">Broccoli</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select defaultValue="sm">
            <SelectTrigger size="sm" className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Small</SelectItem>
              <SelectItem value="md">Medium</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ),
    },
    {
      title: "With label",
      description: "Field + Select — Nora label density.",
      code: `<Field className="w-[180px]">
  <FieldLabel>Fruit</FieldLabel>
  <Select>…</Select>
</Field>`,
      render: () => (
        <Field className="w-[180px]">
          <FieldLabel htmlFor="native-select-fruit">Fruit</FieldLabel>
          <Select defaultValue="banana">
            <SelectTrigger id="native-select-fruit" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="apple">Apple</SelectItem>
              <SelectItem value="banana">Banana</SelectItem>
              <SelectItem value="orange">Orange</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      ),
    },
    {
      title: "Disabled",
      description: "Disabled trigger state.",
      code: `<Select disabled defaultValue="apple">…</Select>`,
      render: () => (
        <Select disabled defaultValue="apple">
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
  ],
}
