import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from '@tanstack/react-router'

import { parseReferralSearchParam } from './features/auth'
import { RootLayout } from './root-layout'

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: lazyRouteComponent(() => import('./pages'), 'NotFoundPage'),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>) => ({
    ref: parseReferralSearchParam(search.ref),
    returnTo: typeof search.returnTo === 'string' ? search.returnTo : undefined,
  }),
  component: lazyRouteComponent(() => import('./pages'), 'HomePage'),
})

const authDemoEmbedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/embed/auth-demo',
  validateSearch: (search: Record<string, unknown>) => ({
    surface:
      search.surface === 'signup-user' || search.surface === 'signup-mentor'
        ? search.surface
        : 'login',
  }),
  component: lazyRouteComponent(() => import('./pages'), 'AuthDemoEmbedPage'),
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: returnToSearch,
  component: lazyRouteComponent(() => import('./pages'), 'LoginPage'),
})

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  validateSearch: (search: Record<string, unknown>) => ({
    ...returnToSearch(search),
    ref: parseReferralSearchParam(search.ref),
  }),
  component: lazyRouteComponent(() => import('./pages'), 'SignupPage'),
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: lazyRouteComponent(() => import('./pages'), 'ForgotPasswordPage'),
})

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  component: lazyRouteComponent(() => import('./pages'), 'ResetPasswordPage'),
})

const userWorkspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'userWorkspace',
  component: lazyRouteComponent(() => import('./pages'), 'UserWorkspaceLayout'),
})

const userHomeRoute = createRoute({
  getParentRoute: () => userWorkspaceRoute,
  path: '/app',
  component: lazyRouteComponent(() => import('./pages'), 'UserHomePage'),
})

const userDiaryRoute = createRoute({
  getParentRoute: () => userWorkspaceRoute,
  path: '/app/diary',
  component: lazyRouteComponent(() => import('./pages'), 'UserDiaryNewsPage'),
})

const userDiaryNewsLegacyRoute = createRoute({
  getParentRoute: () => userWorkspaceRoute,
  path: '/app/diary/news',
  component: lazyRouteComponent(() => import('./pages'), 'UserHomePage'),
})

const userNewsRoute = createRoute({
  getParentRoute: () => userWorkspaceRoute,
  path: '/app/news',
  component: lazyRouteComponent(() => import('./pages'), 'UserNewsPage'),
})

const userFeedRoute = createRoute({
  getParentRoute: () => userWorkspaceRoute,
  path: '/app/feed',
  component: lazyRouteComponent(() => import('./pages'), 'UserFeedRedirectPage'),
})

const userRationsRoute = createRoute({
  getParentRoute: () => userWorkspaceRoute,
  path: '/app/rations',
  component: lazyRouteComponent(() => import('./pages'), 'UserRationsPage'),
})

const userMentorRationsRoute = createRoute({
  getParentRoute: () => userWorkspaceRoute,
  path: '/app/mentor-rations',
  component: lazyRouteComponent(() => import('./pages'), 'UserMentorRationsPage'),
})

const userMyRationsRoute = createRoute({
  getParentRoute: () => userWorkspaceRoute,
  path: '/app/my-rations',
  component: lazyRouteComponent(() => import('./pages'), 'UserMyRationsPage'),
})

const userPlanRoute = createRoute({
  getParentRoute: () => userWorkspaceRoute,
  path: '/app/plan',
  component: lazyRouteComponent(() => import('./pages'), 'UserPlanPage'),
})

const userGeneralRoute = createRoute({
  getParentRoute: () => userWorkspaceRoute,
  path: '/app/general',
  validateSearch: (search: Record<string, unknown>) => ({
    view: search.view === 'plan' ? ('plan' as const) : ('diary' as const),
    planId: typeof search.planId === 'string' && search.planId.trim() ? search.planId : undefined,
    library:
      search.library === 'mentor' || search.library === 'mine'
        ? (search.library as 'mine' | 'mentor')
        : undefined,
  }),
  component: lazyRouteComponent(() => import('./pages'), 'UserGeneralPage'),
})

