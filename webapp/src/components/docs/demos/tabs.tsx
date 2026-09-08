import { AppWindowIcon, CodeIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type { ComponentDoc } from "./types"

export const tabsDoc: ComponentDoc = {
  id: "tabs",
  examples: [
    {
      title: "Default",
      description: "Nora segment tabs + card panels (shadcn overview pattern).",
      code: `import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

<Tabs defaultValue="overview" className="w-[400px]">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="analytics">Analytics</TabsTrigger>
    <TabsTrigger value="reports">Reports</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">
    <Card>
      <CardHeader>
        <CardTitle>Overview</CardTitle>
        <CardDescription>
          View your key metrics and recent project activity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        You have 12 active projects and 3 pending tasks.
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>`,
      render: () => (
        <Tabs defaultValue="overview" className="w-full max-w-[400px]">
          <TabsList className="w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
                <CardDescription>
                  View your key metrics and recent project activity. Track
                  progress across all your active projects.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-[var(--nora-text-tertiary)]">
                You have 12 active projects and 3 pending tasks.
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
                <CardDescription>
                  Track performance and user engagement metrics. Monitor trends
                  and identify growth opportunities.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-[var(--nora-text-tertiary)]">
                Page views are up 25% compared to last month.
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Reports</CardTitle>
                <CardDescription>
                  Generate and download your detailed reports. Export data in
                  multiple formats for analysis.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-[var(--nora-text-tertiary)]">
                You have 5 reports ready and available to export.
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription>
                  Manage your account preferences and options. Customize your
                  experience to fit your needs.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-[var(--nora-text-tertiary)]">
                Configure notifications, security, and themes.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ),
    },
    {
      title: "Vertical",
      description: "Vertical orientation with side nav.",
      code: `<Tabs orientation="vertical">…</Tabs>`,
      render: () => (
        <Tabs
          defaultValue="account"
          orientation="vertical"
          className="w-full max-w-lg flex-row"
        >
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          <TabsContent value="account">
            <Card size="sm">
              <CardHeader>
                <CardTitle>Account</CardTitle>
                <CardDescription>
                  Make changes to your account here.
                </CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>
          <TabsContent value="password">
            <Card size="sm">
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>Change your password here.</CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>
          <TabsContent value="notifications">
            <Card size="sm">
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Configure how you receive alerts.
                </CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>
        </Tabs>
      ),
    },
    {
      title: "Disabled",
      description: "Disabled trigger state.",
      code: `<TabsTrigger value="settings" disabled>Disabled</TabsTrigger>`,
      render: () => (
        <Tabs defaultValue="home">
          <TabsList>
            <TabsTrigger value="home">Home</TabsTrigger>
            <TabsTrigger value="settings" disabled>
              Disabled
            </TabsTrigger>
          </TabsList>
        </Tabs>
      ),
    },
    {
      title: "Icons",
      description: "Triggers with lucide icons.",
      code: `<TabsTrigger value="preview">
  <AppWindowIcon />
  Preview
</TabsTrigger>`,
      render: () => (
        <Tabs defaultValue="preview">
          <TabsList>
            <TabsTrigger value="preview">
              <AppWindowIcon />
              Preview
            </TabsTrigger>
            <TabsTrigger value="code">
              <CodeIcon />
              Code
            </TabsTrigger>
          </TabsList>
          <TabsContent value="preview" className="pt-1">
            Live preview of the component.
          </TabsContent>
          <TabsContent value="code" className="pt-1">
            Source code for this example.
          </TabsContent>
        </Tabs>
      ),
    },
  ],
}
