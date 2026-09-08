import {
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  useRouter,
  useSearch,
} from '@tanstack/react-router'
import type { RegistrationRole, UserDto, UserRole } from '@web-app-demo/contracts'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

import {
  NotFoundSection,
  SessionErrorSection,
  SessionLoadingSection,
} from '@/components/WebRouteSections'
import { WorkspaceShell } from '@/components/WorkspaceShell'
import { AdminSettings, AdminUsers } from '@/features/admin'
import { DesignSystemPage } from '@/features/design-system'
import {
  BlockDetailPage,
  BlocksIndexPage,
} from '@/features/blocks'
import {
  ComponentDetailPage,
  ComponentsIndexPage,
} from '@/features/components'
import { StackPage } from '@/features/stack'
import { StepsPage } from '@/features/steps'
import {
  AuthPageShell,
  LoginForm,
  RegisterForm,
  useAuth,
} from '@/features/auth'
import { SharedMealsFeedPage } from '@/features/diary'
import { homePathForRole, postAuthPath, userGeneralSearch } from '@/features/navigation'
import {
  MentorHome,
  MentorMenteeDiary,
  MentorSettings,
  MentorUsers,
} from '@/features/mentor'
import { MentorPayments, UserPayments } from '@/features/payments'
import { GeneralNutritionPage, MenteeAssignedPlans, MentorPlanDetailPage, MentorPlansPage } from '@/features/plans'
import {
  AccountProfile,
  UserHome,
  UserOnboarding,
  UserProfile,
  UserReferrals,
  UserSettings,
} from '@/features/users'

export function HomePage() {
  const auth = useAuth()
  const { ref, returnTo } = useSearch({ from: '/' })

  if (auth.isBootstrapping) return <SessionLoadingSection />
  if (auth.sessionError && !auth.user) {
    return <SessionErrorSection retry={auth.retrySession} />
  }
  if (auth.user) {
    return (
      <HrefRedirect
        href={postAuthPath(
          auth.user.role,
          returnTo,
          auth.user.questionnaireCompleted,
        )}
      />
    )
  }
  const destination = ref
    ? `/signup?ref=${encodeURIComponent(ref)}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}`
    : returnTo
      ? `/login?returnTo=${encodeURIComponent(returnTo)}`
      : '/login'
  return <HrefRedirect href={destination} />
}

export function LoginPage() {
  const { returnTo } = useSearch({ from: '/login' })
  return (
    <GuestAuthPage returnTo={returnTo}>
      <AuthPageShell surface="login">
        <LoginForm returnTo={returnTo} />
      </AuthPageShell>
    </GuestAuthPage>
  )
}

export function SignupPage() {
  const { ref, returnTo } = useSearch({ from: '/signup' })
  const [role, setRole] = useState<RegistrationRole>('user')

  return (
    <GuestAuthPage returnTo={returnTo}>
      <AuthPageShell surface={role === 'mentor' ? 'signup-mentor' : 'signup-user'}>
        <RegisterForm onRoleChange={setRole} referralCode={ref} returnTo={returnTo} />
      </AuthPageShell>
    </GuestAuthPage>
  )
}

export function ForgotPasswordPage() {
  return <Navigate replace search={{ returnTo: undefined }} to="/login" />
}

export function ResetPasswordPage() {
  return <Navigate replace search={{ returnTo: undefined }} to="/login" />
}

export function UserHomePage() {
  useWorkspaceUser('user')
  return <UserHome />
}

export function UserDiaryNewsPage() {
  useWorkspaceUser('user')
  return <Navigate replace search={userGeneralSearch()} to="/app/general" />
}

export function UserFeedPage() {
  useWorkspaceUser('user')
  return <SharedMealsFeedPage />
}

export function UserRationsPage() {
  useWorkspaceUser('user')
  return <Navigate replace search={userGeneralSearch('plan')} to="/app/general" />
}

export function UserMentorRationsPage() {
  useWorkspaceUser('user')
  return <Navigate replace search={userGeneralSearch('plan')} to="/app/general" />
}

export function UserMyRationsPage() {
  useWorkspaceUser('user')
  return <Navigate replace search={userGeneralSearch('plan')} to="/app/general" />
}