const userPlanCurrentRoute = createRoute({
  getParentRoute: () => userWorkspaceRoute,
  path: '/app/plan/current',
  component: lazyRouteComponent(() => import('./pages'), 'UserPlanCurrentPage'),
})

const userPlanDetailRoute = createRoute({
  getParentRoute: () => userWorkspaceRoute,
  path: '/app/plan/$planId',
  component: lazyRouteComponent(() => import('./pages'), 'UserPlanDetailPage'),
})

const userSavedRoute = createRoute({
  getParentRoute: () => userWorkspaceRoute,
  path: '/app/saved',
  component: lazyRouteComponent(() => import('./pages'), 'UserSavedPage'),
})

const userOnboardingRoute = createRoute({
  getParentRoute: () => userWorkspaceRoute,
  path: '/app/onboarding',
  component: lazyRouteComponent(() => import('./pages'), 'UserOnboardingPage'),
})

const userProfileRoute = createRoute({
  getParentRoute: () => userWorkspaceRoute,
  path: '/app/profile',
  component: lazyRouteComponent(() => import('./pages'), 'UserProfilePage'),
})

const userSettingsRoute = createRoute({
  getParentRoute: () => userWorkspaceRoute,
  path: '/app/settings',
  component: lazyRouteComponent(() => import('./pages'), 'UserSettingsPage'),
})

const userReferralsRoute = createRoute({
  getParentRoute: () => userWorkspaceRoute,
  path: '/app/referrals',
  component: lazyRouteComponent(() => import('./pages'), 'UserReferralsPage'),
})

const userPaymentsRoute = createRoute({
  getParentRoute: () => userWorkspaceRoute,
  path: '/app/payments',
  component: lazyRouteComponent(() => import('./pages'), 'UserPaymentsPage'),
})

const userDialogsRoute = createRoute({
  getParentRoute: () => userWorkspaceRoute,
  path: '/app/dialogs',
  component: lazyRouteComponent(() => import('./pages'), 'UserDialogsPage'),
})

const userMeetingsRoute = createRoute({
  getParentRoute: () => userWorkspaceRoute,
  path: '/app/meetings',
  validateSearch: meetingSearch,
  component: lazyRouteComponent(() => import('./pages'), 'UserMeetingsPage'),
})

const userNotesRoute = createRoute({
  getParentRoute: () => userWorkspaceRoute,
  path: '/app/notes',
  component: lazyRouteComponent(() => import('./pages'), 'UserNotesPage'),
})

const adminWorkspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'adminWorkspace',
  component: lazyRouteComponent(() => import('./pages'), 'AdminWorkspaceLayout'),
})

const adminDashboardRoute = createRoute({
  getParentRoute: () => adminWorkspaceRoute,
  path: '/admin',
  component: lazyRouteComponent(() => import('./pages'), 'AdminHomeRedirectPage'),
})

const adminDemoLegacyRoute = createRoute({
  getParentRoute: () => adminWorkspaceRoute,
  path: '/admin/demo/$pageId',
  component: lazyRouteComponent(() => import('./pages'), 'AdminHomeRedirectPage'),
})

const adminProfileRoute = createRoute({
  getParentRoute: () => adminWorkspaceRoute,
  path: '/admin/profile',
  component: lazyRouteComponent(() => import('./pages'), 'AdminProfilePage'),
})

const adminNewsRoute = createRoute({
  getParentRoute: () => adminWorkspaceRoute,
  path: '/admin/news',
  component: lazyRouteComponent(() => import('./pages'), 'AdminNewsPage'),
})

const adminUsersRoute = createRoute({
  getParentRoute: () => adminWorkspaceRoute,
  path: '/admin/users',
  component: lazyRouteComponent(() => import('./pages'), 'AdminUsersPage'),
})

