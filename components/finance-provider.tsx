'use client'

import type { User } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/components/auth-provider'
import { DEFAULT_CURRENCY } from '@/lib/defaults'
import { syncUserFinance } from '@/lib/cloud-sync'
import {
  addCategory as persistCategory,
  addPaymentDate as persistPaymentDate,
  addTransaction as persistTransaction,
  archiveCategory as persistCategoryArchive,
  deleteTransaction as persistTransactionDelete,
  deletePaymentDate as persistPaymentDateDelete,
  importLocalDataForUser as persistLocalDataImport,
  loadFinanceSnapshot,
  loadRemoteSyncMetadata,
  togglePaymentDatePaid as persistPaymentDateToggle,
  updateTransaction as persistTransactionUpdate,
  updateCurrency as persistCurrency,
} from '@/lib/offline-db'
import {
  LOCAL_USER_ID,
  type Category,
  type PaymentDate,
  type Recurrence,
  type Transaction,
  type TransactionType,
  type UserPreferences,
} from '@/lib/finance-types'

interface TransactionInput {
  amount: number
  categoryId: string
  description: string
  occurredOn: string
  type: TransactionType
}

interface CategoryInput {
  color: string
  name: string
  type: TransactionType
}

interface PaymentDateInput {
  amount?: number
  categoryId?: string
  dueEndOn?: string
  dueOn: string
  notes?: string
  recurrence: Recurrence
  title: string
}

