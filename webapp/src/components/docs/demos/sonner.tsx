import { toast } from "@/components/ui/toast"

import { Button } from "@/components/ui/button"

import type { ComponentDoc } from "./types"

export const sonnerDoc: ComponentDoc = {
  id: "sonner",
  examples: [
    {
      title: "Toast types",
      description: "Nora toast surface — default, success, info, warning, error, loading.",
      code: `import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"

export function SonnerDemo() {
  return (
    <>
      <Toaster />
      <Button variant="outline" onClick={() => toast("Event created")}>
        Default
      </Button>
    </>
  )
}`,
      render: () => (
        <div className="flex flex-wrap justify-center gap-1.5">
          <Button variant="outline" onClick={() => toast("Event created")}>
            Default
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.success("Saved successfully")}
          >
            Success
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.info("New update available")}
          >
            Info
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.warning("Storage almost full")}
          >
            Warning
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.error("Something went wrong")}
          >
            Error
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const id = toast.loading("Uploading…")
              setTimeout(() => toast.success("Upload complete", { id }), 1500)
            }}
          >
            Loading
          </Button>
        </div>
      ),
    },
    {
      title: "With action",
      description: "Action chip uses --nora-toast-action-* tokens.",
      code: `toast("Event created", {
  description: "Monday, January 1st at 9:00 AM",
  action: { label: "Undo", onClick: () => {} },
})`,
      render: () => (
        <div className="flex justify-center">
          <Button
            onClick={() =>
              toast("Event created", {
                description: "Monday, January 1st at 9:00 AM",
                action: {
                  label: "Undo",
                  onClick: () => toast.message("Undone"),
                },
              })
            }
          >
            Show toast
          </Button>
        </div>
      ),
    },
    {
      title: "Promise",
      description: "Loading → success/error from a promise.",
      code: `toast.promise(save(), {
  loading: "Saving…",
  success: "Saved",
  error: "Failed",
})`,
      render: () => (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() =>
              toast.promise(
                new Promise<string>((resolve) =>
                  setTimeout(() => resolve("ok"), 1400)
                ),
                {
                  loading: "Saving…",
                  success: "Saved",
                  error: "Failed",
                }
              )
            }
          >
            Save
          </Button>
        </div>
      ),
    },
    {
      title: "Description only",
      description: "Title + muted secondary line.",
      code: `toast("Invite sent", {
  description: "Alex will get an email shortly.",
})`,
      render: () => (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() =>
              toast("Invite sent", {
                description: "Alex will get an email shortly.",
              })
            }
          >
            Notify
          </Button>
        </div>
      ),
    },
  ],
}
