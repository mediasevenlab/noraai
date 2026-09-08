import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Card, CardContent } from "@/components/ui/card"

import type { ComponentDoc } from "./types"

export const carouselDoc: ComponentDoc = {
  id: "carousel",
  examples: [
    {
      title: "Basic",
      description: "Horizontal carousel with controls.",
      code: `import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"`,
      render: () => (
        <Carousel className="w-full max-w-xs">
          <CarouselContent>
            {Array.from({ length: 5 }).map((_, index) => (
              <CarouselItem key={index}>
                <div className="p-1">
                  <Card>
                    <CardContent className="flex aspect-square items-center justify-center p-6">
                      <span className="text-3xl font-semibold">{index + 1}</span>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      ),
    },
    {
      title: "Multiple items",
      description: "Basis for showing multiple slides.",
      code: `<CarouselItem className="basis-1/3">...</CarouselItem>`,
      render: () => (
        <Carousel className="w-full max-w-lg">
          <CarouselContent className="-ml-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <CarouselItem key={index} className="basis-1/3 pl-2">
                <Card>
                  <CardContent className="flex aspect-square items-center justify-center p-4">
                    <span className="text-xl font-medium">{index + 1}</span>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      ),
    },
  ],
}
