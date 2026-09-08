import { sonnerDoc } from "./sonner"
import type { ComponentDoc } from "./types"

/** Toast demos map to Sonner in this project. */
export const toastDoc: ComponentDoc = {
  id: "toast",
  examples: sonnerDoc.examples.map((example) => ({
    ...example,
    description: `${example.description ?? ""} (via Sonner)`.trim(),
  })),
}
