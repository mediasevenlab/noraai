import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

import type { ComponentDoc } from "./types"

const panelShell =
  "overflow-hidden rounded-[var(--nora-radius-lg,10px)] bg-[var(--nora-panel)] shadow-[inset_0_0_0_1px_var(--nora-border)]"

const panelLabel =
  "flex h-full items-center justify-center p-3 text-xs font-medium text-[var(--nora-text)]"

function ResizableHorizontal() {
  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className={`min-h-[180px] w-full max-w-[320px] ${panelShell}`}
    >
      <ResizablePanel defaultSize={50}>
        <div className={panelLabel}>One</div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50}>
        <div className={`${panelLabel} bg-[var(--nora-surface)]`}>Two</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

function ResizableVertical() {
  return (
    <ResizablePanelGroup
      orientation="vertical"
      className={`min-h-[220px] w-full max-w-[320px] ${panelShell}`}
    >
      <ResizablePanel defaultSize={35}>
        <div className={`${panelLabel} bg-[var(--nora-surface)]`}>Header</div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={65}>
        <div className={panelLabel}>Content</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

function ResizableNested() {
  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className={`min-h-[220px] w-full max-w-[360px] ${panelShell}`}
    >
      <ResizablePanel defaultSize={30}>
        <div className={`${panelLabel} bg-[var(--nora-surface)]`}>Sidebar</div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={70}>
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel defaultSize={40}>
            <div className={panelLabel}>Editor</div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={60}>
            <div className={`${panelLabel} bg-[var(--nora-surface)]`}>
              Preview
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

export const resizableDoc: ComponentDoc = {
  id: "resizable",
  examples: [
    {
      title: "Horizontal",
      description: "Side-by-side panels — Nora divider handle.",
      code: `<ResizablePanelGroup orientation="horizontal">
  <ResizablePanel>One</ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel>Two</ResizablePanel>
</ResizablePanelGroup>`,
      render: () => <ResizableHorizontal />,
    },
    {
      title: "Vertical",
      description: "Stacked resizable panels.",
      code: `<ResizablePanelGroup orientation="vertical">…</ResizablePanelGroup>`,
      render: () => <ResizableVertical />,
    },
    {
      title: "Nested",
      description: "Sidebar + editor / preview split.",
      code: `<ResizablePanelGroup orientation="horizontal">
  <ResizablePanel>Sidebar</ResizablePanel>
  <ResizableHandle />
  <ResizablePanel>
    <ResizablePanelGroup orientation="vertical">…</ResizablePanelGroup>
  </ResizablePanel>
</ResizablePanelGroup>`,
      render: () => <ResizableNested />,
    },
  ],
}
