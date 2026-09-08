import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import type { ComponentDoc } from "./types"

export const dialogDoc: ComponentDoc = {
  id: "dialog",
  examples: [
    {
      title: "Basic",
      description: "Nora modal: 340px, header / body / footer.",
      code: `import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export function DialogDemo() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Open Dialog
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Custom Domain</DialogTitle>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-2.5 pb-0">
          <DialogDescription>
            Connect a domain you already own.
          </DialogDescription>
          <Input placeholder="example.com" />
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <DialogClose render={<Button />}>Add Domain</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}`,
      render: () => (
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>
            Open Dialog
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Domain</DialogTitle>
            </DialogHeader>
            <DialogBody className="flex flex-col gap-2.5 pb-0">
              <DialogDescription>
                Connect a domain you already own.
              </DialogDescription>
              <div className="grid gap-1.5">
                <Label htmlFor="dialog-domain">Domain</Label>
                <Input id="dialog-domain" placeholder="example.com" />
              </div>
            </DialogBody>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <DialogClose render={<Button />}>Add Domain</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ),
    },
    {
      title: "Without close button",
      description: "Confirm destructive action — Nora Delete Page pattern.",
      code: `<DialogContent showCloseButton={false}>...</DialogContent>`,
      render: () => (
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>
            Delete Page
          </DialogTrigger>
          <DialogContent showCloseButton={false}>
            <DialogHeader className="pr-[15px]">
              <DialogTitle>Delete Page?</DialogTitle>
            </DialogHeader>
            <DialogBody className="pb-0">
              <DialogDescription>
                Page “Pricing” and all its breakpoints will be deleted. This
                action cannot be undone.
              </DialogDescription>
            </DialogBody>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <DialogClose render={<Button variant="destructive" />}>
                Delete
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ),
    },
  ],
}
