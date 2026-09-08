import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

import type { ComponentDoc } from "./types"

export const accordionDoc: ComponentDoc = {
  id: "accordion",
  examples: [
    {
      title: "Single",
      description: "Only one item open at a time.",
      code: `import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export function AccordionDemo() {
  return (
    <Accordion defaultValue={["item-1"]}>
      <AccordionItem value="item-1">
        <AccordionTrigger>Is it accessible?</AccordionTrigger>
        <AccordionContent>
          Yes. It adheres to the WAI-ARIA design pattern.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}`,
      render: () => (
        <Accordion defaultValue={["item-1"]} className="w-full max-w-md">
          <AccordionItem value="item-1">
            <AccordionTrigger>Is it accessible?</AccordionTrigger>
            <AccordionContent>
              Yes. It adheres to the WAI-ARIA design pattern.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Is it styled?</AccordionTrigger>
            <AccordionContent>
              Yes. It comes with default styles that match the other components.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>Is it animated?</AccordionTrigger>
            <AccordionContent>
              Yes. It is animated by default with height transitions.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ),
    },
    {
      title: "Multiple",
      description: "Allow multiple panels open.",
      code: `<Accordion multiple defaultValue={["a", "b"]}>...</Accordion>`,
      render: () => (
        <Accordion
          multiple
          defaultValue={["a"]}
          className="w-full max-w-md"
        >
          <AccordionItem value="a">
            <AccordionTrigger>Shipping</AccordionTrigger>
            <AccordionContent>
              Free shipping on orders over $50. Delivery in 3–5 days.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="b">
            <AccordionTrigger>Returns</AccordionTrigger>
            <AccordionContent>
              Return unused items within 30 days for a full refund.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ),
    },
  ],
}