const adminSettingsRoute = createRoute({
  getParentRoute: () => adminWorkspaceRoute,
  path: '/admin/settings',
  component: lazyRouteComponent(() => import('./pages'), 'AdminSettingsPage'),
})

const adminDesignSystemRoute = createRoute({
  getParentRoute: () => adminWorkspaceRoute,
  path: '/admin/ds/$pageId',
  component: lazyRouteComponent(() => import('./pages'), 'AdminDesignSystemPage'),
})

const adminComponentsIndexRoute = createRoute({
  getParentRoute: () => adminWorkspaceRoute,
  path: '/admin/components',
  component: lazyRouteComponent(() => import('./pages'), 'AdminComponentsIndexPage'),
})

const adminComponentDetailRoute = createRoute({
  getParentRoute: () => adminWorkspaceRoute,
  path: '/admin/components/$componentId',
  component: lazyRouteComponent(() => import('./pages'), 'AdminComponentDetailPage'),
})

const adminBlocksIndexRoute = createRoute({
  getParentRoute: () => adminWorkspaceRoute,
  path: '/admin/blocks',
  component: lazyRouteComponent(() => import('./pages'), 'AdminBlocksIndexPage'),
})

const adminBlockDetailRoute = createRoute({
  getParentRoute: () => adminWorkspaceRoute,
  path: '/admin/blocks/$blockId',
  component: lazyRouteComponent(() => import('./pages'), 'AdminBlockDetailPage'),
})

const adminStackRoute = createRoute({
  getParentRoute: () => adminWorkspaceRoute,
  path: '/admin/stack',
  component: lazyRouteComponent(() => import('./pages'), 'AdminStackPage'),
})

const adminStepsRoute = createRoute({
  getParentRoute: () => adminWorkspaceRoute,
  path: '/admin/steps',
  component: lazyRouteComponent(() => import('./pages'), 'AdminStepsPage'),
})

const mentorWorkspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'mentorWorkspace',
  component: lazyRouteComponent(() => import('./pages'), 'MentorWorkspaceLayout'),
})

const mentorHomeRoute = createRoute({
  getParentRoute: () => mentorWorkspaceRoute,
  path: '/mentor',
  component: lazyRouteComponent(() => import('./pages'), 'MentorHomePage'),
})

const mentorProfileRoute = createRoute({
  getParentRoute: () => mentorWorkspaceRoute,
  path: '/mentor/profile',
  component: lazyRouteComponent(() => import('./pages'), 'MentorProfilePage'),
})

const mentorUsersRoute = createRoute({
  getParentRoute: () => mentorWorkspaceRoute,
  path: '/mentor/users',
  component: lazyRouteComponent(() => import('./pages'), 'MentorUsersPage'),
})

const mentorMenteeRoute = createRoute({
  getParentRoute: () => mentorWorkspaceRoute,
  path: '/mentor/users/$userId',
  validateSearch: (_search: Record<string, unknown>) => ({
    view: 'profile' as const,
  }),
  component: lazyRouteComponent(() => import('./pages'), 'MentorMenteePage'),
})

const mentorSettingsRoute = createRoute({
  getParentRoute: () => mentorWorkspaceRoute,
  path: '/mentor/settings',
  component: lazyRouteComponent(() => import('./pages'), 'MentorSettingsPage'),
})

const mentorPaymentsRoute = createRoute({
  getParentRoute: () => mentorWorkspaceRoute,
  path: '/mentor/payments',
  component: lazyRouteComponent(() => import('./pages'), 'MentorPaymentsPage'),
})

const mentorMealPlanRoute = createRoute({
  getParentRoute: () => mentorWorkspaceRoute,
  path: '/mentor/meal-plan',
  component: lazyRouteComponent(() => import('./pages'), 'MentorMealPlanPage'),
})

const mentorAssignedRationsRoute = createRoute({
  getParentRoute: () => mentorWorkspaceRoute,
  path: '/mentor/mentor-rations',
  component: lazyRouteComponent(() => import('./pages'), 'MentorAssignedRationsPage'),
})

