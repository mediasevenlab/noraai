import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"

import type { ComponentDoc } from "./types"

const frameworks = ["Next.js", "SvelteKit", "Nuxt.js", "Remix", "Astro"]

export const comboboxDoc: ComponentDoc = {
  id: "combobox",
  examples: [
    {
      title: "Basic",
      description: "Autocomplete combobox.",
      code: `import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"`,
      render: () => (
        <Combobox items={frameworks}>
          <ComboboxInput placeholder="Select a framework" className="max-w-xs" />
          <ComboboxContent>
            <ComboboxEmpty>No framework found.</ComboboxEmpty>
            <ComboboxList>
              {(item) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      ),
    },
    {
      title: "With clear",
      description: "Show clear button on the input.",
      code: `<ComboboxInput showClear />`,
      render: () => (
        <Combobox items={frameworks} defaultValue={frameworks[0]}>
          <ComboboxInput
            placeholder="Framework"
            showClear
            className="max-w-xs"
          />
          <ComboboxContent>
            <ComboboxList>
              {(item) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      ),
    },
  ],
}
