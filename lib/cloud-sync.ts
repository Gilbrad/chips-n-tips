'use client'

import { createDefaultPreferences } from '@/lib/defaults'
import type {
  Category,
  FinanceSnapshot,
  PaymentDate,
  Transaction,
  UserPreferences,
} from '@/lib/finance-types'
import {
  loadSyncSnapshot,
  markFinanceSnapshotSynced,
  mergeRemoteFinanceSnapshot,
} from '@/lib/offline-db'
import {
  createClient,
  hasSupabaseConfig,
} from '@/lib/supabase/client'

const PAGE_SIZE = 500

interface CategoryRow {
  archived_at: string | null
  color: string
  created_at: string
  id: string
  is_default: boolean
  name: string
  type: Category['type']
  updated_at: string
  user_id: string
}

interface TransactionRow {
  amount: number | string
  category_id: string
  created_at: string
  description: string
  id: string
  occurred_on: string
  type: Transaction['type']
  updated_at: string
  user_id: string
}

interface PaymentDateRow {
  amount: number | string | null
  category_id: string | null
  created_at: string
  due_on: string
  id: string
  notes: string | null
  paid_at: string | null
  recurrence: PaymentDate['recurrence']
  title: string
  updated_at: string
  user_id: string
}

interface PreferencesRow {
  created_at: string
  currency: string
  updated_at: string
  user_id: string
}

type SyncTable =
  | 'categories'
  | 'payment_dates'
  | 'transactions'
  | 'user_preferences'

async function fetchAllRows(table: SyncTable, userId: string) {
  const supabase = createClient()
  const rows: unknown[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      throw error
    }

    const page = data ?? []
    rows.push(...page)

    if (page.length < PAGE_SIZE) {
      return rows
    }

    from += PAGE_SIZE
  }
}

function categoryFromRow(row: CategoryRow): Category {
  return {
    archivedAt: row.archived_at ?? undefined,
    color: row.color,
    createdAt: row.created_at,
    id: row.id,
    isDefault: row.is_default,
    name: row.name,
    syncStatus: 'synced',
    type: row.type,
    updatedAt: row.updated_at,
    userId: row.user_id,
  }
}

function transactionFromRow(row: TransactionRow): Transaction {
  return {
    amount: Number(row.amount),
    categoryId: row.category_id,
    createdAt: row.created_at,
    description: row.description,
    id: row.id,
    occurredOn: row.occurred_on,
    syncStatus: 'synced',
    type: row.type,
    updatedAt: row.updated_at,
    userId: row.user_id,
  }
}

function paymentDateFromRow(row: PaymentDateRow): PaymentDate {
  return {
    amount: row.amount === null ? undefined : Number(row.amount),
    categoryId: row.category_id ?? undefined,
    createdAt: row.created_at,
    dueOn: row.due_on,
    id: row.id,
    notes: row.notes ?? undefined,
    paidAt: row.paid_at ?? undefined,
    recurrence: row.recurrence,
    syncStatus: 'synced',
    title: row.title,
    updatedAt: row.updated_at,
    userId: row.user_id,
  }
}

function preferencesFromRow(
  row: PreferencesRow | undefined,
  userId: string,
): UserPreferences {
  if (!row) {
    return {
      ...createDefaultPreferences(userId),
      syncStatus: 'synced',
    }
  }

  return {
    createdAt: row.created_at,
    currency: row.currency,
    syncStatus: 'synced',
    updatedAt: row.updated_at,
    userId: row.user_id,
  }
}

async function loadRemoteSnapshot(userId: string): Promise<FinanceSnapshot> {
  const [categoryRows, paymentDateRows, preferencesRows, transactionRows] =
    await Promise.all([
      fetchAllRows('categories', userId),
      fetchAllRows('payment_dates', userId),
      fetchAllRows('user_preferences', userId),
      fetchAllRows('transactions', userId),
    ])

  return {
    categories: (categoryRows as CategoryRow[]).map(categoryFromRow),
    paymentDates: (paymentDateRows as PaymentDateRow[]).map(paymentDateFromRow),
    preferences: preferencesFromRow(
      (preferencesRows as PreferencesRow[])[0],
      userId,
    ),
    transactions: (transactionRows as TransactionRow[]).map(transactionFromRow),
  }
}

function categoryToRow(category: Category): CategoryRow {
  return {
    archived_at: category.archivedAt ?? null,
    color: category.color,
    created_at: category.createdAt,
    id: category.id,
    is_default: category.isDefault,
    name: category.name,
    type: category.type,
    updated_at: category.updatedAt,
    user_id: category.userId,
  }
}

function transactionToRow(transaction: Transaction): TransactionRow {
  return {
    amount: transaction.amount,
    category_id: transaction.categoryId,
    created_at: transaction.createdAt,
    description: transaction.description,
    id: transaction.id,
    occurred_on: transaction.occurredOn,
    type: transaction.type,
    updated_at: transaction.updatedAt,
    user_id: transaction.userId,
  }
}

function paymentDateToRow(paymentDate: PaymentDate): PaymentDateRow {
  return {
    amount: paymentDate.amount ?? null,
    category_id: paymentDate.categoryId ?? null,
    created_at: paymentDate.createdAt,
    due_on: paymentDate.dueOn,
    id: paymentDate.id,
    notes: paymentDate.notes ?? null,
    paid_at: paymentDate.paidAt ?? null,
    recurrence: paymentDate.recurrence,
    title: paymentDate.title,
    updated_at: paymentDate.updatedAt,
    user_id: paymentDate.userId,
  }
}

function preferencesToRow(preferences: UserPreferences): PreferencesRow {
  return {
    created_at: preferences.createdAt,
    currency: preferences.currency,
    updated_at: preferences.updatedAt,
    user_id: preferences.userId,
  }
}

async function pushPendingSnapshot(snapshot: FinanceSnapshot) {
  const supabase = createClient()
  const categories = snapshot.categories.filter(
    (category) => category.syncStatus !== 'synced',
  )
  const transactions = snapshot.transactions.filter(
    (transaction) => transaction.syncStatus !== 'synced',
  )
  const paymentDates = snapshot.paymentDates.filter(
    (paymentDate) => paymentDate.syncStatus !== 'synced',
  )

  if (categories.length > 0) {
    const { error } = await supabase
      .from('categories')
      .upsert(categories.map(categoryToRow), { onConflict: 'id' })

    if (error) throw error
  }

  if (transactions.length > 0) {
    const { error } = await supabase
      .from('transactions')
      .upsert(transactions.map(transactionToRow), { onConflict: 'id' })

    if (error) throw error
  }

  if (paymentDates.length > 0) {
    const { error } = await supabase
      .from('payment_dates')
      .upsert(paymentDates.map(paymentDateToRow), { onConflict: 'id' })

    if (error) throw error
  }

  if (snapshot.preferences.syncStatus !== 'synced') {
    const { error } = await supabase
      .from('user_preferences')
      .upsert(preferencesToRow(snapshot.preferences), {
        onConflict: 'user_id',
      })

    if (error) throw error
  }
}

export function canSyncToCloud() {
  return (
    hasSupabaseConfig() &&
    typeof navigator !== 'undefined' &&
    navigator.onLine
  )
}

export async function syncUserFinance(userId: string) {
  if (!canSyncToCloud()) {
    return false
  }

  const remote = await loadRemoteSnapshot(userId)
  await mergeRemoteFinanceSnapshot(userId, remote)

  const pendingSnapshot = await loadSyncSnapshot(userId)
  await pushPendingSnapshot(pendingSnapshot)
  await markFinanceSnapshotSynced(pendingSnapshot)

  return true
}
