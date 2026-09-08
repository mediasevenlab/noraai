import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"
import {
  CopyIcon,
  FrameIcon,
  KeyboardIcon,
  LayersIcon,
  SettingsIcon,
  ComponentIcon,
} from "lucide-react"

import type { ComponentDoc } from "./types"

function Shortcut({ keys }: { keys: string[] }) {
  return (
    <CommandShortcut>
      {keys.map((k) => (
        <Kbd key={k}>{k}</Kbd>
      ))}
    </CommandShortcut>
  )
}

export const commandDoc: ComponentDoc = {
  id: "command",
  examples: [
    {
      title: "Basic",
      description: "Nora-style command menu with tint selection and kbd chips.",
      code: `import { Command, CommandInput, CommandList, CommandItem } from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"

<Command>
  <CommandInput placeholder="Search…" />
  <CommandList>
    <CommandItem>
      New Frame
      <CommandShortcut><Kbd>⌘</Kbd><Kbd>N</Kbd></CommandShortcut>
    </CommandItem>
  </CommandList>
</Command>`,
      render: () => (
        <Command className="max-w-[320px]">
          <CommandInput placeholder="Search…" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Insert">
              <CommandItem>
                <FrameIcon />
                <span>New Frame</span>
                <Shortcut keys={["⌘", "N"]} />
              </CommandItem>
              <CommandItem>
                <ComponentIcon />
                <span>Insert Component</span>
                <Shortcut keys={["⌘", "K"]} />
              </CommandItem>
              <CommandItem>
                <LayersIcon />
                <span>Add Stack</span>
                <Shortcut keys={["⌘", "⇧", "S"]} />
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Edit">
              <CommandItem>
                <CopyIcon />
                <span>Duplicate</span>
                <Shortcut keys={["⌘", "D"]} />
              </CommandItem>
              <CommandItem>
                <KeyboardIcon />
                <span>Keyboard Shortcuts</span>
                <Shortcut keys={["⌘", "/"]} />
              </CommandItem>
              <CommandItem>
                <SettingsIcon />
                <span>Preferences</span>
                <Shortcut keys={["⌘", ","]} />
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      ),
    },
  ],
}
