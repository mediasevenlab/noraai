import { CheckIcon } from "lucide-react"

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
} from "@/components/ui/avatar"

import type { ComponentDoc } from "./types"

/** Дубли размеров/стека — во Nora; здесь только отличия Base API */
export const avatarDoc: ComponentDoc = {
  id: "avatar",
  examples: [
    {
      title: "Fallback & badge",
      description: "Fallback-only avatar and status badge.",
      code: `import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
} from "@/components/ui/avatar"
import { CheckIcon } from "lucide-react"

export function AvatarFallbackDemo() {
  return (
    <div className="flex items-center gap-4">
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
        <AvatarBadge>
          <CheckIcon />
        </AvatarBadge>
      </Avatar>
    </div>
  )
}`,
      render: () => (
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>AB</AvatarFallback>
            <AvatarBadge>
              <CheckIcon />
            </AvatarBadge>
          </Avatar>
        </div>
      ),
    },
  ],
}
