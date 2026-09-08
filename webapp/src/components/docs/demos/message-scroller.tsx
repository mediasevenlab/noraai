import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Marker, MarkerContent } from "@/components/ui/marker"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "@/components/ui/message"
import { ScrollArea } from "@/components/ui/scroll-area"

import type { ComponentDoc } from "./types"

const thread = [
  { who: "Alex", text: "Can you push the latest screens?", align: "start" as const },
  { who: "You", text: "Uploading now — give me a minute.", align: "end" as const },
  { who: "Alex", text: "Perfect, thanks!", align: "start" as const },
  { who: "You", text: "Also updated the empty states.", align: "end" as const },
  { who: "Alex", text: "Looks great in dark mode too.", align: "start" as const },
  { who: "You", text: "Shipping to staging next.", align: "end" as const },
  { who: "Alex", text: "I'll QA after lunch.", align: "start" as const },
  { who: "You", text: "Ping me if anything breaks.", align: "end" as const },
]

const panel =
  "w-full max-w-[320px] overflow-hidden rounded-[var(--nora-radius-lg,10px)] bg-[var(--nora-panel)] shadow-[inset_0_0_0_1px_var(--nora-border)]"

function MessageScrollerThread() {
  return (
    <ScrollArea className={`h-72 ${panel}`}>
      <MessageGroup className="gap-2 p-3">
        {thread.map((msg, i) => (
          <Message key={i} align={msg.align}>
            <MessageAvatar>
              <Avatar size="sm">
                {msg.align === "start" ? (
                  <AvatarImage
                    src="https://github.com/shadcn.png"
                    alt={msg.who}
                  />
                ) : null}
                <AvatarFallback>
                  {msg.who.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </MessageAvatar>
            <MessageContent>
              <MessageHeader>{msg.who}</MessageHeader>
              <Bubble variant={msg.align === "end" ? "default" : "muted"}>
                <BubbleContent>{msg.text}</BubbleContent>
              </Bubble>
            </MessageContent>
          </Message>
        ))}
      </MessageGroup>
    </ScrollArea>
  )
}

function MessageScrollerComposer() {
  return (
    <div className={`flex flex-col ${panel}`}>
      <ScrollArea className="h-52">
        <MessageGroup className="gap-1.5 p-3">
          {thread.slice(0, 4).map((msg, i) => (
            <Message key={i} align={msg.align}>
              <MessageContent>
                <Bubble variant={msg.align === "end" ? "default" : "muted"}>
                  <BubbleContent>{msg.text}</BubbleContent>
                </Bubble>
              </MessageContent>
            </Message>
          ))}
        </MessageGroup>
      </ScrollArea>
      <div className="flex items-center gap-1.5 border-t border-[var(--nora-divider)] bg-[var(--nora-surface)] px-2 py-1.5">
        <Input
          placeholder="Write a message…"
          className="min-w-0 flex-1"
          aria-label="Message"
        />
        <Button type="button" size="sm">
          Send
        </Button>
      </div>
    </div>
  )
}

function MessageScrollerWithMarkers() {
  return (
    <ScrollArea className={`h-64 ${panel}`}>
      <MessageGroup className="gap-2 p-3">
        <Marker variant="separator">
          <MarkerContent>Yesterday</MarkerContent>
        </Marker>
        <Message>
          <MessageAvatar>
            <Avatar size="sm">
              <AvatarImage src="https://github.com/shadcn.png" alt="Alex" />
              <AvatarFallback>AL</AvatarFallback>
            </Avatar>
          </MessageAvatar>
          <MessageContent>
            <MessageHeader>Alex</MessageHeader>
            <Bubble variant="muted">
              <BubbleContent>Pushed the latest screens.</BubbleContent>
            </Bubble>
            <MessageFooter>6:40 PM</MessageFooter>
          </MessageContent>
        </Message>
        <Marker variant="separator">
          <MarkerContent>Today</MarkerContent>
        </Marker>
        <Message align="end">
          <MessageContent>
            <Bubble>
              <BubbleContent>Looks good — shipping next.</BubbleContent>
            </Bubble>
            <MessageFooter>9:05 AM</MessageFooter>
          </MessageContent>
        </Message>
        <Message>
          <MessageAvatar>
            <Avatar size="sm">
              <AvatarFallback>AL</AvatarFallback>
            </Avatar>
          </MessageAvatar>
          <MessageContent>
            <MessageHeader>Alex</MessageHeader>
            <Bubble variant="muted">
              <BubbleContent>I'll QA after lunch.</BubbleContent>
            </Bubble>
            <MessageFooter>9:12 AM</MessageFooter>
          </MessageContent>
        </Message>
      </MessageGroup>
    </ScrollArea>
  )
}

export const messageScrollerDoc: ComponentDoc = {
  id: "message-scroller",
  examples: [
    {
      title: "Scrollable thread",
      description: "Message + ScrollArea — Nora panel chrome.",
      code: `<ScrollArea className="h-72 …">
  <MessageGroup>…</MessageGroup>
</ScrollArea>`,
      render: () => <MessageScrollerThread />,
    },
    {
      title: "Sticky composer",
      description: "Scroller with Input + Send footer.",
      code: `<div className="flex flex-col">
  <ScrollArea>…</ScrollArea>
  <div>composer</div>
</div>`,
      render: () => <MessageScrollerComposer />,
    },
    {
      title: "With markers",
      description: "Date separators inside the scrollable thread.",
      code: `<Marker variant="separator">
  <MarkerContent>Today</MarkerContent>
</Marker>`,
      render: () => <MessageScrollerWithMarkers />,
    },
  ],
}
