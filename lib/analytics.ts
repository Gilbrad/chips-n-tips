import { toDateInputValue } from '@/lib/dates'
import type { Category, Transaction } from '@/lib/finance-types'

export interface MonthlyAnalyticsPoint {
  balance: number
  expense: number
  income: number
  label: string
  month: string
  net: number
}

export interface CategoryAnalyticsPoint {
  color: string
  name: string
  value: number
}

export interface AnalyticsSummary {
  largestExpense?: Transaction
  netCashFlow: number
  savingsRate: number | null
  topCategory?: CategoryAnalyticsPoint
  totalExpense: number
  totalIncome: number
}

export interface FinanceAnalytics {
  categories: CategoryAnalyticsPoint[]
  hasExpenses: boolean
  hasTransactions: boolean
  monthly: MonthlyAnalyticsPoint[]
  summary: AnalyticsSummary
}

function getMonthStart(date: Date): string {
  return toDateInputValue(new Date(date.getFullYear(), date.getMonth(), 1))
}

export function buildFinanceAnalytics(
  transactions: Transaction[],
  categories: Category[],
  monthCount = 12,
  today = new Date(),
): FinanceAnalytics {
  const months = Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(
      today.getFullYear(),
      today.getMonth() - (monthCount - 1 - index),
      1,
    )

    return {
      label: new Intl.DateTimeFormat('en-US', {
        month: 'short',
        year: '2-digit',
      }).format(date),
      month: getMonthStart(date).slice(0, 7),
    }
  })
  const periodStart = `${months[0].month}-01`
  const periodEnd = getMonthStart(
    new Date(today.getFullYear(), today.getMonth() + 1, 1),
  )
  const periodTransactions = transactions.filter(
    (transaction) =>
      transaction.occurredOn >= periodStart &&
      transaction.occurredOn < periodEnd,
  )
  const openingBalance = transactions
    .filter((transaction) => transaction.occurredOn < periodStart)
    .reduce(
      (total, transaction) =>
        total +
        (transaction.type === 'income'
          ? transaction.amount
          : -transaction.amount),
      0,
    )
  const monthlyTotals = new Map<
    string,
    { expense: number; income: number }
  >()

  for (const transaction of periodTransactions) {
    const month = transaction.occurredOn.slice(0, 7)
    const total = monthlyTotals.get(month) ?? { expense: 0, income: 0 }
    total[transaction.type] += transaction.amount
    monthlyTotals.set(month, total)
  }

  let runningBalance = openingBalance
  const monthly = months.map(({ label, month }) => {
    const totals = monthlyTotals.get(month) ?? { expense: 0, income: 0 }
    const net = totals.income - totals.expense
    runningBalance += net

    return {
      balance: runningBalance,
      expense: totals.expense,
      income: totals.income,
      label,
      month,
      net,
    }
  })

  const categoryById = new Map(categories.map((category) => [category.id, category]))
  const categoryTotals = new Map<string, CategoryAnalyticsPoint>()

  for (const transaction of periodTransactions) {
    if (transaction.type !== 'expense') {
      continue
    }

    const category = categoryById.get(transaction.categoryId)
    const key = category?.id ?? 'uncategorized'
    const total = categoryTotals.get(key) ?? {
      color: category?.color ?? '#737373',
      name: category?.name ?? 'Uncategorized',
      value: 0,
    }
    total.value += transaction.amount
    categoryTotals.set(key, total)
  }

  const categoryData = [...categoryTotals.values()].sort(
    (first, second) => second.value - first.value,
  )
  const totalExpense = monthly.reduce(
    (total, point) => total + point.expense,
    0,
  )
  const totalIncome = monthly.reduce(
    (total, point) => total + point.income,
    0,
  )
  const netCashFlow = totalIncome - totalExpense
  const largestExpense = periodTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce<Transaction | undefined>(
      (largest, transaction) =>
        !largest || transaction.amount > largest.amount ? transaction : largest,
      undefined,
    )

  return {
    categories: categoryData,
    hasExpenses: totalExpense > 0,
    hasTransactions: periodTransactions.length > 0,
    monthly,
    summary: {
      largestExpense,
      netCashFlow,
      savingsRate: totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : null,
      topCategory: categoryData[0],
      totalExpense,
      totalIncome,
    },
  }
}
