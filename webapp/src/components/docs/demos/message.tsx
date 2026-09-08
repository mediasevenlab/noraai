import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Bubble, BubbleContent, BubbleGroup } from "@/components/ui/bubble"
import { Marker, MarkerContent } from "@/components/ui/marker"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "@/components/ui/message"

import type { ComponentDoc } from "./types"

const w = "w-full max-w-[320px]"

function MessageConversation() {
  return (
    <MessageGroup className={w}>
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
            <BubbleContent>Hey — can you review the PR?</BubbleContent>
          </Bubble>
          <MessageFooter>2:14 PM</MessageFooter>
        </MessageContent>
      </Message>
      <Message align="end">
        <MessageAvatar>
          <Avatar size="sm">
            <AvatarFallback>YO</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <MessageHeader>You</MessageHeader>
          <Bubble>
            <BubbleContent>On it. Will leave comments soon.</BubbleContent>
          </Bubble>
          <MessageFooter>2:15 PM</MessageFooter>
        </MessageContent>
      </Message>
    </MessageGroup>
  )
}

function MessageEndAligned() {
  return (
    <Message align="end" className={w}>
      <MessageAvatar>
        <Avatar size="sm">
          <AvatarFallback>YO</AvatarFallback>
        </Avatar>
      </MessageAvatar>
      <MessageContent>
        <Bubble>
          <BubbleContent>Sent from the end alignment.</BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  )
}

function MessageWithMarker() {
  return (
    <MessageGroup className={w}>
      <Marker variant="separator">
        <MarkerContent>Today</MarkerContent>
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
            <BubbleContent>Morning — any updates on shipping?</BubbleContent>
          </Bubble>
          <MessageFooter>9:02 AM</MessageFooter>
        </MessageContent>
      </Message>
      <Message align="end">
        <MessageContent>
          <Bubble>
            <BubbleContent>Staging is green. Cutting a build.</BubbleContent>
          </Bubble>
          <MessageFooter>9:05 AM</MessageFooter>
        </MessageContent>
      </Message>
    </MessageGroup>
  )
}

function MessageBubbleStack() {
  return (
    <MessageGroup className={w}>
      <Message>
        <MessageAvatar>
          <Avatar size="sm">
            <AvatarFallback>AL</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <MessageHeader>Alex</MessageHeader>
          <BubbleGroup>
            <Bubble variant="muted">
              <BubbleContent>Here’s the first note.</BubbleContent>
            </Bubble>
            <Bubble variant="muted">
              <BubbleContent>And a quick follow-up.</BubbleContent>
            </Bubble>
          </BubbleGroup>
          <MessageFooter>2:18 PM</MessageFooter>
        </MessageContent>
      </Message>
    </MessageGroup>
  )
}

function MessageGhost() {
  return (
    <MessageGroup className={w}>
      <Message>
        <MessageContent>
          <Bubble variant="ghost">
            <BubbleContent>
              Plain text message — no bubble chrome.
            </BubbleContent>
          </Bubble>
          <MessageFooter>Just now</MessageFooter>
        </MessageContent>
      </Message>
    </MessageGroup>
  )
}

export const messageDoc: ComponentDoc = {
  id: "message",
  examples: [
    {
      title: "Conversation",
      description: "Avatars, headers, Nora bubbles, timestamps.",
      code: `<MessageGroup>
  <Message>
    <MessageAvatar>…</MessageAvatar>
    <MessageContent>
      <MessageHeader>Alex</MessageHeader>
      <Bubble variant="muted"><BubbleContent>…</BubbleContent></Bubble>
      <MessageFooter>2:14 PM</MessageFooter>
    </MessageContent>
  </Message>
</MessageGroup>`,
      render: () => <MessageConversation />,
    },
    {
      title: "End aligned",
      description: "User-side messages with flex-row-reverse.",
      code: `<Message align="end">…</Message>`,
      render: () => <MessageEndAligned />,
    },
    {
      title: "With marker",
      description: "Date separator between messages.",
      code: `<Marker variant="separator">
  <MarkerContent>Today</MarkerContent>
</Marker>`,
      render: () => <MessageWithMarker />,
    },
    {
      title: "Bubble stack",
      description: "Multiple bubbles under one header.",
      code: `<BubbleGroup>
  <Bubble variant="muted">…</Bubble>
  <Bubble variant="muted">…</Bubble>
</BubbleGroup>`,
      render: () => <MessageBubbleStack />,
    },
    {
      title: "Ghost",
      description: "Text-only message without bubble fill.",
      code: `<Bubble variant="ghost">
  <BubbleContent>…</BubbleContent>
</Bubble>`,
      render: () => <MessageGhost />,
    },
  ],
}
