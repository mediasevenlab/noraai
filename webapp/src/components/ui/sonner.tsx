import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

import { useTheme } from "@/components/theme-provider"
import {
  TOASTER_MOBILE_BOTTOM,
  toasterPositionForViewport,
} from "@/components/ui/toaster-position"

function useToasterPosition(): ToasterProps["position"] {
  const [position, setPosition] = useState<ToasterProps["position"]>(() =>
    typeof window === "undefined"
      ? "bottom-left"
      : toasterPositionForViewport(window.innerWidth),
  )

  useEffect(() => {
    const sync = () => setPosition(toasterPositionForViewport(window.innerWidth))
    sync()
    window.addEventListener("resize", sync)
    return () => window.removeEventListener("resize", sync)
  }, [])

  return position
}

/** Nora toast surface via Sonner — --nora-toast-* + .cn-toast */
const Toaster = ({ ...props }: ToasterProps) => {
  const { scheme } = useTheme()
  const position = useToasterPosition()

  const toaster = (
    <Sonner
      theme={scheme === "editor-light" ? "light" : "dark"}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--nora-toast-bg)",
          "--normal-text": "var(--nora-toast-text)",
          "--normal-border": "transparent",
          "--border-radius": "var(--nora-radius-lg, 10px)",
          ...(position === "bottom-left"
            ? { "--offset-bottom": TOASTER_MOBILE_BOTTOM }
            : {}),
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast ios-glass-glare",
          title: "cn-toast-title",
          description: "cn-toast-description",
          actionButton: "cn-toast-action",
          cancelButton: "cn-toast-action",
          closeButton: "cn-toast-close",
        },
      }}
      {...props}
      {...(position === "bottom-left"
        ? {
            mobileOffset: {
              bottom: TOASTER_MOBILE_BOTTOM,
              left: "0.75rem",
            },
            offset: {
              bottom: TOASTER_MOBILE_BOTTOM,
              left: "0.75rem",
            },
          }
        : {})}
      position={position}
    />
  )

  // Modal recess applies transform + overflow to #root. Keep toasts on body
  // so they stay above the overlay instead of receding with the page.
  if (typeof document === "undefined") return toaster
  return createPortal(toaster, document.body)
}

export { Toaster }
