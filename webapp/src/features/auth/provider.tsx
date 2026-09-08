import { useQueryClient } from '@tanstack/react-query'
import type {
  LoginRequest,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
  RegisterRequest,
} from '@web-app-demo/contracts'
import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { AuthApi } from './api'
import {
  clearAuthenticatedSession,
  useCurrentUserQuery,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
} from './queries'
import { AuthContext, type AuthContextValue } from './context'
import { bootstrapAuthSession } from './bootstrap'
import {
  currentBrowserSessionEpoch,
  subscribeToBrowserSessionChanges,
} from './session-coordinator'
import { isAuthSessionPending } from './session-status'

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const [accessToken, setAccessTokenState] = useState<string | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [bootstrapError, setBootstrapError] = useState<Error | null>(null)
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0)
  const [, setSessionEpoch] = useState(currentBrowserSessionEpoch)
  const bootstrapGeneration = useRef(0)
  const accessTokenRef = useRef<string | null>(null)

  const setAccessToken = useCallback((nextAccessToken: string | null) => {
    accessTokenRef.current = nextAccessToken
    setAccessTokenState(nextAccessToken)
  }, [])
  const clearLocalSession = useCallback(async () => {
    await clearAuthenticatedSession(queryClient, setAccessToken)
  }, [queryClient, setAccessToken])
  const handleAuthExpired = useCallback(async () => {
    await clearLocalSession()
  }, [clearLocalSession])

  useEffect(
    () =>
      subscribeToBrowserSessionChanges((sessionEvent) => {
        const generation = ++bootstrapGeneration.current
        const shouldBootstrap = sessionEvent.state === 'authenticated'
        setSessionEpoch(sessionEvent.epoch)
        setBootstrapError(null)
        setIsBootstrapping(shouldBootstrap)
        void clearLocalSession()
          .catch(() => undefined)
          .then(() => {
            if (bootstrapGeneration.current !== generation) return
            if (shouldBootstrap) {
              setBootstrapAttempt((attempt) => attempt + 1)
            } else {
              setIsBootstrapping(false)
            }
          })
      }),
    [clearLocalSession],
  )

  const api = useMemo(
    () =>
      new AuthApi({
        getAccessToken: () => accessTokenRef.current,
        setAccessToken,
        onAuthExpired: handleAuthExpired,
      }),
    [handleAuthExpired, setAccessToken],
  )

  useEffect(() => {
    let isMounted = true
    const generation = ++bootstrapGeneration.current
    const shouldApply = () => isMounted && bootstrapGeneration.current === generation
    const bootstrapApi = new AuthApi({
      getAccessToken: () => null,
      setAccessToken,
      onAuthExpired: handleAuthExpired,
    })

    bootstrapAuthSession({
      api: bootstrapApi,
      shouldApply,
      setAccessToken,
    })
      .catch((error: unknown) => {
        if (shouldApply()) {
          setBootstrapError(toError(error))
        }
      })
      .finally(() => {
        if (shouldApply()) {
          setIsBootstrapping(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [bootstrapAttempt, handleAuthExpired, setAccessToken])

  const meQuery = useCurrentUserQuery({
    api,
    enabled: Boolean(accessToken),
  })
  const { mutateAsync: registerAsync } = useRegisterMutation({ api, setAccessToken })
  const { mutateAsync: loginAsync } = useLoginMutation({ api, setAccessToken })
  const { mutateAsync: logoutAsync } = useLogoutMutation({ api, setAccessToken })

  const register = useCallback(
    async (input: RegisterRequest) => {
      await registerAsync(input)
    },
    [registerAsync],
  )

  const login = useCallback(
    async (input: LoginRequest) => {
      await loginAsync(input)
    },
    [loginAsync],
  )

  const lookupRegistrationMentor = useCallback(
    (identifier: string) => api.lookupRegistrationMentor({ identifier }),
    [api],
  )
  const lookupReferrer = useCallback(
    (code: string) => api.lookupReferrer({ code }),
    [api],
  )

  const logout = useCallback(async () => {
    await logoutAsync()
  }, [logoutAsync])

  const requestPasswordReset = useCallback(
    async (input: PasswordResetRequest) => {
      return api.requestPasswordReset(input)
    },
    [api],
  )

  const confirmPasswordReset = useCallback(
    async (input: PasswordResetConfirmRequest) => {
      const transition = await api.confirmPasswordReset(input)
      if (!api.isSessionEpochCurrent(transition.sessionEpoch)) return
      await clearLocalSession()
    },
    [api, clearLocalSession],
  )

  const retrySession = useCallback(async () => {
    if (accessTokenRef.current) {
      await meQuery.refetch()
      return
    }

    // Await the bootstrap round-trip so "Повторить" stays pending until the
    // session check finishes (effect-only retries returned before refresh settled).
    setIsBootstrapping(true)
    setBootstrapError(null)
    const generation = ++bootstrapGeneration.current
    const shouldApply = () => bootstrapGeneration.current === generation
    const bootstrapApi = new AuthApi({
      getAccessToken: () => null,
      setAccessToken,
      onAuthExpired: handleAuthExpired,
    })

    try {
      await bootstrapAuthSession({
        api: bootstrapApi,
        shouldApply,
        setAccessToken,
      })
    } catch (error: unknown) {
      if (shouldApply()) {
        setBootstrapError(toError(error))
      }
    } finally {
      if (shouldApply()) {
        setIsBootstrapping(false)
      }
    }
  }, [handleAuthExpired, meQuery, setAccessToken])

  const sessionError = bootstrapError ?? (accessToken ? toOptionalError(meQuery.error) : null)
  const isSessionPending = isAuthSessionPending({
    isRefreshing: isBootstrapping,
    accessToken,
    user: meQuery.data?.user ?? null,
    meError: sessionError,
  })

  const transport = useMemo(
    () => ({
      request: api.requestAuthenticated.bind(api),
    }),
    [api],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data?.user ?? null,
      isBootstrapping: isSessionPending,
      isAuthenticated: Boolean(meQuery.data?.user),
      sessionError,
      retrySession,
      transport,
      register,
      lookupRegistrationMentor,
      lookupReferrer,
      login,
      logout,
      requestPasswordReset,
      confirmPasswordReset,
    }),
    [confirmPasswordReset, isSessionPending, login, logout, lookupReferrer, lookupRegistrationMentor, meQuery.data?.user, register, requestPasswordReset, retrySession, sessionError, transport],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function toOptionalError(error: unknown) {
  return error === null || error === undefined ? null : toError(error)
}

function toError(error: unknown) {
  return error instanceof Error ? error : new Error('Unknown session error')
}