interface FinanceContextValue {
  addCategory: (input: CategoryInput) => Promise<Category>
  addPaymentDate: (input: PaymentDateInput) => Promise<PaymentDate>
  addTransaction: (input: TransactionInput) => Promise<Transaction>
  archiveCategory: (id: string) => Promise<void>
  categories: Category[]
  currency: string
  deleteTransaction: (id: string) => Promise<void>
  deletePaymentDate: (id: string) => Promise<void>
  importLocalData: () => Promise<{ paymentDates: number; transactions: number }>
  isLoading: boolean
  lastSyncedAt: string | null
  paymentDates: PaymentDate[]
  preferences: UserPreferences | null
  refresh: () => Promise<void>
  setCurrency: (currency: string) => Promise<void>
  syncNow: () => Promise<boolean>
  syncState: SyncState
  togglePaymentDatePaid: (id: string) => Promise<void>
  transactions: Transaction[]
  updateTransaction: (
    id: string,
    input: TransactionInput,
  ) => Promise<Transaction>
  userId: string
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

export type SyncState = 'error' | 'local' | 'offline' | 'synced' | 'syncing'

function sortTransactions(transactions: Transaction[]) {
  return [...transactions].sort((first, second) =>
    second.occurredOn.localeCompare(first.occurredOn),
  )
}

function sortPaymentDates(paymentDates: PaymentDate[]) {
  return [...paymentDates].sort((first, second) =>
    first.dueOn.localeCompare(second.dueOn),
  )
}

function sortCategories(categories: Category[]) {
  return [...categories].sort((first, second) => {
    if (first.type !== second.type) {
      return first.type === 'expense' ? -1 : 1
    }

    return first.name.localeCompare(second.name)
  })
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? LOCAL_USER_ID

  return (
    <FinanceSessionProvider key={userId} user={user} userId={userId}>
      {children}
    </FinanceSessionProvider>
  )
}

function FinanceSessionProvider({
  children,
  user,
  userId,
}: {
  children: ReactNode
  user: User | null
  userId: string
}) {
  const [categories, setCategories] = useState<Category[]>([])
  const [paymentDates, setPaymentDates] = useState<PaymentDate[]>([])
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [syncState, setSyncState] = useState<SyncState>(
    user ? 'offline' : 'local',
  )
  const isSignedIn = Boolean(user)
  const queuedSyncAfterCurrent = useRef(false)
  const queuedSyncTimeout = useRef<number | null>(null)
  const syncInFlight = useRef<Promise<boolean> | null>(null)

  const refresh = useCallback(async () => {
    await Promise.resolve()
    setIsLoading(true)

    try {
      const snapshot = await loadFinanceSnapshot(userId)
      setCategories(sortCategories(snapshot.categories))
      setPaymentDates(sortPaymentDates(snapshot.paymentDates))
      setPreferences(snapshot.preferences)
      setTransactions(sortTransactions(snapshot.transactions))
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const syncNow = useCallback(async () => {
    if (!user) {
      setSyncState('local')
      return false
    }

    if (syncInFlight.current) {
      return syncInFlight.current
    }

    const runSyncOnce = async () => {
      setSyncState('syncing')

      try {
        const synced = await syncUserFinance(userId)

        if (!synced) {
          setSyncState('offline')
          return false
        }

        const snapshot = await loadFinanceSnapshot(userId)
        setCategories(sortCategories(snapshot.categories))
        setPaymentDates(sortPaymentDates(snapshot.paymentDates))
        setPreferences(snapshot.preferences)
        setTransactions(sortTransactions(snapshot.transactions))
        const syncMetadata = await loadRemoteSyncMetadata(userId)
        setLastSyncedAt(syncMetadata?.updatedAt ?? null)
        setSyncState('synced')

        return true
      } catch {
        setSyncState('error')
        return false
      }
    }

    const syncPromise = (async () => {
      let latestResult = false

      try {
        do {
          queuedSyncAfterCurrent.current = false
          latestResult = await runSyncOnce()
        } while (queuedSyncAfterCurrent.current)

        return latestResult
      } finally {
        syncInFlight.current = null
      }
    })()

    syncInFlight.current = syncPromise
    return syncPromise
  }, [user, userId])

  const queueCloudBackup = useCallback(() => {
    if (!user) {
      return
    }

    if (queuedSyncTimeout.current) {
      window.clearTimeout(queuedSyncTimeout.current)
    }

    queuedSyncTimeout.current = window.setTimeout(() => {
      queuedSyncTimeout.current = null

      if (syncInFlight.current) {
        queuedSyncAfterCurrent.current = true
        return
      }

      void syncNow()
    }, 1500)
  }, [syncNow, user])

  useEffect(() => {
    return () => {
      if (queuedSyncTimeout.current) {
        window.clearTimeout(queuedSyncTimeout.current)
      }
    }
  }, [])

  useEffect(() => {
    let active = true
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true)

      void loadFinanceSnapshot(userId)
        .then((snapshot) => {
          if (!active) {
            return
          }

          setCategories(sortCategories(snapshot.categories))
          setPaymentDates(sortPaymentDates(snapshot.paymentDates))
          setPreferences(snapshot.preferences)
          setTransactions(sortTransactions(snapshot.transactions))

          if (isSignedIn) {
            return loadRemoteSyncMetadata(userId)
          }
        })
        .then((syncMetadata) => {
          if (!active || !isSignedIn) {
            return
          }

          setLastSyncedAt(syncMetadata?.updatedAt ?? null)
        })
        .finally(() => {
          if (active) {
            setIsLoading(false)
          }
        })
    }, 0)

    return () => {
      active = false
      window.clearTimeout(timeoutId)
    }
  }, [isSignedIn, userId])

  useEffect(() => {
    if (!user) {
      return
    }

    const syncWhenOnline = () => {
      void syncNow()
    }
    const markOffline = () => {
      setSyncState('offline')
    }
    const timeoutId = window.setTimeout(syncWhenOnline, 350)

    window.addEventListener('online', syncWhenOnline)
    window.addEventListener('offline', markOffline)

    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener('online', syncWhenOnline)
      window.removeEventListener('offline', markOffline)
    }
  }, [syncNow, user])

  const addTransaction = useCallback(
    async (input: TransactionInput) => {
      const transaction = await persistTransaction({ ...input, userId })

      setTransactions((current) => sortTransactions([transaction, ...current]))
      queueCloudBackup()

      return transaction
    },
    [queueCloudBackup, userId],
  )

