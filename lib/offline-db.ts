'use client'

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { createDefaultCategories, createDefaultPreferences } from '@/lib/defaults'
import {
  LOCAL_USER_ID,
  type Category,
  type FinanceSnapshot,
  type PaymentDate,
  type Recurrence,
  type SyncStatus,
  type Transaction,
  type TransactionType,
  type UserPreferences,
} from '@/lib/finance-types'
import { toDateInputValue } from '@/lib/dates'

const DB_NAME = 'chipsntips-local'
const DB_VERSION = 1

interface ChipsNTipsDb extends DBSchema {
  categories: {
    key: string
    value: Category
    indexes: {
      'by-user': string
      'by-user-type': [string, TransactionType]
    }
  }
  paymentDates: {
    key: string
    value: PaymentDate
    indexes: {
      'by-user': string
      'by-user-date': [string, string]
    }
  }
  preferences: {
    key: string
    value: UserPreferences
  }
  transactions: {
    key: string
    value: Transaction
    indexes: {
      'by-user': string
      'by-user-date': [string, string]
      'by-user-type': [string, TransactionType]
    }
  }
}

let dbPromise: Promise<IDBPDatabase<ChipsNTipsDb>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<ChipsNTipsDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const categories = db.createObjectStore('categories', { keyPath: 'id' })
        categories.createIndex('by-user', 'userId')
        categories.createIndex('by-user-type', ['userId', 'type'])

        const paymentDates = db.createObjectStore('paymentDates', {
          keyPath: 'id',
        })
        paymentDates.createIndex('by-user', 'userId')
        paymentDates.createIndex('by-user-date', ['userId', 'dueOn'])

        db.createObjectStore('preferences', { keyPath: 'userId' })

        const transactions = db.createObjectStore('transactions', {
          keyPath: 'id',
        })
        transactions.createIndex('by-user', 'userId')
        transactions.createIndex('by-user-date', ['userId', 'occurredOn'])
        transactions.createIndex('by-user-type', ['userId', 'type'])
      },
    })
  }

  return dbPromise
}

function createId(): string {
  if ('randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function assertValidTransactionInput(
  db: IDBPDatabase<ChipsNTipsDb>,
  input: {
    amount: number
    categoryId: string
    description: string
    occurredOn?: string
    type: TransactionType
    userId: string
  },
) {
  const category = await db.get('categories', input.categoryId)

  if (
    !Number.isFinite(input.amount) ||
    input.amount <= 0 ||
    input.amount > 9_999_999_999.99 ||
    !input.description.trim() ||
    input.description.trim().length > 160 ||
    (input.occurredOn &&
      !/^\d{4}-\d{2}-\d{2}$/.test(input.occurredOn)) ||
    !category ||
    category.userId !== input.userId ||
    category.type !== input.type ||
    category.archivedAt
  ) {
    throw new Error('Transaction details are invalid.')
  }
}

async function assertValidPaymentDateInput(
  db: IDBPDatabase<ChipsNTipsDb>,
  input: {
    amount?: number
    categoryId?: string
    dueEndOn?: string
    dueOn: string
    title: string
    userId: string
  },
) {
  const title = input.title.trim()
  const category = input.categoryId
    ? await db.get('categories', input.categoryId)
    : undefined
  const validAmount =
    input.amount === undefined ||
    (Number.isFinite(input.amount) &&
      input.amount > 0 &&
      input.amount <= 9_999_999_999.99)

  if (
    !title ||
    title.length > 120 ||
    !validAmount ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.dueOn) ||
    (input.dueEndOn &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueEndOn) ||
        input.dueEndOn < input.dueOn)) ||
    (input.categoryId &&
      (!category ||
        category.userId !== input.userId ||
        category.type !== 'expense' ||
        category.archivedAt))
  ) {
    throw new Error('Payment date details are invalid.')
  }
}

