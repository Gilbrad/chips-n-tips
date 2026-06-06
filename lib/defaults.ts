import type { Category, TransactionType, UserPreferences } from '@/lib/finance-types'

export const DEFAULT_CURRENCY = 'USD'

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', label: 'US Dollar', symbol: '$', locale: 'en-US' },
  { code: 'PHP', label: 'Philippine Peso', symbol: 'PHP', locale: 'en-PH' },
  { code: 'EUR', label: 'Euro', symbol: 'EUR', locale: 'en-IE' },
  { code: 'GBP', label: 'British Pound', symbol: 'GBP', locale: 'en-GB' },
  { code: 'JPY', label: 'Japanese Yen', symbol: 'JPY', locale: 'ja-JP' },
  { code: 'CAD', label: 'Canadian Dollar', symbol: '$', locale: 'en-CA' },
  { code: 'AUD', label: 'Australian Dollar', symbol: '$', locale: 'en-AU' },
  { code: 'SGD', label: 'Singapore Dollar', symbol: '$', locale: 'en-SG' },
] as const

export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]['code']

export const DEFAULT_CATEGORY_DEFINITIONS: Array<{
  name: string
  type: TransactionType
  color: string
}> = [
  { name: 'Groceries', type: 'expense', color: '#0f766e' },
  { name: 'Dining', type: 'expense', color: '#dc2626' },
  { name: 'Transportation', type: 'expense', color: '#2563eb' },
  { name: 'Housing', type: 'expense', color: '#7c3aed' },
  { name: 'Utilities', type: 'expense', color: '#ca8a04' },
  { name: 'Healthcare', type: 'expense', color: '#db2777' },
  { name: 'Insurance', type: 'expense', color: '#4f46e5' },
  { name: 'Debt', type: 'expense', color: '#be123c' },
  { name: 'Entertainment', type: 'expense', color: '#0891b2' },
  { name: 'Shopping', type: 'expense', color: '#9333ea' },
  { name: 'Subscriptions', type: 'expense', color: '#ea580c' },
  { name: 'Education', type: 'expense', color: '#16a34a' },
  { name: 'Travel', type: 'expense', color: '#0284c7' },
  { name: 'Personal Care', type: 'expense', color: '#c026d3' },
  { name: 'Gifts', type: 'expense', color: '#e11d48' },
  { name: 'Income', type: 'income', color: '#059669' },
  { name: 'Savings', type: 'income', color: '#0d9488' },
  { name: 'Refunds', type: 'income', color: '#65a30d' },
  { name: 'Other', type: 'expense', color: '#525252' },
]

export function createDefaultCategories(userId: string): Category[] {
  const now = new Date().toISOString()

  return DEFAULT_CATEGORY_DEFINITIONS.map((definition) => ({
    id: crypto.randomUUID(),
    userId,
    name: definition.name,
    type: definition.type,
    color: definition.color,
    isDefault: true,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'local',
  }))
}

export function createDefaultPreferences(userId: string): UserPreferences {
  const now = new Date().toISOString()

  return {
    userId,
    currency: DEFAULT_CURRENCY,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'local',
  }
}
