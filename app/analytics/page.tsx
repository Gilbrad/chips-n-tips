'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import {
  ChartNoAxesCombined,
  Landmark,
  PiggyBank,
  ReceiptText,
} from 'lucide-react'
import { useFinance } from '@/components/finance-provider'
import StatsCard from '@/components/stats-card'
import { buildFinanceAnalytics } from '@/lib/analytics'
import { formatCurrency, formatDateLabel } from '@/lib/format'

const AnalyticsCharts = dynamic(() => import('@/components/analytics-charts'), {
  loading: () => (
    <div className="grid gap-4 xl:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          className="h-96 rounded-lg border border-border bg-card"
          key={index}
        />
      ))}
    </div>
  ),
  ssr: false,
})

export default function AnalyticsPage() {
  const { categories, currency, isLoading, transactions } = useFinance()
  const analytics = useMemo(
    () => buildFinanceAnalytics(transactions, categories),
    [categories, transactions],
  )
  const { summary } = analytics

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Analytics
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Financial trends
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A rolling 12-month view calculated from your offline ledger.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          description="Across the last 12 months"
          icon={ReceiptText}
          label="Total expenses"
          value={
            isLoading ? 'Loading' : formatCurrency(summary.totalExpense, currency)
          }
        />
        <StatsCard
          description={`${formatCurrency(summary.totalIncome, currency)} income`}
          icon={Landmark}
          label="Net cash flow"
          value={
            isLoading ? 'Loading' : formatCurrency(summary.netCashFlow, currency)
          }
        />
        <StatsCard
          description="Net cash flow as a share of income"
          icon={PiggyBank}
          label="Savings rate"
          value={
            isLoading
              ? 'Loading'
              : summary.savingsRate === null
                ? 'No income'
                : `${summary.savingsRate.toFixed(1)}%`
          }
        />
        <StatsCard
          description={
            summary.topCategory
              ? formatCurrency(summary.topCategory.value, currency)
              : 'No expenses recorded'
          }
          icon={ChartNoAxesCombined}
          label="Top category"
          value={isLoading ? 'Loading' : summary.topCategory?.name ?? 'None'}
        />
      </div>

      {summary.largestExpense ? (
        <section className="flex flex-col gap-1 rounded-lg border border-border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Largest expense
            </p>
            <p className="text-sm text-muted-foreground">
              {summary.largestExpense.description || 'Untitled expense'} on{' '}
              {formatDateLabel(summary.largestExpense.occurredOn)}
            </p>
          </div>
          <p className="text-lg font-semibold text-destructive">
            {formatCurrency(summary.largestExpense.amount, currency)}
          </p>
        </section>
      ) : null}

      <AnalyticsCharts
        categories={analytics.categories}
        currency={currency}
        hasExpenses={analytics.hasExpenses}
        hasTransactions={analytics.hasTransactions}
        monthly={analytics.monthly}
      />
    </section>
  )
}
