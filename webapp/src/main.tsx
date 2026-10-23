import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { StrictMode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import { applyHybridRuntimeFlags } from '@/components/modal-android'
import { CardRadiusSync } from '@/components/card-radius-store'
import { CompositionToneSync } from '@/components/composition-tone-store'
import { SidebarShadeSync } from '@/components/sidebar-shade-store'
import { IconPackSync } from '@/components/icon-pack-store'
import { CardShadowSync } from '@/components/card-shadow-store'
import { PlannedCoverBlurSync } from '@/components/planned-cover-blur-store'
import { PlannedCoverGradeSync } from '@/components/planned-cover-grade-store'
import { PlannedCoverWashSync } from '@/components/planned-cover-wash-store'
import { ModalMotionSync } from '@/components/modal-motion-store'
import { ModalOverlaySync } from '@/components/modal-overlay-store'
import { NoraSchemeSync } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/features/auth'
import { attachHybridHaptics } from '@/platform/hybrid-haptics'
import { attachHybridPress } from '@/platform/hybrid-press'
import { dismissAppBootSplash } from '@/platform/app-boot-splash'
import App from './App'
import './index.css'

applyHybridRuntimeFlags(document.documentElement, {
  userAgent: navigator.userAgent,
})
attachHybridHaptics(document)
attachHybridPress(document)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000,
    },
  },
})

const root = createRoot(document.getElementById('root')!)
window.setTimeout(() => dismissAppBootSplash(), 8_000)
flushSync(() => {
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            disableTransitionOnChange
            enableSystem={false}
            forcedTheme={
              window.location.pathname.includes('/embed/') ? 'light' : undefined
            }
            storageKey="web_app_demo_theme"
          >
            <NoraSchemeSync />
            <ModalMotionSync />
            <ModalOverlaySync />
            <CardRadiusSync />
            <CompositionToneSync />
            <SidebarShadeSync />
            <IconPackSync />
            <CardShadowSync />
            <PlannedCoverWashSync />
            <PlannedCoverBlurSync />
            <PlannedCoverGradeSync />
            <AuthProvider>
              <App />
            </AuthProvider>
            <Toaster />
          </ThemeProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
})
