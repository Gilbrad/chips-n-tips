export type TransactionType = 'income' | 'expense'

export type SyncStatus = 'local' | 'pending' | 'synced' | 'error'

export type Recurrence = 'none' | 'weekly' | 'monthly' | 'yearly'

export const LOCAL_USER_ID = 'local-device-user'

export interface Category {
  id: string
  userId: string
  name: string
  type: TransactionType
  color: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
  archivedAt?: string
  syncStatus: SyncStatus
}

export interface Transaction {
  id: string
  userId: string
  categoryId: string
  description: string
  amount: number
  type: TransactionType
  occurredOn: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  syncStatus: SyncStatus
}

export interface PaymentDate {
  id: string
  userId: string
  title: string
  amount?: number
  categoryId?: string
  dueOn: string
  dueEndOn?: string
  recurrence: Recurrence
  notes?: string
  paidAt?: string
  createdAt: string
  updatedAt: string
  syncStatus: SyncStatus
}

export interface UserPreferences {
  userId: string
  currency: string
  createdAt: string
  updatedAt: string
  syncStatus: SyncStatus
}

export interface FinanceSnapshot {
  categories: Category[]
  paymentDates: PaymentDate[]
  preferences: UserPreferences
  transactions: Transaction[]
}
