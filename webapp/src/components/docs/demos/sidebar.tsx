import { HomeIcon, InboxIcon, SettingsIcon } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"

import type { ComponentDoc } from "./types"

const items = [
  { title: "Home", icon: HomeIcon },
  { title: "Inbox", icon: InboxIcon },
  { title: "Settings", icon: SettingsIcon },
]

const panel =
  "min-h-[260px] w-full max-w-[360px] overflow-hidden rounded-[var(--nora-radius-lg,10px)] bg-[var(--nora-panel)] shadow-[inset_0_0_0_1px_var(--nora-border)]"

function SidebarSimple() {
  return (
    <SidebarProvider className={`${panel} min-h-[260px]`}>
      <Sidebar
        collapsible="none"
        className="border-r border-[var(--nora-divider)]"
      >
        <SidebarHeader className="border-b border-[var(--nora-divider)] px-2 py-1.5">
          <div className="flex h-[var(--nora-control-h,30px)] items-center px-2 text-xs font-semibold text-[var(--nora-text)]">
            Acme Inc
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Application</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {items.map((item, i) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton isActive={i === 0}>
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-[var(--nora-divider)] p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="sm">
                <SettingsIcon />
                <span>Preferences</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <main className="flex flex-1 flex-col gap-1.5 bg-[var(--nora-surface)] p-3">
        <SidebarTrigger />
        <p className="text-xs font-medium text-[var(--nora-text-tertiary)]">
          Main content area next to the sidebar.
        </p>
      </main>
    </SidebarProvider>
  )
}

function SidebarMenuItems() {
  return (
    <div className="w-[200px] rounded-[var(--nora-radius-lg,10px)] bg-[var(--nora-panel)] p-1.5 shadow-[inset_0_0_0_1px_var(--nora-border)]">
      <SidebarProvider className="min-h-0 min-w-0">
        <SidebarMenu className="w-full gap-0.5">
          {items.map((item, i) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton isActive={i === 1}>
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarSeparator className="my-1" />
          <SidebarMenuItem>
            <SidebarMenuButton size="sm">
              <SettingsIcon />
              <span>More</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarProvider>
    </div>
  )
}

export const sidebarDoc: ComponentDoc = {
  id: "sidebar",
  examples: [
    {
      title: "Simple sidebar",
      description: "Nora panel — dense menu rows, active state.",
      code: `<SidebarProvider>
  <Sidebar collapsible="none">
    <SidebarHeader>Acme Inc</SidebarHeader>
    <SidebarContent>
      <SidebarMenu>
        <SidebarMenuButton isActive>Home</SidebarMenuButton>
      </SidebarMenu>
    </SidebarContent>
  </Sidebar>
</SidebarProvider>`,
      render: () => <SidebarSimple />,
    },
    {
      title: "Menu items",
      description: "Icon + label — control-height rows.",
      code: `<SidebarMenuButton>
  <InboxIcon />
  <span>Inbox</span>
</SidebarMenuButton>`,
      render: () => <SidebarMenuItems />,
    },
  ],
}