async function getCategoriesForUser(userId: string) {
  const db = await getDb()
  const categories = await db.getAllFromIndex('categories', 'by-user', userId)

  return categories
    .filter((category) => !category.archivedAt)
    .sort((first, second) => first.name.localeCompare(second.name))
}

async function seedUserData(userId: string) {
  const db = await getDb()
  const existingPreferences = await db.get('preferences', userId)
  const existingCategories = await db.getAllFromIndex(
    'categories',
    'by-user',
    userId,
  )

  const tx = db.transaction(['categories', 'preferences'], 'readwrite')

  if (!existingPreferences) {
    await tx.objectStore('preferences').put(createDefaultPreferences(userId))
  } else if (!existingPreferences.syncStatus) {
    await tx.objectStore('preferences').put({
      ...existingPreferences,
      syncStatus: 'local',
    })
  }

  if (existingCategories.length === 0) {
    await Promise.all(
      createDefaultCategories(userId).map((category) =>
        tx.objectStore('categories').put(category),
      ),
    )
  }

  await tx.done
}

export async function loadFinanceSnapshot(userId: string): Promise<FinanceSnapshot> {
  await seedUserData(userId)

  const db = await getDb()
  const [categories, paymentDates, preferences, transactions] = await Promise.all([
    getCategoriesForUser(userId),
    db.getAllFromIndex('paymentDates', 'by-user', userId),
    db.get('preferences', userId),
    db.getAllFromIndex('transactions', 'by-user', userId),
  ])

  return {
    categories,
    paymentDates: paymentDates.sort((first, second) =>
      first.dueOn.localeCompare(second.dueOn),
    ),
    preferences: preferences ?? createDefaultPreferences(userId),
    transactions: transactions
      .filter((transaction) => !transaction.deletedAt)
      .sort((first, second) =>
        second.occurredOn.localeCompare(first.occurredOn),
      ),
  }
}

export async function addTransaction(input: {
  amount: number
  categoryId: string
  description: string
  occurredOn?: string
  type: TransactionType
  userId: string
}) {
  const db = await getDb()
  await assertValidTransactionInput(db, input)
  const now = new Date().toISOString()
  const transaction: Transaction = {
    id: createId(),
    userId: input.userId,
    categoryId: input.categoryId,
    description: input.description.trim(),
    amount: Number(input.amount.toFixed(2)),
    type: input.type,
    occurredOn: input.occurredOn ?? toDateInputValue(),
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  }

  await db.put('transactions', transaction)

  return transaction
}

export async function updateTransaction(
  id: string,
  userId: string,
  input: {
    amount: number
    categoryId: string
    description: string
    occurredOn: string
    type: TransactionType
  },
) {
  const db = await getDb()
  const transaction = await db.get('transactions', id)

  if (!transaction || transaction.userId !== userId || transaction.deletedAt) {
    return null
  }

  await assertValidTransactionInput(db, { ...input, userId })

  const updated: Transaction = {
    ...transaction,
    amount: Number(input.amount.toFixed(2)),
    categoryId: input.categoryId,
    description: input.description.trim(),
    occurredOn: input.occurredOn,
    type: input.type,
    updatedAt: new Date().toISOString(),
    syncStatus: 'pending',
  }

  await db.put('transactions', updated)

  return updated
}

export async function deleteTransaction(id: string, userId: string) {
  const db = await getDb()
  const transaction = await db.get('transactions', id)

  if (!transaction || transaction.userId !== userId || transaction.deletedAt) {
    return null
  }

  const now = new Date().toISOString()
  const deleted: Transaction = {
    ...transaction,
    deletedAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  }

  await db.put('transactions', deleted)

  return deleted
}

export async function addCategory(input: {
  color: string
  name: string
  type: TransactionType
  userId: string
}) {
  const db = await getDb()
  const now = new Date().toISOString()
  const category: Category = {
    id: createId(),
    userId: input.userId,
    name: input.name.trim(),
    type: input.type,
    color: input.color,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  }

  await db.put('categories', category)

  return category
}