export function UserPlanPage() {
  useWorkspaceUser('user')
  return <Navigate replace search={userGeneralSearch('plan')} to="/app/general" />
}

export function UserGeneralPage() {
  useWorkspaceUser('user')
  const navigate = useNavigate()
  const search = useLocation({ select: (location) => location.search })
  const view = search.view === 'plan' ? 'plan' : 'diary'
  const openPlanId = typeof search.planId === 'string' ? search.planId : undefined
  const library =
    search.library === 'catalog' || search.library === 'mentor' || search.library === 'mine'
      ? search.library
      : undefined
  return (
    <GeneralNutritionPage
      library={library}
      openPlanId={openPlanId}
      onClosePlan={() => {
        void navigate({
          replace: true,
          search: userGeneralSearch('plan', undefined, library === 'catalog' ? 'catalog' : undefined),
          to: '/app/general',
        })
      }}
      onLibraryChange={(next) => {
        void navigate({
          replace: true,
          search: userGeneralSearch('plan', undefined, next === 'mine' ? undefined : next),
          to: '/app/general',
        })
      }}
      onOpenPlan={(planId) => {
        void navigate({
          replace: true,
          search: userGeneralSearch('plan', planId, library === 'catalog' ? 'catalog' : undefined),
          to: '/app/general',
        })
      }}
      onViewChange={(next) => {
        void navigate({
          replace: true,
          search: userGeneralSearch(next),
          to: '/app/general',
        })
      }}
      view={view}
    />
  )
}

export function UserPlanCurrentPage() {
  useWorkspaceUser('user')
  return (
    <Navigate
      replace
      search={userGeneralSearch('plan', 'current')}
      to="/app/general"
    />
  )
}

export function UserPlanDetailPage() {
  useWorkspaceUser('user')
  const { planId } = useParams({ from: '/userWorkspace/app/plan/$planId' })
  return (
    <Navigate replace search={userGeneralSearch('plan', planId)} to="/app/general" />
  )
}

export function UserSavedPage() {
  return <Navigate replace search={userGeneralSearch()} to="/app/general" />
}

export function UserOnboardingPage() {
  useWorkspaceUser('user')
  return <UserOnboarding />
}

export function UserProfilePage() {
  const user = useWorkspaceUser('user')
  return <UserProfile user={user} />
}

export function UserSettingsPage() {
  const user = useWorkspaceUser('user')
  return <UserSettings user={user} />
}

export function UserReferralsPage() {
  const user = useWorkspaceUser('user')
  return <UserReferrals user={user} />
}

export function UserPaymentsPage() {
  useWorkspaceUser('user')
  return <UserPayments />
}

export function AdminHomeRedirectPage() {
  return <Navigate replace to="/admin/users" />
}

export function AdminProfilePage() {
  const user = useWorkspaceUser('admin')
  return <AccountProfile showBrand titleSize="display" user={user} />
}

export function AdminUsersPage() {
  const user = useWorkspaceUser('admin')
  return <AdminUsers currentUser={user} />
}

export function AdminSettingsPage() {
  const user = useWorkspaceUser('admin')
  return <AdminSettings user={user} />
}

export function AdminDesignSystemPage() {
  useWorkspaceUser('admin')
  return <DesignSystemPage />
}

export function AdminComponentsIndexPage() {
  useWorkspaceUser('admin')
  return <ComponentsIndexPage />
}

export function AdminComponentDetailPage() {
  useWorkspaceUser('admin')
  return <ComponentDetailPage />
}

export function AdminBlocksIndexPage() {
  useWorkspaceUser('admin')
  return <BlocksIndexPage />
}

export function AdminBlockDetailPage() {
  useWorkspaceUser('admin')
  return <BlockDetailPage />
}

export function AdminStackPage() {
  useWorkspaceUser('admin')
  return <StackPage />
}

export function AdminStepsPage() {
  useWorkspaceUser('admin')
  return <StepsPage />
}

export function MentorHomePage() {
  const user = useWorkspaceUser('mentor')
  return <MentorHome user={user} />
}

export function MentorProfilePage() {
  const user = useWorkspaceUser('mentor')
  return <AccountProfile user={user} />
}

