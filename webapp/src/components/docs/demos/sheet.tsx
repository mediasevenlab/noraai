import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

import type { ComponentDoc } from "./types"

function SheetBasic({
  side = "right",
}: {
  side?: "top" | "right" | "bottom" | "left"
}) {
  const isEdge = side === "top" || side === "bottom"
  // top/bottom на всю ширину экрана — одна колонка max-w, иначе
  // заголовок уезжает влево, а форма остаётся по центру
  const edgeCol = isEdge ? "mx-auto w-full max-w-[320px]" : undefined

  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        Open {side}
      </SheetTrigger>
      <SheetContent side={side}>
        <SheetHeader className={edgeCol}>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>
            Make changes to your profile here. Click save when you&apos;re done.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className={cn(edgeCol, "grid gap-2.5")}>
          <Field>
            <FieldLabel htmlFor={`sheet-name-${side}`}>Name</FieldLabel>
            <Input id={`sheet-name-${side}`} defaultValue="Pedro Duarte" />
          </Field>
          <Field>
            <FieldLabel htmlFor={`sheet-user-${side}`}>Username</FieldLabel>
            <Input id={`sheet-user-${side}`} defaultValue="@peduarte" />
          </Field>
        </SheetBody>
        <SheetFooter className={cn(edgeCol, isEdge && "sm:justify-end")}>
          <SheetClose render={<Button variant="outline" />}>Cancel</SheetClose>
          <SheetClose render={<Button />}>Save changes</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export const sheetDoc: ComponentDoc = {
  id: "sheet",
  examples: [
    {
      title: "Right (default)",
      description: "Nora modal surface sliding from the right.",
      code: `<Sheet>
  <SheetTrigger render={<Button variant="outline" />}>Open</SheetTrigger>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Edit profile</SheetTitle>
    </SheetHeader>
    <SheetBody>…</SheetBody>
    <SheetFooter>…</SheetFooter>
  </SheetContent>
</Sheet>`,
      render: () => <SheetBasic side="right" />,
    },
    {
      title: "Left",
      description: "Sheet from the left side.",
      code: `<SheetContent side="left">…</SheetContent>`,
      render: () => <SheetBasic side="left" />,
    },
    {
      title: "Top & bottom",
      description: "Content-sized edge sheets — no empty stretch.",
      code: `<SheetContent side="top">…</SheetContent>
<SheetContent side="bottom">…</SheetContent>`,
      render: () => (
        <div className="flex flex-wrap justify-center gap-1.5">
          <SheetBasic side="top" />
          <SheetBasic side="bottom" />
        </div>
      ),
    },
  ],
}