export async function archiveCategory(id: string) {
  const db = await getDb()
  const category = await db.get('categories', id)

  if (!category) {
    return null
  }

  const archivedCategory: Category = {
    ...category,
    archivedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: 'pending',
  }

  await db.put('categories', archivedCategory)

  return archivedCategory
}

export async function addPaymentDate(input: {
  amount?: number
  categoryId?: string
  dueEndOn?: string
  dueOn: string
  notes?: string
  recurrence: Recurrence
  title: string
  userId: string
}) {
  const db = await getDb()
  await assertValidPaymentDateInput(db, input)
  const now = new Date().toISOString()
  const paymentDate: PaymentDate = {
    id: createId(),
    userId: input.userId,
    title: input.title.trim(),
    amount: input.amount ? Number(input.amount.toFixed(2)) : undefined,
    categoryId: input.categoryId,
    dueEndOn:
      input.dueEndOn && input.dueEndOn !== input.dueOn
        ? input.dueEndOn
        : undefined,
    dueOn: input.dueOn,
    recurrence: input.recurrence,
    notes: input.notes?.trim(),
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  }

  await db.put('paymentDates', paymentDate)

  return paymentDate
}

export async function togglePaymentDatePaid(id: string) {
  const db = await getDb()
  const paymentDate = await db.get('paymentDates', id)

  if (!paymentDate) {
    return null
  }

  const updated: PaymentDate = {
    ...paymentDate,
    paidAt: paymentDate.paidAt ? undefined : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: 'pending',
  }

  await db.put('paymentDates', updated)

  return updated
}

export async function updateCurrency(userId: string, currency: string) {
  const db = await getDb()
  const existing = await db.get('preferences', userId)
  const now = new Date().toISOString()
  const preferences: UserPreferences = {
    ...(existing ?? createDefaultPreferences(userId)),
    currency,
    updatedAt: now,
    syncStatus: 'pending',
  }

  await db.put('preferences', preferences)

  return preferences
}

export interface LocalImportSummary {
  customCategories: number
  hasData: boolean
  paymentDates: number
  transactions: number
}

export async function getLocalImportSummary(): Promise<LocalImportSummary> {
  await seedUserData(LOCAL_USER_ID)

  const db = await getDb()
  const [categories, paymentDates, preferences, transactions] =
    await Promise.all([
      db.getAllFromIndex('categories', 'by-user', LOCAL_USER_ID),
      db.getAllFromIndex('paymentDates', 'by-user', LOCAL_USER_ID),
      db.get('preferences', LOCAL_USER_ID),
      db.getAllFromIndex('transactions', 'by-user', LOCAL_USER_ID),
    ])
  const customCategories = categories.filter(
    (category) => !category.isDefault && !category.archivedAt,
  ).length
  const hasCustomPreferences =
    Boolean(preferences) && preferences?.currency !== 'USD'

  return {
    customCategories,
    hasData:
      transactions.some((transaction) => !transaction.deletedAt) ||
      paymentDates.length > 0 ||
      customCategories > 0 ||
      hasCustomPreferences,
    paymentDates: paymentDates.length,
    transactions: transactions.filter((transaction) => !transaction.deletedAt)
      .length,
  }
}

