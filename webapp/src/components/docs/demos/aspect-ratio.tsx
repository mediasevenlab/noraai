import { AspectRatio } from "@/components/ui/aspect-ratio"

import type { ComponentDoc } from "./types"

export const aspectRatioDoc: ComponentDoc = {
  id: "aspect-ratio",
  examples: [
    {
      title: "16:9",
      description: "Widescreen media frame.",
      code: `import { AspectRatio } from "@/components/ui/aspect-ratio"

export function AspectRatioDemo() {
  return (
    <AspectRatio ratio={16 / 9}>
      <img src="..." alt="Photo" className="h-full w-full object-cover" />
    </AspectRatio>
  )
}`,
      render: () => (
        <AspectRatio
          ratio={16 / 9}
          className="w-full max-w-md overflow-hidden rounded-lg bg-muted"
        >
          <img
            src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&h=450&fit=crop"
            alt="Photo"
            className="h-full w-full object-cover"
          />
        </AspectRatio>
      ),
    },
    {
      title: "1:1",
      description: "Square aspect ratio.",
      code: `<AspectRatio ratio={1}>...</AspectRatio>`,
      render: () => (
        <AspectRatio
          ratio={1}
          className="w-40 overflow-hidden rounded-lg bg-muted"
        >
          <img
            src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=400&h=400&fit=crop"
            alt="Square"
            className="h-full w-full object-cover"
          />
        </AspectRatio>
      ),
    },
  ],
}
