import { useParams } from '@tanstack/react-router'

import { isDsPageId } from '../nav'
import { DsOverviewPage } from './overview'
import {
  DsBordersPage,
  DsColorsPage,
  DsIconsPage,
  DsMotionPage,
  DsRadiusPage,
  DsShadowsPage,
  DsSpacingPage,
  DsTokensPage,
  DsTypographyPage,
} from './design-system-pages'

const pages = {
  overview: DsOverviewPage,
  colors: DsColorsPage,
  typography: DsTypographyPage,
  icons: DsIconsPage,
  spacing: DsSpacingPage,
  radius: DsRadiusPage,
  shadows: DsShadowsPage,
  borders: DsBordersPage,
  motion: DsMotionPage,
  tokens: DsTokensPage,
} as const

export function DesignSystemPage() {
  const { pageId } = useParams({ from: '/adminWorkspace/admin/ds/$pageId' })
  const id = isDsPageId(pageId) ? pageId : 'overview'
  const Page = pages[id]
  return <Page />
}
