import { InfoIcon, SparklesIcon } from "lucide-react"

import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"
import {
  Message,
  MessageContent,
  MessageGroup,
} from "@/components/ui/message"
import { Bubble, BubbleContent } from "@/components/ui/bubble"

import type { ComponentDoc } from "./types"

const w = "w-full max-w-[320px]"

export const markerDoc: ComponentDoc = {
  id: "marker",
  examples: [
    {
      title: "Default",
      description: "Inline status note — tertiary Nora text.",
      code: `<Marker>
  <MarkerIcon><InfoIcon /></MarkerIcon>
  <MarkerContent>System maintenance tonight at 11 PM.</MarkerContent>
</Marker>`,
      render: () => (
        <Marker className={w}>
          <MarkerIcon>
            <InfoIcon />
          </MarkerIcon>
          <MarkerContent>System maintenance tonight at 11 PM.</MarkerContent>
        </Marker>
      ),
    },
    {
      title: "Separator",
      description: "Centered label with flanking dividers.",
      code: `<Marker variant="separator">
  <MarkerContent>Today</MarkerContent>
</Marker>`,
      render: () => (
        <Marker variant="separator" className={w}>
          <MarkerContent>Today</MarkerContent>
        </Marker>
      ),
    },
    {
      title: "Border",
      description: "Bottom divider under the row.",
      code: `<Marker variant="border">
  <MarkerIcon><SparklesIcon /></MarkerIcon>
  <MarkerContent>New features — see the <a href="#">changelog</a></MarkerContent>
</Marker>`,
      render: () => (
        <Marker variant="border" className={w}>
          <MarkerIcon>
            <SparklesIcon />
          </MarkerIcon>
          <MarkerContent>
            New features — see the{" "}
            <a href="#changelog">changelog</a>
          </MarkerContent>
        </Marker>
      ),
    },
    {
      title: "In thread",
      description: "Date separators inside a message group.",
      code: `<MessageGroup>
  <Marker variant="separator"><MarkerContent>Yesterday</MarkerContent></Marker>
  <Message>…</Message>
  <Marker variant="separator"><MarkerContent>Today</MarkerContent></Marker>
  <Message>…</Message>
</MessageGroup>`,
      render: () => (
        <MessageGroup className={w}>
          <Marker variant="separator">
            <MarkerContent>Yesterday</MarkerContent>
          </Marker>
          <Message>
            <MessageContent>
              <Bubble variant="muted">
                <BubbleContent>Pushed the latest screens.</BubbleContent>
              </Bubble>
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
            </MessageContent>
          </Message>
        </MessageGroup>
      ),
    },
  ],
}