  const updateTransaction = useCallback(
    async (id: string, input: TransactionInput) => {
      const transaction = await persistTransactionUpdate(id, userId, input)

      if (!transaction) {
        throw new Error('Transaction could not be updated.')
      }

      setTransactions((current) =>
        sortTransactions(
          current.map((item) =>
            item.id === transaction.id ? transaction : item,
          ),
        ),
      )
      queueCloudBackup()

      return transaction
    },
    [queueCloudBackup, userId],
  )

  const deleteTransaction = useCallback(
    async (id: string) => {
      const transaction = await persistTransactionDelete(id, userId)

      if (!transaction) {
        return
      }

      setTransactions((current) =>
        current.filter((item) => item.id !== transaction.id),
      )
      queueCloudBackup()
    },
    [queueCloudBackup, userId],
  )

  const deletePaymentDate = useCallback(
    async (id: string) => {
      const paymentDate = await persistPaymentDateDelete(id, userId)

      if (!paymentDate) {
        return
      }

      setPaymentDates((current) =>
        current.filter((item) => item.id !== paymentDate.id),
      )
      queueCloudBackup()
    },
    [queueCloudBackup, userId],
  )

  const addCategory = useCallback(
    async (input: CategoryInput) => {
      const category = await persistCategory({ ...input, userId })

      setCategories((current) => sortCategories([category, ...current]))
      queueCloudBackup()

      return category
    },
    [queueCloudBackup, userId],
  )

  const archiveCategory = useCallback(
    async (id: string) => {
      await persistCategoryArchive(id)
      setCategories((current) =>
        current.filter((category) => category.id !== id),
      )
      queueCloudBackup()
    },
    [queueCloudBackup],
  )

  const addPaymentDate = useCallback(
    async (input: PaymentDateInput) => {
      const paymentDate = await persistPaymentDate({ ...input, userId })

      setPaymentDates((current) => sortPaymentDates([...current, paymentDate]))
      queueCloudBackup()

      return paymentDate
    },
    [queueCloudBackup, userId],
  )

  const togglePaymentDatePaid = useCallback(
    async (id: string) => {
      const updated = await persistPaymentDateToggle(id, userId)

      if (!updated) {
        return
      }

      setPaymentDates((current) =>
        sortPaymentDates(
          current.map((paymentDate) =>
            paymentDate.id === id ? updated : paymentDate,
          ),
        ),
      )
      queueCloudBackup()
    },
    [queueCloudBackup, userId],
  )

  const setCurrency = useCallback(
    async (currency: string) => {
      const updated = await persistCurrency(userId, currency)
      setPreferences(updated)
      queueCloudBackup()
    },
    [queueCloudBackup, userId],
  )

  const importLocalData = useCallback(async () => {
    if (!user) {
      throw new Error('Sign in before importing local data.')
    }

    const result = await persistLocalDataImport(userId)
    await refresh()
    queueCloudBackup()

    return result
  }, [queueCloudBackup, refresh, user, userId])

  const value = useMemo(
    () => ({
      addCategory,
      addPaymentDate,
      addTransaction,
      archiveCategory,
      categories,
      currency: preferences?.currency ?? DEFAULT_CURRENCY,
      deleteTransaction,
      deletePaymentDate,
      importLocalData,
      isLoading,
      lastSyncedAt,
      paymentDates,
      preferences,
      refresh,
      setCurrency,
      syncNow,
      syncState,
      togglePaymentDatePaid,
      transactions,
      updateTransaction,
      userId,
    }),
    [
      addCategory,
      addPaymentDate,
      addTransaction,
      archiveCategory,
      categories,
      deleteTransaction,
      deletePaymentDate,
      importLocalData,
      isLoading,
      lastSyncedAt,
      paymentDates,
      preferences,
      refresh,
      setCurrency,
      syncNow,
      syncState,
      togglePaymentDatePaid,
      transactions,
      updateTransaction,
      userId,
    ],
  )

  return (
    <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
  )
}

export function useFinance() {
  const context = useContext(FinanceContext)

  if (!context) {
    throw new Error('useFinance must be used inside FinanceProvider.')
  }

  return context
}
