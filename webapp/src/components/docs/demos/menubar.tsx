import * as React from "react"

import { Kbd } from "@/components/ui/kbd"
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar"

import type { ComponentDoc } from "./types"

function Shortcut({ keys }: { keys: string[] }) {
  return (
    <MenubarShortcut>
      {keys.map((k) => (
        <Kbd key={k}>{k}</Kbd>
      ))}
    </MenubarShortcut>
  )
}

function MenubarBasic() {
  return (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            New Tab
            <Shortcut keys={["⌘", "T"]} />
          </MenubarItem>
          <MenubarItem>
            New Window
            <Shortcut keys={["⌘", "N"]} />
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Share</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Print</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Edit</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            Undo
            <Shortcut keys={["⌘", "Z"]} />
          </MenubarItem>
          <MenubarItem>
            Redo
            <Shortcut keys={["⇧", "⌘", "Z"]} />
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>View</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Toggle Sidebar</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  )
}

function MenubarCheckboxes() {
  const [showStatusBar, setShowStatusBar] = React.useState(true)
  const [showActivityBar, setShowActivityBar] = React.useState(false)

  return (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>View</MenubarTrigger>
        <MenubarContent>
          <MenubarCheckboxItem
            checked={showStatusBar}
            onCheckedChange={setShowStatusBar}
          >
            Status Bar
          </MenubarCheckboxItem>
          <MenubarCheckboxItem
            checked={showActivityBar}
            onCheckedChange={setShowActivityBar}
          >
            Activity Bar
          </MenubarCheckboxItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  )
}

function MenubarRadioDemo() {
  const [profile, setProfile] = React.useState("benoit")

  return (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>Profiles</MenubarTrigger>
        <MenubarContent>
          <MenubarRadioGroup value={profile} onValueChange={setProfile}>
            <MenubarRadioItem value="andy">Andy</MenubarRadioItem>
            <MenubarRadioItem value="benoit">Benoit</MenubarRadioItem>
            <MenubarRadioItem value="luis">Luis</MenubarRadioItem>
          </MenubarRadioGroup>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  )
}

function MenubarSubmenuDemo() {
  return (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            New File
            <Shortcut keys={["⌘", "N"]} />
          </MenubarItem>
          <MenubarSub>
            <MenubarSubTrigger>Share</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem>Email link</MenubarItem>
              <MenubarItem>Messages</MenubarItem>
              <MenubarSeparator />
              <MenubarItem>More…</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSeparator />
          <MenubarItem variant="destructive">Delete</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  )
}

export const menubarDoc: ComponentDoc = {
  id: "menubar",
  examples: [
    {
      title: "Basic",
      description: "Nora bar + tint menu, kbd shortcuts.",
      code: `<Menubar>
  <MenubarMenu>
    <MenubarTrigger>File</MenubarTrigger>
    <MenubarContent>
      <MenubarItem>New Tab <MenubarShortcut>…</MenubarShortcut></MenubarItem>
    </MenubarContent>
  </MenubarMenu>
</Menubar>`,
      render: () => <MenubarBasic />,
    },
    {
      title: "Checkboxes",
      description: "Toggleable view options.",
      code: `<MenubarCheckboxItem checked={…} onCheckedChange={…}>
  Status Bar
</MenubarCheckboxItem>`,
      render: () => <MenubarCheckboxes />,
    },
    {
      title: "Radio group",
      description: "Single-select profile items.",
      code: `<MenubarRadioGroup value={…} onValueChange={…}>
  <MenubarRadioItem value="andy">Andy</MenubarRadioItem>
</MenubarRadioGroup>`,
      render: () => <MenubarRadioDemo />,
    },
    {
      title: "Submenu",
      description: "Nested share menu + destructive.",
      code: `<MenubarSub>
  <MenubarSubTrigger>Share</MenubarSubTrigger>
  <MenubarSubContent>…</MenubarSubContent>
</MenubarSub>`,
      render: () => <MenubarSubmenuDemo />,
    },
  ],
}
