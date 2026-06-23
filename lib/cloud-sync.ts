'use client'

import { createDefaultPreferences } from '@/lib/defaults'
import type {
  Category,
  FinanceSnapshot,
  PaymentDate,
  RemoteFinanceSnapshot,
  Transaction,
  UserPreferences,
} from '@/lib/finance-types'
import {
  loadRemoteSyncMetadata,
  loadSyncSnapshot,
  markFinanceSnapshotSynced,
  mergeRemoteFinanceSnapshot,
  saveRemoteSyncMetadata,
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
  deleted_at: string | null
  description: string
  id: string
  occurred_on: string | null
  type: Transaction['type']
  updated_at: string
  user_id: string
}

interface PaymentDateRow {
  amount: number | string | null
  category_id: string | null
  created_at: string
  deleted_at: string | null
  due_end_on: string | null
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

interface RemoteSyncWatermarks {
  categoryUpdatedAt?: string
  paymentDateUpdatedAt?: string
  preferenceUpdatedAt?: string
  transactionUpdatedAt?: string
}

function toStoredDate(value: string | null | undefined, fallback: string) {
  const candidate = value || fallback

  if (/^\d{4}-\d{2}-\d{2}/.test(candidate)) {
    return candidate.slice(0, 10)
  }

  return new Date().toISOString().slice(0, 10)
}

function maxUpdatedAt(rows: Array<{ updated_at: string }>) {
  return rows.reduce<string | undefined>((latest, row) => {
    if (!latest || row.updated_at > latest) {
      return row.updated_at
    }

    return latest
  }, undefined)
}

async function fetchUpdatedRows(
  table: SyncTable,
  userId: string,
  updatedSince?: string,
) {
  const supabase = createClient()
  const rows: unknown[] = []
  let from = 0

  while (true) {
    let query = supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: true })

    if (updatedSince) {
      query = query.gte('updated_at', updatedSince)
    }

    const { data, error } = await query
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
    deletedAt: row.deleted_at ?? undefined,
    description: row.description,
    id: row.id,
    occurredOn: toStoredDate(row.occurred_on, row.created_at),
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
    deletedAt: row.deleted_at ?? undefined,
    dueEndOn: row.due_end_on ?? undefined,
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

async function loadRemoteSnapshot(
  userId: string,
  watermarks: RemoteSyncWatermarks,
): Promise<{
  nextWatermarks: RemoteSyncWatermarks
  snapshot: RemoteFinanceSnapshot
}> {
  const [categoryRows, paymentDateRows, preferencesRows, transactionRows] =
    await Promise.all([
      fetchUpdatedRows('categories', userId, watermarks.categoryUpdatedAt),
      fetchUpdatedRows(
        'payment_dates',
        userId,
        watermarks.paymentDateUpdatedAt,
      ),
      fetchUpdatedRows(
        'user_preferences',
        userId,
        watermarks.preferenceUpdatedAt,
      ),
      fetchUpdatedRows('transactions', userId, watermarks.transactionUpdatedAt),
    ])
  const typedCategoryRows = categoryRows as CategoryRow[]
  const typedPaymentDateRows = paymentDateRows as PaymentDateRow[]
  const typedPreferencesRows = preferencesRows as PreferencesRow[]
  const typedTransactionRows = transactionRows as TransactionRow[]

  return {
    nextWatermarks: {
      categoryUpdatedAt:
        maxUpdatedAt(typedCategoryRows) ?? watermarks.categoryUpdatedAt,
      paymentDateUpdatedAt:
        maxUpdatedAt(typedPaymentDateRows) ?? watermarks.paymentDateUpdatedAt,
      preferenceUpdatedAt:
        maxUpdatedAt(typedPreferencesRows) ?? watermarks.preferenceUpdatedAt,
      transactionUpdatedAt:
        maxUpdatedAt(typedTransactionRows) ?? watermarks.transactionUpdatedAt,
    },
    snapshot: {
      categories: typedCategoryRows.map(categoryFromRow),
      paymentDates: typedPaymentDateRows.map(paymentDateFromRow),
      preferences: typedPreferencesRows[0]
        ? preferencesFromRow(typedPreferencesRows[0], userId)
        : undefined,
      transactions: typedTransactionRows.map(transactionFromRow),
    },
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
    deleted_at: transaction.deletedAt ?? null,
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
    deleted_at: paymentDate.deletedAt ?? null,
    due_end_on: paymentDate.dueEndOn ?? null,
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

  const metadata = await loadRemoteSyncMetadata(userId)
  const remote = await loadRemoteSnapshot(userId, {
    categoryUpdatedAt: metadata?.categoryUpdatedAt,
    paymentDateUpdatedAt: metadata?.paymentDateUpdatedAt,
    preferenceUpdatedAt: metadata?.preferenceUpdatedAt,
    transactionUpdatedAt: metadata?.transactionUpdatedAt,
  })

  await mergeRemoteFinanceSnapshot(userId, remote.snapshot)

  const pendingSnapshot = await loadSyncSnapshot(userId)
  await pushPendingSnapshot(pendingSnapshot)
  await markFinanceSnapshotSynced(pendingSnapshot)
  await saveRemoteSyncMetadata(userId, remote.nextWatermarks)

  return true
}
