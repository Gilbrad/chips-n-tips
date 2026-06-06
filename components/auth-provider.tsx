'use client'

import type { User } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createClient,
  hasSupabaseConfig,
} from '@/lib/supabase/client'

interface AuthContextValue {
  isConfigured: boolean
  isLoading: boolean
  signOut: () => Promise<void>
  user: User | null
}

const OFFLINE_USER_KEY = 'chipsntips:last-verified-user'
const AuthContext = createContext<AuthContextValue | null>(null)

function readOfflineUser(): User | null {
  try {
    const value = window.localStorage.getItem(OFFLINE_USER_KEY)
    const user = value ? (JSON.parse(value) as User) : null

    return user?.id ? user : null
  } catch {
    return null
  }
}

function rememberOfflineUser(user: User | null) {
  try {
    if (user) {
      window.localStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(user))
    } else {
      window.localStorage.removeItem(OFFLINE_USER_KEY)
    }
  } catch {
    // Private browsing and storage policies can make localStorage unavailable.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const isConfigured = hasSupabaseConfig()
  const [isLoading, setIsLoading] = useState(isConfigured)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    if (!isConfigured) {
      return
    }

    let mounted = true
    const supabase = createClient()

    const applyVerifiedUser = (verifiedUser: User | null) => {
      if (!mounted) {
        return
      }

      setUser(verifiedUser)
      setIsLoading(false)
      rememberOfflineUser(verifiedUser)
    }

    const verifyOnlineSession = () => {
      if (!navigator.onLine) {
        return
      }

      void supabase.auth
        .getUser()
        .then(({ data, error }) => {
          if (!error) {
            applyVerifiedUser(data.user)
          }
        })
        .catch(() => undefined)
    }

    const cachedUser = readOfflineUser()

    if (cachedUser || !navigator.onLine) {
      void Promise.resolve().then(() => {
        if (mounted) {
          setUser(cachedUser)
          setIsLoading(false)
        }
      })
    }

    if (navigator.onLine) {
      void supabase.auth
        .getSession()
        .then(({ data }) => {
          if (mounted && data.session?.user) {
            setUser(data.session.user)
            setIsLoading(false)
          }
        })
        .catch(() => undefined)
        .finally(verifyOnlineSession)
    }

    window.addEventListener('online', verifyOnlineSession)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        setIsLoading(false)
        rememberOfflineUser(session.user)
      } else if (navigator.onLine) {
        setUser(null)
        setIsLoading(false)
        rememberOfflineUser(null)
      }
    })

    return () => {
      mounted = false
      window.removeEventListener('online', verifyOnlineSession)
      subscription.unsubscribe()
    }
  }, [isConfigured])

  const signOut = useCallback(async () => {
    if (isConfigured) {
      try {
        await createClient().auth.signOut({ scope: 'local' })
      } finally {
        rememberOfflineUser(null)
        setUser(null)
      }
    } else {
      rememberOfflineUser(null)
      setUser(null)
    }
  }, [isConfigured])

  const value = useMemo(
    () => ({
      isConfigured,
      isLoading,
      signOut,
      user,
    }),
    [isConfigured, isLoading, signOut, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }

  return context
}
