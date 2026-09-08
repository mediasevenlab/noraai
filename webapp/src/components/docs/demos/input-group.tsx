import * as React from "react"
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  CreditCardIcon,
  LoaderIcon,
  MailIcon,
  MoreHorizontalIcon,
  SearchIcon,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import { Spinner } from "@/components/ui/spinner"

import type { ComponentDoc } from "./types"

const w = "w-[280px]"

function InputGroupIcons() {
  return (
    <div className={`flex ${w} flex-col gap-2.5`}>
      <InputGroup>
        <InputGroupInput placeholder="Search…" />
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput type="email" placeholder="Enter your email" />
        <InputGroupAddon>
          <MailIcon />
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="Card number" />
        <InputGroupAddon>
          <CreditCardIcon />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <CheckIcon className="text-[var(--nora-success)]" />
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

function InputGroupTextDemo() {
  return (
    <div className={`flex ${w} flex-col gap-2.5`}>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>$</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput placeholder="0.00" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>USD</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput placeholder="example.com" className="pl-0.5!" />
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="username" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>@company.com</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupTextarea
          placeholder="Enter your message"
          className="min-h-[72px]"
        />
        <InputGroupAddon align="block-end">
          <InputGroupText>120 characters left</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

function InputGroupButtonDemo() {
  const [copied, setCopied] = React.useState(false)

  return (
    <div className={`flex ${w} flex-col gap-2.5`}>
      <InputGroup>
        <InputGroupInput
          defaultValue="https://example.com"
          readOnly
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            aria-label="Copy"
            size="icon-xs"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText("https://example.com")
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1500)
              } catch {
                setCopied(false)
              }
            }}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="Type to search…" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton variant="secondary">Search</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

function InputGroupKbdDemo() {
  return (
    <InputGroup className={w}>
      <InputGroupInput placeholder="Search…" />
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </InputGroupAddon>
    </InputGroup>
  )
}

function InputGroupDropdownDemo() {
  return (
    <div className={`flex ${w} flex-col gap-2.5`}>
      <InputGroup>
        <InputGroupInput placeholder="Enter file name" />
        <InputGroupAddon align="inline-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <InputGroupButton
                  variant="ghost"
                  aria-label="More"
                  size="icon-xs"
                />
              }
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6}>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Copy path</DropdownMenuItem>
              <DropdownMenuItem>Open location</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="Enter search query" />
        <InputGroupAddon align="inline-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <InputGroupButton variant="ghost" className="gap-1 pr-1.5!" />
              }
            >
              Search In…
              <ChevronDownIcon className="size-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6}>
              <DropdownMenuItem>Documentation</DropdownMenuItem>
              <DropdownMenuItem>Blog Posts</DropdownMenuItem>
              <DropdownMenuItem>Changelog</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

function InputGroupSpinnerDemo() {
  return (
    <div className={`flex ${w} flex-col gap-2.5`}>
      <InputGroup>
        <InputGroupInput placeholder="Searching…" disabled />
        <InputGroupAddon align="inline-end">
          <Spinner className="size-3.5" />
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="Processing…" disabled />
        <InputGroupAddon align="inline-end">
          <InputGroupText>
            <LoaderIcon className="size-3.5 animate-spin" />
            Please wait…
          </InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

function InputGroupTextareaDemo() {
  return (
    <InputGroup className={w}>
      <InputGroupTextarea
        placeholder="Write a comment…"
        className="min-h-[80px]"
      />
    </InputGroup>
  )
}

export const inputGroupDoc: ComponentDoc = {
  id: "input-group",
  examples: [
    {
      title: "Icon",
      description: "Leading / trailing icons — Nora search density.",
      code: `<InputGroup>
  <InputGroupInput placeholder="Search…" />
  <InputGroupAddon><SearchIcon /></InputGroupAddon>
</InputGroup>`,
      render: () => <InputGroupIcons />,
    },
    {
      title: "Text",
      description: "Prefix / suffix text and block-end hint.",
      code: `<InputGroup>
  <InputGroupAddon><InputGroupText>$</InputGroupText></InputGroupAddon>
  <InputGroupInput placeholder="0.00" />
  <InputGroupAddon align="inline-end"><InputGroupText>USD</InputGroupText></InputGroupAddon>
</InputGroup>`,
      render: () => <InputGroupTextDemo />,
    },
    {
      title: "Button",
      description: "Inline-end actions (copy, search).",
      code: `<InputGroup>
  <InputGroupInput />
  <InputGroupAddon align="inline-end">
    <InputGroupButton>Search</InputGroupButton>
  </InputGroupAddon>
</InputGroup>`,
      render: () => <InputGroupButtonDemo />,
    },
    {
      title: "Kbd",
      description: "Keyboard shortcut chips.",
      code: `<InputGroupAddon align="inline-end">
  <Kbd>⌘</Kbd><Kbd>K</Kbd>
</InputGroupAddon>`,
      render: () => <InputGroupKbdDemo />,
    },
    {
      title: "Dropdown",
      description: "Menu trigger inside the group.",
      code: `<InputGroupAddon align="inline-end">
  <DropdownMenu>…</DropdownMenu>
</InputGroupAddon>`,
      render: () => <InputGroupDropdownDemo />,
    },
    {
      title: "Spinner",
      description: "Loading state in the addon.",
      code: `<InputGroupAddon align="inline-end">
  <Spinner />
</InputGroupAddon>`,
      render: () => <InputGroupSpinnerDemo />,
    },
    {
      title: "Textarea",
      description: "Multiline control in the same surface.",
      code: `<InputGroup>
  <InputGroupTextarea placeholder="Write a comment…" />
</InputGroup>`,
      render: () => <InputGroupTextareaDemo />,
    },
  ],
}