const mentorPlansRoute = createRoute({
  getParentRoute: () => mentorWorkspaceRoute,
  path: '/mentor/plans',
  component: lazyRouteComponent(() => import('./pages'), 'MentorPlansWorkspacePage'),
})

const mentorNewsRoute = createRoute({
  getParentRoute: () => mentorWorkspaceRoute,
  path: '/mentor/news',
  component: lazyRouteComponent(() => import('./pages'), 'MentorNewsPage'),
})

const mentorDialogsRoute = createRoute({
  getParentRoute: () => mentorWorkspaceRoute,
  path: '/mentor/dialogs',
  component: lazyRouteComponent(() => import('./pages'), 'MentorDialogsPage'),
})

const mentorMeetingsRoute = createRoute({
  getParentRoute: () => mentorWorkspaceRoute,
  path: '/mentor/meetings',
  validateSearch: meetingSearch,
  component: lazyRouteComponent(() => import('./pages'), 'MentorMeetingsPage'),
})

const mentorNotesRoute = createRoute({
  getParentRoute: () => mentorWorkspaceRoute,
  path: '/mentor/notes',
  component: lazyRouteComponent(() => import('./pages'), 'MentorNotesPage'),
})

const mentorFeedRoute = createRoute({
  getParentRoute: () => mentorWorkspaceRoute,
  path: '/mentor/feed',
  component: lazyRouteComponent(() => import('./pages'), 'MentorFeedRedirectPage'),
})

const mentorPlanDetailRoute = createRoute({
  getParentRoute: () => mentorWorkspaceRoute,
  path: '/mentor/plans/$planId',
  component: lazyRouteComponent(() => import('./pages'), 'MentorPlanDetailWorkspacePage'),
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  authDemoEmbedRoute,
  loginRoute,
  signupRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  userWorkspaceRoute.addChildren([
    userHomeRoute,
    userDiaryRoute,
    userDiaryNewsLegacyRoute,
    userNewsRoute,
    userFeedRoute,
    userRationsRoute,
    userMentorRationsRoute,
    userMyRationsRoute,
    userPlanRoute,
    userGeneralRoute,
    userPlanCurrentRoute,
    userPlanDetailRoute,
    userSavedRoute,
    userOnboardingRoute,
    userProfileRoute,
    userSettingsRoute,
    userReferralsRoute,
    userPaymentsRoute,
    userDialogsRoute,
    userMeetingsRoute,
    userNotesRoute,
  ]),
  adminWorkspaceRoute.addChildren([
    adminDashboardRoute,
    adminDemoLegacyRoute,
    adminNewsRoute,
    adminProfileRoute,
    adminUsersRoute,
    adminSettingsRoute,
    adminDesignSystemRoute,
    adminComponentsIndexRoute,
    adminComponentDetailRoute,
    adminBlocksIndexRoute,
    adminBlockDetailRoute,
    adminStackRoute,
    adminStepsRoute,
  ]),
  mentorWorkspaceRoute.addChildren([
    mentorHomeRoute,
    mentorProfileRoute,
    mentorUsersRoute,
    mentorMenteeRoute,
    mentorSettingsRoute,
    mentorPaymentsRoute,
    mentorMealPlanRoute,
    mentorAssignedRationsRoute,
    mentorPlansRoute,
    mentorPlanDetailRoute,
    mentorNewsRoute,
    mentorDialogsRoute,
    mentorMeetingsRoute,
    mentorNotesRoute,
    mentorFeedRoute,
  ]),
])

export const router = createRouter({ routeTree })

function returnToSearch(search: Record<string, unknown>) {
  return {
    returnTo: typeof search.returnTo === 'string' ? search.returnTo : undefined,
  }
}

function meetingSearch(search: Record<string, unknown>) {
  return {
    id: typeof search.id === 'string' && search.id ? search.id : undefined,
  }
}

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
