import {
  CircleHelpIcon,
  FileTextIcon,
  LayersIcon,
  BookOpenIcon,
} from "lucide-react"

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"

import type { ComponentDoc } from "./types"

const components = [
  {
    title: "Alert Dialog",
    href: "#alert-dialog",
    description: "A modal dialog that interrupts the user.",
  },
  {
    title: "Hover Card",
    href: "#hover-card",
    description: "Preview content available behind a link.",
  },
  {
    title: "Progress",
    href: "#progress",
    description: "Displays an indicator showing completion.",
  },
  {
    title: "Scroll Area",
    href: "#scroll-area",
    description: "Visually orients overflow content.",
  },
]

function ListItem({
  title,
  children,
  href,
  ...props
}: React.ComponentPropsWithoutRef<"a"> & { title: string }) {
  return (
    <li>
      <NavigationMenuLink
        href={href}
        className="flex h-auto flex-col items-start gap-0.5 px-2 py-1.5"
        {...props}
      >
        <div className="text-xs font-medium text-[var(--nora-text)]">{title}</div>
        <p className="line-clamp-2 text-[11px] font-medium leading-snug text-[var(--nora-text-tertiary)]">
          {children}
        </p>
      </NavigationMenuLink>
    </li>
  )
}

function NavigationMenuBasic() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-52 gap-0.5 p-0.5">
              <li>
                <NavigationMenuLink href="#intro">Introduction</NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink href="#install">Installation</NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink href="#typography">Typography</NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            href="#docs"
            className={cn(navigationMenuTriggerStyle())}
          >
            Documentation
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

function NavigationMenuLinks() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Components</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[340px] gap-0.5 p-0.5 sm:grid-cols-2">
              {components.map((component) => (
                <ListItem
                  key={component.title}
                  title={component.title}
                  href={component.href}
                >
                  {component.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            href="#docs"
            className={cn(navigationMenuTriggerStyle())}
          >
            Docs
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

function NavigationMenuIcons() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-56 gap-0.5 p-0.5">
              <li>
                <NavigationMenuLink href="#guide">
                  <BookOpenIcon />
                  Guide
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink href="#api">
                  <FileTextIcon />
                  API Reference
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink href="#patterns">
                  <LayersIcon />
                  Patterns
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink href="#faq">
                  <CircleHelpIcon />
                  FAQ
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

export const navigationMenuDoc: ComponentDoc = {
  id: "navigation-menu",
  examples: [
    {
      title: "Basic",
      description: "Top nav with Nora dropdown surface.",
      code: `<NavigationMenu>
  <NavigationMenuList>
    <NavigationMenuItem>
      <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
      <NavigationMenuContent>…</NavigationMenuContent>
    </NavigationMenuItem>
  </NavigationMenuList>
</NavigationMenu>`,
      render: () => <NavigationMenuBasic />,
    },
    {
      title: "Link list",
      description: "Two-column links with descriptions.",
      code: `<NavigationMenuContent>
  <ul className="grid sm:grid-cols-2">…</ul>
</NavigationMenuContent>`,
      render: () => <NavigationMenuLinks />,
    },
    {
      title: "With icons",
      description: "Icon + label rows in the panel.",
      code: `<NavigationMenuLink href="#guide">
  <BookOpenIcon /> Guide
</NavigationMenuLink>`,
      render: () => <NavigationMenuIcons />,
    },
  ],
}