export function MentorUsersPage() {
  useWorkspaceUser('mentor')
  return <MentorUsers />
}

export function MentorMenteePage() {
  useWorkspaceUser('mentor')
  const { userId } = useParams({ from: '/mentorWorkspace/mentor/users/$userId' })
  return <MentorMenteeDiary planView={<MenteeAssignedPlans userId={userId} />} userId={userId} />
}

export function MentorSettingsPage() {
  const user = useWorkspaceUser('mentor')
  return <MentorSettings user={user} />
}

export function MentorPaymentsPage() {
  useWorkspaceUser('mentor')
  return <MentorPayments />
}

export function MentorMealPlanPage() {
  useWorkspaceUser('mentor')
  return <Navigate replace to="/mentor/plans" />
}

export function MentorAssignedRationsPage() {
  useWorkspaceUser('mentor')
  return <Navigate replace to="/mentor/plans" />
}

export function MentorPlansWorkspacePage() {
  useWorkspaceUser('mentor')
  return <MentorPlansPage />
}

export function MentorPlanDetailWorkspacePage() {
  useWorkspaceUser('mentor')
  const { planId } = useParams({ from: '/mentorWorkspace/mentor/plans/$planId' })
  return <MentorPlanDetailPage planId={planId} />
}

export function UserWorkspaceLayout() {
  return <WorkspaceRoute role="user" />
}

export function AdminWorkspaceLayout() {
  return <WorkspaceRoute role="admin" />
}

export function MentorWorkspaceLayout() {
  return <WorkspaceRoute role="mentor" />
}

export function NotFoundPage() {
  const auth = useAuth()

  if (auth.isBootstrapping) return <SessionLoadingSection />
  if (auth.sessionError && !auth.user) {
    return <SessionErrorSection retry={auth.retrySession} />
  }

  const destination = auth.user ? homePathForRole(auth.user.role) : '/login'
  return <NotFoundSection destination={destination} />
}

function WorkspaceRoute({ role }: { role: UserRole }) {
  const auth = useAuth()
  const location = useLocation()

  if (auth.isBootstrapping) return <SessionLoadingSection />
  if (auth.sessionError && !auth.user) {
    return <SessionErrorSection retry={auth.retrySession} />
  }
  if (!auth.user) {
    const returnTo = `${location.pathname}${location.searchStr}`
    return <HrefRedirect href={`/login?returnTo=${encodeURIComponent(returnTo)}`} />
  }
  if (auth.user.role !== role) {
    return <HrefRedirect href={homePathForRole(auth.user.role)} />
  }

  if (
    role === 'user'
    && !auth.user.questionnaireCompleted
    && location.pathname !== '/app/onboarding'
  ) {
    return <HrefRedirect href="/app/onboarding" />
  }

  if (
    role === 'user'
    && auth.user.questionnaireCompleted
    && location.pathname === '/app/onboarding'
  ) {
    return <HrefRedirect href="/app/general" />
  }

  return (
    <WorkspaceShell onLogout={auth.logout} user={auth.user}>
      <Outlet />
    </WorkspaceShell>
  )
}

function GuestAuthPage({
  children,
  returnTo,
}: {
  children: ReactNode
  returnTo?: string
}) {
  const auth = useAuth()

  if (auth.isBootstrapping) return <SessionLoadingSection />
  if (auth.sessionError && !auth.user) {
    return <SessionErrorSection retry={auth.retrySession} />
  }
  if (auth.user) {
    return (
      <HrefRedirect
        href={postAuthPath(
          auth.user.role,
          returnTo,
          auth.user.questionnaireCompleted,
        )}
      />
    )
  }

  return children
}

function useWorkspaceUser(role: UserRole): UserDto {
  const user = useAuth().user
  if (!user || user.role !== role) {
    throw new Error(`${role} workspace page rendered outside its guarded layout`)
  }
  return user
}

function HrefRedirect({ href }: { href: string }) {
  const router = useRouter()
  const hasRedirected = useRef(false)
  useLayoutEffect(() => {
    if (hasRedirected.current) return
    hasRedirected.current = true
    router.history.replace(href)
  }, [href, router])
  return <SessionLoadingSection />
}