export async function importLocalDataForUser(userId: string) {
  if (!userId || userId === LOCAL_USER_ID) {
    throw new Error('A signed-in user is required to import local data.')
  }

  await Promise.all([seedUserData(LOCAL_USER_ID), seedUserData(userId)])

  const db = await getDb()
  const [localCategories, localPaymentDates, localPreferences, localTransactions] =
    await Promise.all([
      db.getAllFromIndex('categories', 'by-user', LOCAL_USER_ID),
      db.getAllFromIndex('paymentDates', 'by-user', LOCAL_USER_ID),
      db.get('preferences', LOCAL_USER_ID),
      db.getAllFromIndex('transactions', 'by-user', LOCAL_USER_ID),
    ])
  const targetCategories = await db.getAllFromIndex(
    'categories',
    'by-user',
    userId,
  )
  const now = new Date().toISOString()
  const categoryIdMap = new Map<string, string>()
  const tx = db.transaction(
    ['categories', 'paymentDates', 'preferences', 'transactions'],
    'readwrite',
  )

  for (const localCategory of localCategories) {
    const match = targetCategories.find(
      (category) =>
        category.name === localCategory.name &&
        category.type === localCategory.type &&
        !category.archivedAt,
    )

    if (match) {
      categoryIdMap.set(localCategory.id, match.id)
      continue
    }

    const importedCategory: Category = {
      ...localCategory,
      id: createId(),
      userId,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    }

    categoryIdMap.set(localCategory.id, importedCategory.id)
    await tx.objectStore('categories').put(importedCategory)
  }

  const fallbackCategoryByType = new Map<TransactionType, string>()

  for (const category of targetCategories) {
    if (!category.archivedAt && !fallbackCategoryByType.has(category.type)) {
      fallbackCategoryByType.set(category.type, category.id)
    }
  }

  for (const transaction of localTransactions) {
    if (transaction.deletedAt) {
      continue
    }

    const categoryId =
      categoryIdMap.get(transaction.categoryId) ??
      fallbackCategoryByType.get(transaction.type)

    if (!categoryId) {
      continue
    }

    await tx.objectStore('transactions').put({
      ...transaction,
      id: createId(),
      userId,
      categoryId,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    })
  }

  for (const paymentDate of localPaymentDates) {
    await tx.objectStore('paymentDates').put({
      ...paymentDate,
      id: createId(),
      userId,
      categoryId: paymentDate.categoryId
        ? categoryIdMap.get(paymentDate.categoryId)
        : undefined,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    })
  }

  if (localPreferences) {
    const targetPreferences =
      (await tx.objectStore('preferences').get(userId)) ??
      createDefaultPreferences(userId)

    await tx.objectStore('preferences').put({
      ...targetPreferences,
      currency: localPreferences.currency,
      updatedAt: now,
      syncStatus: 'pending',
    })
  }

  await tx.done

  return {
    paymentDates: localPaymentDates.length,
    transactions: localTransactions.filter((transaction) => !transaction.deletedAt)
      .length,
  }
}

export async function loadSyncSnapshot(userId: string): Promise<FinanceSnapshot> {
  await seedUserData(userId)

  const db = await getDb()
  const [categories, paymentDates, preferences, transactions] = await Promise.all([
    db.getAllFromIndex('categories', 'by-user', userId),
    db.getAllFromIndex('paymentDates', 'by-user', userId),
    db.get('preferences', userId),
    db.getAllFromIndex('transactions', 'by-user', userId),
  ])

  return {
    categories,
    paymentDates,
    preferences: preferences ?? createDefaultPreferences(userId),
    transactions,
  }
}

function shouldKeepLocal(
  local: { syncStatus: SyncStatus; updatedAt: string } | undefined,
) {
  return Boolean(
    local &&
      (local.syncStatus === 'pending' ||
        local.syncStatus === 'error'),
  )
}

