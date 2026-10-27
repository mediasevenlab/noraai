import {
  Navigate,
  Outlet,
  useLocation,
  useParams,
  useRouter,
  useSearch,
} from '@tanstack/react-router'
import type { UserDto, UserRole } from '@web-app-demo/contracts'
import { useLayoutEffect, useRef, type ReactNode } from 'react'

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
import { AuthMercuryOrb } from '@/features/auth/components/AuthMercuryOrb'
import { DialogsPage, DialogsRuntimeProvider } from '@/features/dialogs'
import { NotesPage } from '@/features/notes'
import { MeetingsPage } from '@/features/meetings'
import { homePathForRole, postAuthPath } from '@/features/navigation'
import { NewsPage } from '@/features/news'
import { useDismissAppBootSplash } from '@/platform/app-boot-splash'
import {
  MentorMenteeDiary,
  MentorProfile,
  MentorSettings,
  MentorUsers,
} from '@/features/mentor'
import {
  AccountProfile,
  UserHome,
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
      <HrefRedirect href={postAuthPath(auth.user.role, returnTo)} />
    )
  }
  const destination = ref
    ? `/signup?ref=${encodeURIComponent(ref)}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}`
    : returnTo
      ? `/login?returnTo=${encodeURIComponent(returnTo)}`
      : '/login'
  return <HrefRedirect href={destination} />
}

export function AuthDemoEmbedPage() {
  useDismissAppBootSplash()
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <div className="absolute inset-0 flex items-center justify-center">
        <AuthMercuryOrb />
      </div>
    </div>
  )
}

export function LoginPage() {
  const { returnTo } = useSearch({ from: '/login' })
  return (
    <GuestAuthPage returnTo={returnTo}>
      <AuthPageShell>
        <LoginForm returnTo={returnTo} />
      </AuthPageShell>
    </GuestAuthPage>
  )
}

export function SignupPage() {
  const { ref, returnTo } = useSearch({ from: '/signup' })

  return (
    <GuestAuthPage returnTo={returnTo}>
      <AuthPageShell>
        <RegisterForm referralCode={ref} returnTo={returnTo} />
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
  return <Navigate replace to="/app/dialogs" />
}

export function UserFeedRedirectPage() {
  useWorkspaceUser('user')
  return <Navigate replace to="/app/dialogs" />
}

export function MentorFeedRedirectPage() {
  useWorkspaceUser('mentor')
  return <Navigate replace to="/mentor/dialogs" />
}

export function UserNewsPage() {
  useWorkspaceUser('user')
  return <Navigate replace to="/app/dialogs" />
}

export function MentorNewsPage() {
  useWorkspaceUser('mentor')
  return <Navigate replace to="/mentor/dialogs" />
}

export function UserDialogsPage() {
  useWorkspaceUser('user')
  return <DialogsPage />
}

export function UserMeetingsPage() {
  useWorkspaceUser('user')
  return <MeetingsPage />
}

export function UserNotesPage() {
  useWorkspaceUser('user')
  return <NotesPage />
}

export function MentorDialogsPage() {
  useWorkspaceUser('mentor')
  return <DialogsPage />
}

export function MentorMeetingsPage() {
  useWorkspaceUser('mentor')
  return <MeetingsPage />
}

export function MentorNotesPage() {
  useWorkspaceUser('mentor')
  return <NotesPage />
}

export function AdminNewsPage() {
  useWorkspaceUser('admin')
  return <NewsPage />
}

export function UserRationsPage() {
  useWorkspaceUser('user')
  return <Navigate replace to="/app/dialogs" />
}

export function UserMentorRationsPage() {
  useWorkspaceUser('user')
  return <Navigate replace to="/app/dialogs" />
}

export function UserMyRationsPage() {
  useWorkspaceUser('user')
  return <Navigate replace to="/app/dialogs" />
}

export function UserPlanPage() {
  useWorkspaceUser('user')
  return <Navigate replace to="/app/dialogs" />
}

export function UserGeneralPage() {
  useWorkspaceUser('user')
  return <Navigate replace to="/app/dialogs" />
}

export function UserPlanCurrentPage() {
  useWorkspaceUser('user')
  return <Navigate replace to="/app/dialogs" />
}

export function UserPlanDetailPage() {
  useWorkspaceUser('user')
  return <Navigate replace to="/app/dialogs" />
}

export function UserSavedPage() {
  return <Navigate replace to="/app/dialogs" />
}

export function UserOnboardingPage() {
  useWorkspaceUser('user')
  return <Navigate replace to="/app/dialogs" />
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
  return <Navigate replace to="/app/dialogs" />
}

export function AdminHomeRedirectPage() {
  return <Navigate replace to="/admin/users" />
}

export function AdminProfilePage() {
  const user = useWorkspaceUser('admin')
  return <AccountProfile user={user} />
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
  useWorkspaceUser('mentor')
  return <Navigate replace to="/mentor/dialogs" />
}

export function MentorProfilePage() {
  const user = useWorkspaceUser('mentor')
  return <MentorProfile user={user} />
}

export function MentorUsersPage() {
  const user = useWorkspaceUser('mentor')
  return <MentorUsers user={user} />
}

export function MentorMenteePage() {
  useWorkspaceUser('mentor')
  const { userId } = useParams({ from: '/mentorWorkspace/mentor/users/$userId' })
  return <MentorMenteeDiary userId={userId} />
}

export function MentorSettingsPage() {
  const user = useWorkspaceUser('mentor')
  return <MentorSettings user={user} />
}

export function MentorPaymentsPage() {
  useWorkspaceUser('mentor')
  return <Navigate replace to="/mentor/dialogs" />
}

export function MentorMealPlanPage() {
  useWorkspaceUser('mentor')
  return <Navigate replace to="/mentor/dialogs" />
}

export function MentorAssignedRationsPage() {
  useWorkspaceUser('mentor')
  return <Navigate replace to="/mentor/dialogs" />
}

export function MentorPlansWorkspacePage() {
  useWorkspaceUser('mentor')
  return <Navigate replace to="/mentor/dialogs" />
}

export function MentorPlanDetailWorkspacePage() {
  useWorkspaceUser('mentor')
  return <Navigate replace to="/mentor/dialogs" />
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

  if (role === 'mentor') {
    return (
      <DialogsRuntimeProvider key={auth.user.id} userId={auth.user.id}>
        <WorkspaceShell onLogout={auth.logout} user={auth.user}>
          <Outlet />
        </WorkspaceShell>
      </DialogsRuntimeProvider>
    )
  }

  if (role !== 'user') {
    return (
      <WorkspaceShell onLogout={auth.logout} user={auth.user}>
        <Outlet />
      </WorkspaceShell>
    )
  }

  return (
    <DialogsRuntimeProvider key={auth.user.id} userId={auth.user.id}>
      <WorkspaceShell onLogout={auth.logout} user={auth.user}>
        <Outlet />
      </WorkspaceShell>
    </DialogsRuntimeProvider>
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
      <HrefRedirect href={postAuthPath(auth.user.role, returnTo)} />
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
