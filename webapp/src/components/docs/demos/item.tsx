import {
  BadgeCheckIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  InboxIcon,
  PlusIcon,
  ShieldAlertIcon,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"

import type { ComponentDoc } from "./types"

const w = "w-full max-w-[320px]"

function ItemBasic() {
  return (
    <Item variant="outline" className={w}>
      <ItemMedia variant="icon">
        <BadgeCheckIcon />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Your profile is verified</ItemTitle>
        <ItemDescription>
          Complete verification to unlock premium features.
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button size="sm" variant="outline">
          View
        </Button>
      </ItemActions>
    </Item>
  )
}

function ItemVariantDemo() {
  return (
    <div className={`flex ${w} flex-col gap-1.5`}>
      <Item>
        <ItemMedia variant="icon">
          <InboxIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Default</ItemTitle>
          <ItemDescription>Transparent, no border.</ItemDescription>
        </ItemContent>
      </Item>
      <Item variant="outline">
        <ItemMedia variant="icon">
          <InboxIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Outline</ItemTitle>
          <ItemDescription>Inset border — Nora panel edge.</ItemDescription>
        </ItemContent>
      </Item>
      <Item variant="muted">
        <ItemMedia variant="icon">
          <InboxIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Muted</ItemTitle>
          <ItemDescription>Surface fill for secondary rows.</ItemDescription>
        </ItemContent>
      </Item>
    </div>
  )
}

function ItemSizeDemo() {
  return (
    <div className={`flex ${w} flex-col gap-1.5`}>
      <Item variant="outline">
        <ItemMedia variant="icon">
          <InboxIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Default size</ItemTitle>
          <ItemDescription>Standard row height.</ItemDescription>
        </ItemContent>
      </Item>
      <Item variant="outline" size="sm">
        <ItemMedia variant="icon">
          <InboxIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Small</ItemTitle>
          <ItemDescription>Compact for dense lists.</ItemDescription>
        </ItemContent>
      </Item>
      <Item variant="outline" size="xs">
        <ItemMedia variant="icon">
          <InboxIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Extra small</ItemTitle>
          <ItemDescription>Tightest density.</ItemDescription>
        </ItemContent>
      </Item>
    </div>
  )
}

function ItemIconDemo() {
  return (
    <Item variant="outline" className={w}>
      <ItemMedia variant="icon">
        <ShieldAlertIcon />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Security alert</ItemTitle>
        <ItemDescription>
          New login detected from an unknown device.
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button size="sm" variant="outline">
          Review
        </Button>
      </ItemActions>
    </Item>
  )
}

function ItemAvatarDemo() {
  return (
    <div className={`flex ${w} flex-col gap-1.5`}>
      <Item variant="outline">
        <ItemMedia>
          <Avatar size="sm" className="size-8">
            <AvatarImage src="https://github.com/evilrabbit.png" />
            <AvatarFallback>ER</AvatarFallback>
          </Avatar>
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Evil Rabbit</ItemTitle>
          <ItemDescription>Last seen 5 months ago</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button
            size="icon-sm"
            variant="outline"
            className="rounded-full"
            aria-label="Invite"
          >
            <PlusIcon />
          </Button>
        </ItemActions>
      </Item>
      <Item variant="outline">
        <ItemMedia>
          <div className="flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-[var(--nora-panel)]">
            <Avatar size="sm">
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <Avatar size="sm">
              <AvatarImage
                src="https://github.com/maxleiter.png"
                alt="@maxleiter"
              />
              <AvatarFallback>LR</AvatarFallback>
            </Avatar>
            <Avatar size="sm">
              <AvatarImage
                src="https://github.com/evilrabbit.png"
                alt="@evilrabbit"
              />
              <AvatarFallback>ER</AvatarFallback>
            </Avatar>
          </div>
        </ItemMedia>
        <ItemContent>
          <ItemTitle>No team members</ItemTitle>
          <ItemDescription>
            Invite your team to collaborate on this project.
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button size="sm" variant="outline">
            Invite
          </Button>
        </ItemActions>
      </Item>
    </div>
  )
}

const music = [
  {
    title: "Midnight City Lights",
    artist: "Neon Dreams",
    duration: "3:45",
  },
  {
    title: "Coffee Shop Conversations",
    artist: "The Morning Brew",
    duration: "4:05",
  },
  {
    title: "Digital Rain",
    artist: "Cyber Symphony",
    duration: "3:30",
  },
]

function ItemImageDemo() {
  return (
    <ItemGroup className={w}>
      {music.map((song) => (
        <Item
          key={song.title}
          variant="outline"
          render={<a href="#item-image" />}
          role="listitem"
        >
          <ItemMedia variant="image">
            <img
              src={`https://avatar.vercel.sh/${encodeURIComponent(song.title)}`}
              alt=""
            />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{song.title}</ItemTitle>
            <ItemDescription>{song.artist}</ItemDescription>
          </ItemContent>
          <ItemContent className="flex-none text-right">
            <ItemDescription>{song.duration}</ItemDescription>
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  )
}

const people = [
  {
    username: "shadcn",
    avatar: "https://github.com/shadcn.png",
    email: "shadcn@vercel.com",
  },
  {
    username: "maxleiter",
    avatar: "https://github.com/maxleiter.png",
    email: "maxleiter@vercel.com",
  },
  {
    username: "evilrabbit",
    avatar: "https://github.com/evilrabbit.png",
    email: "evilrabbit@vercel.com",
  },
]

function ItemGroupDemo() {
  return (
    <ItemGroup className={w}>
      {people.map((person, index) => (
        <div key={person.username}>
          <Item variant="outline">
            <ItemMedia>
              <Avatar size="sm" className="size-7">
                <AvatarImage src={person.avatar} />
                <AvatarFallback>
                  {person.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{person.username}</ItemTitle>
              <ItemDescription>{person.email}</ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                aria-label={`Add ${person.username}`}
              >
                <PlusIcon />
              </Button>
            </ItemActions>
          </Item>
          {index < people.length - 1 ? <ItemSeparator /> : null}
        </div>
      ))}
    </ItemGroup>
  )
}

function ItemLinkDemo() {
  return (
    <div className={`flex ${w} flex-col gap-1.5`}>
      <Item render={<a href="#item-docs" />}>
        <ItemContent>
          <ItemTitle>Visit our documentation</ItemTitle>
          <ItemDescription>
            Learn how to get started with our components.
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <ChevronRightIcon className="size-3.5 text-[var(--nora-text-tertiary)]" />
        </ItemActions>
      </Item>
      <Item
        variant="outline"
        render={
          <a href="https://ui.shadcn.com" target="_blank" rel="noreferrer" />
        }
      >
        <ItemContent>
          <ItemTitle>External resource</ItemTitle>
          <ItemDescription>Opens in a new tab.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <ExternalLinkIcon className="size-3.5 text-[var(--nora-text-tertiary)]" />
        </ItemActions>
      </Item>
    </div>
  )
}

export const itemDoc: ComponentDoc = {
  id: "item",
  examples: [
    {
      title: "Basic",
      description: "Media + title + description + action.",
      code: `<Item variant="outline">
  <ItemMedia variant="icon"><BadgeCheckIcon /></ItemMedia>
  <ItemContent>
    <ItemTitle>Your profile is verified</ItemTitle>
    <ItemDescription>…</ItemDescription>
  </ItemContent>
  <ItemActions><Button size="sm">View</Button></ItemActions>
</Item>`,
      render: () => <ItemBasic />,
    },
    {
      title: "Variant",
      description: "default / outline / muted.",
      code: `<Item variant="outline">…</Item>
<Item variant="muted">…</Item>`,
      render: () => <ItemVariantDemo />,
    },
    {
      title: "Size",
      description: "default, sm, xs density.",
      code: `<Item size="sm">…</Item>
<Item size="xs">…</Item>`,
      render: () => <ItemSizeDemo />,
    },
    {
      title: "Icon",
      description: "Leading icon media.",
      code: `<ItemMedia variant="icon"><ShieldAlertIcon /></ItemMedia>`,
      render: () => <ItemIconDemo />,
    },
    {
      title: "Avatar",
      description: "Avatar media and stacked faces.",
      code: `<ItemMedia>
  <Avatar>…</Avatar>
</ItemMedia>`,
      render: () => <ItemAvatarDemo />,
    },
    {
      title: "Image",
      description: "Cover thumbnails in a list.",
      code: `<ItemMedia variant="image">
  <img src="…" alt="" />
</ItemMedia>`,
      render: () => <ItemImageDemo />,
    },
    {
      title: "Group",
      description: "Stacked rows with separators.",
      code: `<ItemGroup>
  <Item>…</Item>
  <ItemSeparator />
  <Item>…</Item>
</ItemGroup>`,
      render: () => <ItemGroupDemo />,
    },
    {
      title: "Link",
      description: "render as anchor — hover on the whole row.",
      code: `<Item render={<a href="#" />}>…</Item>`,
      render: () => <ItemLinkDemo />,
    },
  ],
}