export async function mergeRemoteFinanceSnapshot(
  userId: string,
  remote: FinanceSnapshot,
) {
  await seedUserData(userId)

  const db = await getDb()
  const [localCategories, localPaymentDates, localPreferences, localTransactions] =
    await Promise.all([
      db.getAllFromIndex('categories', 'by-user', userId),
      db.getAllFromIndex('paymentDates', 'by-user', userId),
      db.get('preferences', userId),
      db.getAllFromIndex('transactions', 'by-user', userId),
    ])
  const tx = db.transaction(
    ['categories', 'paymentDates', 'preferences', 'transactions'],
    'readwrite',
  )
  const categoryIdMap = new Map<string, string>()

  for (const localCategory of localCategories) {
    const matchingRemote = remote.categories.find(
      (remoteCategory) =>
        remoteCategory.id === localCategory.id ||
        (remoteCategory.name === localCategory.name &&
          remoteCategory.type === localCategory.type),
    )

    if (matchingRemote && matchingRemote.id !== localCategory.id) {
      categoryIdMap.set(localCategory.id, matchingRemote.id)
      await tx.objectStore('categories').delete(localCategory.id)
    }
  }

  for (const remoteCategory of remote.categories) {
    const localCategory = localCategories.find(
      (category) =>
        category.id === remoteCategory.id ||
        (category.name === remoteCategory.name &&
          category.type === remoteCategory.type),
    )

    if (
      !shouldKeepLocal(localCategory) ||
      Boolean(localCategory && categoryIdMap.has(localCategory.id))
    ) {
      await tx.objectStore('categories').put(remoteCategory)
    }
  }

  const remappedTransactions = localTransactions.map((transaction) => {
    const categoryId = categoryIdMap.get(transaction.categoryId)

    if (!categoryId) {
      return transaction
    }

    return {
      ...transaction,
      categoryId,
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending' as const,
    }
  })

  const remappedPaymentDates = localPaymentDates.map((paymentDate) => {
    const categoryId = paymentDate.categoryId
      ? categoryIdMap.get(paymentDate.categoryId)
      : undefined

    if (!categoryId) {
      return paymentDate
    }

    return {
      ...paymentDate,
      categoryId,
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending' as const,
    }
  })

  for (const transaction of remappedTransactions) {
    await tx.objectStore('transactions').put(transaction)
  }

  for (const paymentDate of remappedPaymentDates) {
    await tx.objectStore('paymentDates').put(paymentDate)
  }

  for (const remoteTransaction of remote.transactions) {
    const localTransaction = remappedTransactions.find(
      (transaction) => transaction.id === remoteTransaction.id,
    )

    if (!shouldKeepLocal(localTransaction)) {
      await tx.objectStore('transactions').put(remoteTransaction)
    }
  }

  for (const remotePaymentDate of remote.paymentDates) {
    const localPaymentDate = remappedPaymentDates.find(
      (paymentDate) => paymentDate.id === remotePaymentDate.id,
    )

    if (!shouldKeepLocal(localPaymentDate)) {
      await tx.objectStore('paymentDates').put(remotePaymentDate)
    }
  }

  if (!shouldKeepLocal(localPreferences)) {
    await tx.objectStore('preferences').put(remote.preferences)
  }

  await tx.done
}

export async function markFinanceSnapshotSynced(snapshot: FinanceSnapshot) {
  const db = await getDb()
  const tx = db.transaction(
    ['categories', 'paymentDates', 'preferences', 'transactions'],
    'readwrite',
  )

  for (const category of snapshot.categories) {
    const current = await tx.objectStore('categories').get(category.id)

    if (current?.updatedAt === category.updatedAt) {
      await tx.objectStore('categories').put({
        ...current,
        syncStatus: 'synced',
      })
    }
  }

  for (const paymentDate of snapshot.paymentDates) {
    const current = await tx.objectStore('paymentDates').get(paymentDate.id)

    if (current?.updatedAt === paymentDate.updatedAt) {
      await tx.objectStore('paymentDates').put({
        ...current,
        syncStatus: 'synced',
      })
    }
  }

  for (const transaction of snapshot.transactions) {
    const current = await tx.objectStore('transactions').get(transaction.id)

    if (current?.updatedAt === transaction.updatedAt) {
      await tx.objectStore('transactions').put({
        ...current,
        syncStatus: 'synced',
      })
    }
  }

  const currentPreferences = await tx
    .objectStore('preferences')
    .get(snapshot.preferences.userId)

  if (currentPreferences?.updatedAt === snapshot.preferences.updatedAt) {
    await tx.objectStore('preferences').put({
      ...currentPreferences,
      syncStatus: 'synced',
    })
  }

  await tx.done
}
