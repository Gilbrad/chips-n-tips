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

const AuthContext = createContext<AuthContextValue | null>(null)

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

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (mounted) {
          setUser(data.user)
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (mounted) {
          setUser(null)
          setIsLoading(false)
        }
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [isConfigured])

  const signOut = useCallback(async () => {
    if (isConfigured) {
      await createClient().auth.signOut()
    }

    setUser(null)
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
